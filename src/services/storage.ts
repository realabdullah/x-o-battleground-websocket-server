import { createClient, RedisClientType } from 'redis';
import { IGame } from '../types';
import { Logger } from '../config/logger';

export interface StorageService {
  getGame(gameId: string): Promise<IGame | null>;
  setGame(gameId: string, game: IGame): Promise<void>;
  deleteGame(gameId: string): Promise<void>;
  getAllGames(): Promise<Record<string, IGame>>;
  isConnected(): boolean;
}

class RedisStorage implements StorageService {
  private client: RedisClientType;
  private connected: boolean = false;
  private connectionAttempts: number = 0;
  private maxRetries: number = 5;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries >= this.maxRetries) {
            Logger.warn(`Redis connection failed after ${this.maxRetries} attempts.`);
            return false; // Stop retrying
          }
          return Math.min(retries * 50, 500); // Exponential backoff with max 500ms
        }
      }
    });

    this.client.on('connect', () => {
      Logger.info('Connected to Redis');
      this.connected = true;
    });

    this.client.on('error', (err) => {
      this.connectionAttempts++;
      if (this.connectionAttempts <= 3) { // Only log first few errors to avoid spam
        Logger.error(`Redis connection error: ${err.message}`);
      }
      this.connected = false;
    });

    this.client.on('end', () => {
      Logger.warn('Redis connection ended');
      this.connected = false;
    });

    this.client.connect().catch((err) => {
      if (this.connectionAttempts <= 1) { // Only log the initial connection failure
        Logger.error(`Failed to connect to Redis: ${err.message}`);
      }
      this.connected = false;
    });
  }

  async getGame(gameId: string): Promise<IGame | null> {
    if (!this.connected) return null;
    
    try {
      const data = await this.client.get(`game:${gameId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      Logger.error(`Error getting game from Redis: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async setGame(gameId: string, game: IGame): Promise<void> {
    if (!this.connected) return;
    
    try {
      await this.client.set(`game:${gameId}`, JSON.stringify(game));
    } catch (error) {
      Logger.error(`Error setting game in Redis: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deleteGame(gameId: string): Promise<void> {
    if (!this.connected) return;
    
    try {
      await this.client.del(`game:${gameId}`);
    } catch (error) {
      Logger.error(`Error deleting game from Redis: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getAllGames(): Promise<Record<string, IGame>> {
    if (!this.connected) return {};
    
    try {
      const keys = await this.client.keys('game:*');
      const games: Record<string, IGame> = {};
      
      for (const key of keys) {
        const gameId = key.replace('game:', '');
        const data = await this.client.get(key);
        if (data) {
          games[gameId] = JSON.parse(data);
        }
      }
      
      return games;
    } catch (error) {
      Logger.error(`Error getting all games from Redis: ${error instanceof Error ? error.message : String(error)}`);
      return {};
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
    }
  }
}

// Export singleton instance
export const storageService = new RedisStorage(); 