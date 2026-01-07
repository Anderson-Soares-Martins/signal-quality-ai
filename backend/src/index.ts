import 'dotenv/config';
import express from 'express';
import routes from './api/routes.js';
import {
  requestLogger,
  errorHandler,
  corsMiddleware,
  notFoundHandler
} from './api/middleware.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(corsMiddleware);
app.use(requestLogger);

// Routes
app.use('/api', routes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Signal Quality Score AI API running on port ${PORT}`);
  logger.info('LLM Provider: Anthropic Claude Sonnet 4');
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('');
  logger.info('Available endpoints:');
  logger.info('  GET  /api/health - Health check');
  logger.info('  POST /api/analyze - Analyze signals');
  logger.info('  GET  /api/patterns - Get known patterns');
  logger.info('  POST /api/feedback - Submit feedback');
  logger.info('  GET  /api/examples/:type - Get example scenarios');
  logger.info('');
  logger.info(`Try: curl http://localhost:${PORT}/api/health`);
});

export default app;

