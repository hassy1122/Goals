'use strict';

const mongoose = require('mongoose');

// Metadata for files stored on local disk (utils/storage.localDriver) — S3-ready later.
const MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const uploadSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, enum: ['image', 'document'], default: 'image' },
    mimeType: { type: String, required: true, enum: MIMES },
    sizeBytes: { type: Number, required: true },
    originalName: { type: String, required: true, maxlength: 200 },
    storageKey: { type: String, required: true, maxlength: 300 },
  },
  { timestamps: true },
);

uploadSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Upload', uploadSchema);
module.exports.ALLOWED_MIMES = MIMES;
