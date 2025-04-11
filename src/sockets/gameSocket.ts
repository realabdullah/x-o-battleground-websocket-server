import { Server, Socket } from 'socket.io';
import { Logger } from '../config/logger';
import { createGameState, checkWinner, restartRound } from '../helpers/gameHelpers';
import { games } from '../models/games';

const sendMessage = (socket: Socket, type: string, data: any) => {
  socket.emit('message', { type, data });
};

const broadcastMessage = (room: string, type: string, data: any, io: Server) => {
  io.to(room).emit('message', { type, data });
};

export default (io: Server, socket: Socket) => {
  const playerId = socket.handshake.auth.playerId;
  const clientGameId = socket.handshake.auth.gameId;

  if (!playerId) {
    socket.disconnect(true);
    return;
  }

  Logger.info(`Player connected: ${playerId} (${socket.id})`);

  for (const [gameId, game] of Object.entries(games)) {
    for (const symbol of ['X', 'O'] as const) {
      if (game.players[symbol].id === playerId && gameId === clientGameId) {
        socket.join(gameId);
        socket.emit('reconnected', { type: 'reconnected', data: { game, symbol } });
        Logger.info(`Player ${playerId} rejoined game ${gameId}`);
        break;
      }
    }
  }

  socket.on('create game', (data: { name: string }) => {
    try {
      const { name } = data;
      if (!clientGameId || !name) {
        sendMessage(socket, 'error', 'Missing clientGameId or name');
        return;
      }

      if (games[clientGameId]) {
        sendMessage(socket, 'error', 'Game already exists');
        return;
      }

      games[clientGameId] = createGameState();
      games[clientGameId].players.X.id = playerId;
      games[clientGameId].players.X.name = name;
      games[clientGameId].creator = playerId;
      socket.join(clientGameId);

      sendMessage(socket, 'game created', { game: games[clientGameId], symbol: 'X' });
      Logger.info(`Game ${clientGameId} created by ${playerId}`);
    } catch (err) {
      Logger.error(`Error in create game: ${err}`);
      sendMessage(socket, 'error', 'Error creating game');
    }
  });

  socket.on('join game', (data: { name: string }) => {
    try {
      const { name } = data;
      if (!clientGameId || !name) {
        sendMessage(socket, 'error', 'Missing clientGameId or name');
        return;
      }

      const game = games[clientGameId];
      if (!game) {
        sendMessage(socket, 'error', 'Game not found');
        return;
      }

      if (game.players.X.id && game.players.O.id) {
        sendMessage(socket, 'error', 'Game full');
        return;
      }

      socket.join(clientGameId);

      const symbol: 'X' | 'O' = game.players.X.id ? 'O' : 'X';
      game.players[symbol].id = playerId;
      game.players[symbol].name = name;

      sendMessage(socket, 'game joined', game);
      Logger.info(`${playerId} joined game ${clientGameId} as ${symbol}`);

      if (game.players.X.id && game.players.O.id) {
        game.status = 'playing';
        broadcastMessage(clientGameId, 'game started', game, io);
        Logger.info(`Game ${clientGameId} started`);
      }
    } catch (err) {
      Logger.error(`Error in join game: ${err}`);
      sendMessage(socket, 'error', 'Error joining game');
    }
  });

  socket.on('make move', (data: { index: number }) => {
    try {
      const { index } = data;
      if (index < 0 || index > 8) {
        sendMessage(socket, 'soft error', 'Invalid move index');
        return;
      }

      const game = games[clientGameId];
      if (!game) {
        sendMessage(socket, 'error', 'Game not found');
        return;
      }

      let playerSymbol: 'X' | 'O' | null = null;
      if (game.players.X.id === playerId) playerSymbol = 'X';
      else if (game.players.O.id === playerId) playerSymbol = 'O';
      else {
        sendMessage(socket, 'error', 'You are not part of this game');
        return;
      }

      if (game.status !== 'playing' || playerSymbol !== game.currentPlayer || game.board[index] !== null) {
        sendMessage(socket, 'soft error', 'Invalid move');
        return;
      }

      game.board[index] = playerSymbol;
      game.currentPlayer = playerSymbol === 'X' ? 'O' : 'X';

      const result = checkWinner(game.board);
      if (result) {
        game.status = 'finished';
        game.winner = result;
        if (result === 'draw') game.scores.draws += 1;
        else if (result === 'X' || result === 'O') game.scores[result] += 1;
      }

      broadcastMessage(clientGameId, 'game update', game, io);
      Logger.info(`Player ${playerId} made move at index ${index} in game ${clientGameId}`);
    } catch (err) {
      Logger.error(`Error in make move: ${err}`);
      sendMessage(socket, 'error', 'Error making move');
    }
  });

  socket.on('restart round', () => {
    try {
      const game = games[clientGameId];
      if (!game) {
        sendMessage(socket, 'error', 'Game not found');
        return;
      }

      if (game.status !== 'finished') {
        sendMessage(socket, 'error', 'Round not finished yet');
        return;
      }

      restartRound(game);
      broadcastMessage(clientGameId, 'round restarted', game, io);
      Logger.info(`Round restarted for game ${clientGameId} (Round: ${game.round})`);
    } catch (err) {
      Logger.error(`Error restarting round: ${err}`);
      sendMessage(socket, 'error', 'Error restarting round');
    }
  });

  socket.on('restart game', () => {
    try {
      if (!clientGameId || !games[clientGameId]) {
        sendMessage(socket, 'error', 'Game not found');
        return;
      }

      games[clientGameId] = createGameState();

      broadcastMessage(clientGameId, 'game restarted', games[clientGameId], io);
      Logger.info(`Game ${clientGameId} fully restarted by ${playerId}`);
    } catch (err) {
      Logger.error(`Error restarting game: ${err}`);
      sendMessage(socket, 'error', 'Error restarting game');
    }
  });

  socket.on('offer rematch', () => {
    try {
      const game = games[clientGameId];
      if (!game) {
        sendMessage(socket, 'error', 'Game not found');
        return;
      }

      broadcastMessage(clientGameId, 'rematch offered', { from: playerId }, io);
      Logger.info(`Rematch offered in game ${clientGameId} by ${playerId}`);
    } catch (err) {
      Logger.error(`Error offering rematch: ${err}`);
      sendMessage(socket, 'error', 'Error offering rematch');
    }
  });

  socket.on('disconnect', () => {
    Logger.warn(`Player disconnected: ${playerId}`);
    for (const game of Object.values(games)) {
      for (const symbol of ['X', 'O'] as const) {
        if (game.players[symbol]?.id === playerId) {
          io.to(game.creator as string).emit('player disconnected', { type: 'player disconnected', data: game });
        }
      }
    }
  });
};
