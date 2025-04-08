export interface Player {
  id: string | null;
  name: string | null;
}

export interface Scores {
  X: number;
  O: number;
  draws: number;
}

export interface IGame {
  board: (string | null)[];
  currentPlayer: 'X' | 'O';
  status: 'waiting' | 'playing' | 'finished';
  round: number;
  scores: Scores;
  players: { X: Player; O: Player };
  creator: string | null;
  winner: string | null;
}

export interface Config {
  port: number;
  nodeEnv: string;
}
