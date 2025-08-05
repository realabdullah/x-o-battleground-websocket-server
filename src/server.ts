import { createApp } from './app';
import config from './config/config';
import { Logger } from './config/logger';
import { storageService } from './services/storage';

const startServer = async () => {
  try {
    const { fastify, server } = await createApp();
    
    await fastify.ready();
    
    server.listen(config.port, () => {
      Logger.info(`Server listening on port ${config.port}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      Logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        Logger.info('HTTP server closed');
        
        await storageService.disconnect();
        Logger.info('Storage service disconnected');
        
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (err) {
    Logger.error(`Error starting server: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
};

startServer();