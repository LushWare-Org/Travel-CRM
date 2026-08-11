import logger from '../config/logger.js';

export default (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  const log = req.log || logger;
  if (statusCode >= 500) {
    log.error({ err, requestId: req.requestId, route: req.originalUrl }, 'Unhandled server error');
  } else {
    log.warn({ err: { message: err.message }, requestId: req.requestId }, `Client error: ${err.message}`);
  }

  res.status(statusCode).json({
    success: false,
    status,
    message: err.message,
    ...(err.code && { code: err.code }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
