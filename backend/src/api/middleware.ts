import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { AnalysisRequestSchema } from '../utils/schemas.js';
import { ZodError } from 'zod';

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Log request
  logger.info(`${req.method} ${req.path}`, {
    body: req.body,
    query: req.query
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });

  next();
}

/**
 * Error handling middleware
 */
export function errorHandler(err: Error & { name?: string; errors?: unknown }, req: Request, res: Response, _next: NextFunction): void {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  // Validation errors
  if (err.name === 'ZodError' || err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.errors || (err as ZodError).errors
    });
    return;
  }

  // Generic error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
}

/**
 * Validation middleware for analysis requests
 */
export function validateAnalysisRequest(req: Request, _res: Response, next: NextFunction): void {
  try {
    // Validate request body against schema
    const validated = AnalysisRequestSchema.parse(req.body);
    req.body = validated;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * CORS middleware (for development)
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
}

/**
 * Not found middleware
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
}

