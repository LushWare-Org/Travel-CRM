import logger from '../config/logger.js';

export default (err, req, res, next) => {
  logger.error(err.stack);

  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  res.status(statusCode).json({
    success: false,
    status,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    ...(err.errors && { errors: err.errors }),
  });
};
