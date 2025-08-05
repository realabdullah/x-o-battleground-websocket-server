import { Server, Socket } from 'socket.io';
import { Logger } from '../config/logger';
import { createGameState, checkWinner, restartRound } from '../helpers/gameHelpers';
import { storageService } from '../services/storage';

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

  // Check for existing games and reconnect if needed
  const checkReconnection = async () => {
    const games = await storageService.getAllGames();
    console.log(games);
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
  };

  checkReconnection();

  socket.on('create game', async (data: { name: string }) => {
    try {
      const { name } = data;
      if (!clientGameId || !name) {
        sendMessage(socket, 'error', 'Missing clientGameId or name');
        return;
      }

      const existingGame = await storageService.getGame(clientGameId);
      if (existingGame) {
        sendMessage(socket, 'error', 'Game already exists');
        return;
      }

      const newGame = createGameState();
      newGame.players.X.id = playerId;
      newGame.players.X.name = name;
      newGame.creator = playerId;
      
      await storageService.setGame(clientGameId, newGame);
      socket.join(clientGameId);

      sendMessage(socket, 'game created', { game: newGame, symbol: 'X' });
      Logger.info(`Game ${clientGameId} created by ${playerId}`);
    } catch (err) {
      Logger.error(`Error in create game: ${err}`);
      sendMessage(socket, 'error', 'Error creating game');
    }
  });

  socket.on('join game', async (data: { name: string }) => {
    try {
      const { name } = data;
      if (!clientGameId || !name) {
        sendMessage(socket, 'error', 'Missing clientGameId or name');
        return;
      }

      const game = await storageService.getGame(clientGameId);
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

      await storageService.setGame(clientGameId, game);
      sendMessage(socket, 'game joined', game);
      Logger.info(`${playerId} joined game ${clientGameId} as ${symbol}`);

      if (game.players.X.id && game.players.O.id) {
        game.status = 'playing';
        await storageService.setGame(clientGameId, game);
        broadcastMessage(clientGameId, 'game started', game, io);
        Logger.info(`Game ${clientGameId} started`);
      }
    } catch (err) {
      Logger.error(`Error in join game: ${err}`);
      sendMessage(socket, 'error', 'Error joining game');
    }
  });

  socket.on('make move', async (data: { index: number }) => {
    try {
      const { index } = data;
      if (index < 0 || index > 8) {
        sendMessage(socket, 'soft error', 'Invalid move index');
        return;
      }

      const game = await storageService.getGame(clientGameId);
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

      await storageService.setGame(clientGameId, game);
      broadcastMessage(clientGameId, 'game update', game, io);
      Logger.info(`Player ${playerId} made move at index ${index} in game ${clientGameId}`);
    } catch (err) {
      Logger.error(`Error in make move: ${err}`);
      sendMessage(socket, 'error', 'Error making move');
    }
  });

  socket.on('restart round', async () => {
    try {
      const game = await storageService.getGame(clientGameId);
      if (!game) {
        sendMessage(socket, 'error', 'Game not found');
        return;
      }

      if (game.status !== 'finished') {
        sendMessage(socket, 'error', 'Round not finished yet');
        return;
      }

      restartRound(game);
      await storageService.setGame(clientGameId, game);
      broadcastMessage(clientGameId, 'round restarted', game, io);
      Logger.info(`Round restarted for game ${clientGameId} (Round: ${game.round})`);
    } catch (err) {
      Logger.error(`Error restarting round: ${err}`);
      sendMessage(socket, 'error', 'Error restarting round');
    }
  });

  socket.on('restart game', async () => {
    try {
      if (!clientGameId) {
        sendMessage(socket, 'error', 'Game not found');
        return;
      }

      const newGame = createGameState();
      await storageService.setGame(clientGameId, newGame);

      broadcastMessage(clientGameId, 'game restarted', newGame, io);
      Logger.info(`Game ${clientGameId} fully restarted by ${playerId}`);
    } catch (err) {
      Logger.error(`Error restarting game: ${err}`);
      sendMessage(socket, 'error', 'Error restarting game');
    }
  });

  socket.on('offer rematch', async () => {
    try {
      const game = await storageService.getGame(clientGameId);
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

  socket.on('disconnect', async () => {
    Logger.warn(`Player disconnected: ${playerId}`);
    const games = await storageService.getAllGames();
    for (const game of Object.values(games)) {
      for (const symbol of ['X', 'O'] as const) {
        if (game.players[symbol]?.id === playerId) {
          io.to(game.creator as string).emit('player disconnected', { type: 'player disconnected', data: game });
        }
      }
    }
  });
};
