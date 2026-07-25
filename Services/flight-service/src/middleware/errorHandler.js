import { INTERNAL_SERVER_ERROR } from '../constants/httpStatus.js';

export default (err, req, res, next) => {
  const statusCode = err.statusCode || INTERNAL_SERVER_ERROR;
  res.status(statusCode).json({
    success: false,
    status: err.status || 'error',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
