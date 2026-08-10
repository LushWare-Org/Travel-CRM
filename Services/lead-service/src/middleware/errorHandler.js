export default (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    status: err.status || 'error',
    message: err.message,
    ...(err.code && { code: err.code }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
