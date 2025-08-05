import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import { createServer } from 'http';
import gameSocket from './sockets/gameSocket';
import { Logger } from './config/logger';
import indexRouter from './routes/index';

const createApp = async () => {
  const fastify = Fastify({
    logger: false // We'll use our custom logger
  });

  // Register CORS
  await fastify.register(cors, {
    origin: true, // Replace with specific origin(s) in production for security
    credentials: true
  });

  // Register routes
  fastify.register(indexRouter, { prefix: '/' });

  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Create HTTP server
  const server = createServer(fastify.server);

  // Initialize Socket.IO
  const io = new Server(server, {
    cors: {
      origin: '*', // Replace with specific origin(s) in production for security
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    Logger.info(`New connection: ${socket.id}`);
    gameSocket(io, socket);
  });

  return { fastify, server };
};

export { createApp };