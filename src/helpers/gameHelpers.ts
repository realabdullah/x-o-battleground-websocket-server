import { IGame } from '../types';

export const createGameState = (): IGame => ({
  board: Array(9).fill(null),
  currentPlayer: 'X',
  status: 'waiting',
  round: 1,
  scores: { X: 0, O: 0, draws: 0 },
  players: {
    X: { id: null, name: null },
    O: { id: null, name: null },
  },
  creator: null,
  winner: null,
});

export const checkWinner = (board: IGame['board']) => {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every((cell) => cell !== null)) {
    return 'draw';
  }
  return null;
};

export const restartRound = (game: IGame) => {
  game.board = Array(9).fill(null);
  game.currentPlayer = 'X'; // You can randomize if desired
  game.status = 'playing';
  game.winner = null;
  game.round += 1;
};
