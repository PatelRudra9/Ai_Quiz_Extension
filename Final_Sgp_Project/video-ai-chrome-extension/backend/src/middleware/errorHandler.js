export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Default error
  let status = err.status || 500;
  let message = err.message || 'Internal server error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    status = 409;
    message = 'Duplicate entry - content already exists';
  }

  // CORS error
  if (err.message === 'Not allowed by CORS') {
    status = 403;
    message = 'CORS policy: Access denied';
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
