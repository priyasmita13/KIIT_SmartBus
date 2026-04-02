import { createServer } from 'http';
import mongoose from 'mongoose';
import app from './app.js';
import config from './config.js';
import logger from './lib/logger.js';
import { initSocketServer } from './services/socket.service.js';

async function start() {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('Connected to MongoDB');

    // Wrap Express in a plain Node HTTP server so Socket.IO can share the same port
    const httpServer = createServer(app);

    // Attach Socket.IO
    initSocketServer(httpServer);

    httpServer.listen(config.port, () => {
      logger.info({ port: config.port }, 'HTTP + WebSocket server listening');
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

start();



