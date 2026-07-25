import { INTERNAL_SERVER_ERROR } from '../constants/httpStatus.js';
import logger from '../config/logger.js';

export default (err, req, res, next) => {
  const statusCode = err.statusCode || INTERNAL_SERVER_ERROR;

  const log = req.log || logger;
  if (statusCode >= 500) {
    log.error({ err, requestId: req.requestId, route: req.originalUrl }, 'Unhandled server error');
  } else {
    log.warn({ err: { message: err.message }, requestId: req.requestId }, `Client error: ${err.message}`);
  }

  res.status(statusCode).json({
    success: false,
    status: err.status || 'error',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
