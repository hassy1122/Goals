'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');

const env = require('./config/env');
const swagger = require('./config/swagger');
const { createRateLimiters } = require('./middlewares/rateLimit');
const { notFound, errorHandler } = require('./middlewares/error');
const { AppError } = require('./utils/apiError');
const router = require('./routes');

function createApp() {
  const app = express();
  const prod = env.NODE_ENV === 'production';

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet(
      prod
        ? {
            contentSecurityPolicy: {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'"],
              },
            },
          }
        : { contentSecurityPolicy: false },
    ),
  );

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || !prod || origin === env.CLIENT_URL) return cb(null, true);
        return cb(new AppError(403, 'CORS_ORIGIN', 'Origin not allowed'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      maxAge: 600,
    }),
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '200kb' }));
  app.use(express.urlencoded({ extended: false, limit: '200kb' }));
  app.use(mongoSanitize());

  const { apiLimiter } = createRateLimiters();
  app.use('/api/v1', apiLimiter, router);
  app.use('/api/docs', swagger.serve, swagger.setup);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
