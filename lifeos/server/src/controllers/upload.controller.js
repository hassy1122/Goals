'use strict';

const multer = require('multer');
const Upload = require('../models/Upload');
const Vision = require('../models/Vision');
const storage = require('../utils/storage');
const { AppError, badRequest, notFound } = require('../utils/apiError');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const uid = (req) => req.user._id.toString();

// 5 MB hard cap; jpeg/png/webp images + pdf documents (NO svg — it can carry XSS payloads).
const uploadHandler = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!Upload.ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(new AppError(415, 'UNSUPPORTED_TYPE', 'Allowed file types: jpeg, png, webp, pdf.'));
    }
    return cb(null, true);
  },
}).single('file');

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) throw badRequest('Attach a file under the "file" field.', 'FILE_MISSING');

    const { mimetype, size, buffer, originalname } = req.file;
    const storageKey = await storage.putObject(uid(req), buffer, mimetype);
    const doc = await Upload.create({
      userId: uid(req),
      category: mimetype === 'application/pdf' ? 'document' : 'image',
      mimeType: mimetype,
      sizeBytes: size,
      originalName: originalname.slice(0, 200),
      storageKey,
    });
    // Returned uploadId is what vision board / bucket covers reference.
    ok(res, { upload: { id: doc._id, category: doc.category, mimeType: doc.mimeType, sizeBytes: doc.sizeBytes, originalName: doc.originalName } }, 201);
  } catch (err) {
    next(err);
  }
};

// Owner-guarded streaming — uploads are never exposed as static assets.
exports.stream = async (req, res, next) => {
  try {
    const id = req.params.id;
    const doc = await Upload.findOne({ _id: id, userId: uid(req) });
    if (!doc) throw notFound('File not found.', 'UPLOAD_NOT_FOUND');

    const stream = await storage.getObjectStream(doc.storageKey);
    const safeName = doc.originalName.replace(/[^A-Za-z0-9._-]+/g, '_');
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Length', String(doc.sizeBytes));
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    stream.on('error', () => {
      if (!res.headersSent) res.status(500).json({ success: false, error: { code: 'READ_FAILED', message: 'Could not read stored file.' } });
      else res.end();
    });
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
};

exports.destroy = async (req, res, next) => {
  try {
    const doc = await Upload.findOne({ _id: req.params.id, userId: uid(req) });
    if (!doc) throw notFound('File not found.', 'UPLOAD_NOT_FOUND');

    if (doc.category === 'image') {
      // Keep the vision board consistent when an image goes away.
      await Vision.updateMany({ userId: uid(req) }, { $pull: { boardImages: { uploadId: doc._id } } });
    }

    await Promise.all([storage.deleteObject(doc.storageKey), Upload.deleteOne({ _id: doc._id, userId: uid(req) })]);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadHandler, upload: exports.upload, stream: exports.stream, destroy: exports.destroy };
