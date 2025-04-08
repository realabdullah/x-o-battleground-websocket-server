import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import gameSocket from './sockets/gameSocket.ts';
import { Logger } from './config/logger.ts';
import indexRouter from './routes/index.ts';

const app = express();

app.use(express.json());

app.use(cors());
app.use('/', indexRouter);

const server = http.createServer(app);
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

export { app, server };