# X-O Battleground Server

A real-time Tic-Tac-Toe game server built with Fastify, Socket.IO, and Redis storage.

## Features

- **Real-time Gameplay**: Socket.IO for instant game updates
- **Redis Storage**: Persistent storage with Redis for game data
- **Fast Performance**: Fastify web framework for high-performance HTTP server
- **Game Management**: Create, join, and manage multiple games
- **Player Reconnection**: Automatic reconnection to ongoing games
- **REST API**: HTTP endpoints for game management

## Architecture

### Storage Layer
- **Redis**: Primary storage for all game data
- **Persistence**: Game state persists across server restarts
- **Performance**: Fast Redis operations for real-time gameplay

### Web Framework
- **Fastify**: High-performance HTTP server
- **Socket.IO**: Real-time WebSocket communication
- **CORS**: Cross-origin resource sharing support

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (create `.env` file):
   ```env
   PORT=3000
   NODE_ENV=development
   REDIS_URL=redis://localhost:6379
   ```

4. Start Redis:
   ```bash
   redis-server
   ```

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## API Endpoints

### HTTP Endpoints
- `GET /` - Server status
- `GET /health` - Health check
- `GET /games` - List all games
- `GET /games/:gameId` - Get specific game
- `DELETE /games/:gameId` - Delete game

### Socket.IO Events

#### Client to Server
- `create game` - Create a new game
- `join game` - Join an existing game
- `make move` - Make a move on the board
- `restart round` - Restart current round
- `restart game` - Restart entire game
- `offer rematch` - Offer rematch to opponent

#### Server to Client
- `message` - General message with type and data
- `reconnected` - Player reconnection confirmation
- `game created` - Game creation confirmation
- `game joined` - Game join confirmation
- `game started` - Game start notification
- `game update` - Game state update
- `round restarted` - Round restart confirmation
- `game restarted` - Game restart confirmation
- `rematch offered` - Rematch offer notification
- `player disconnected` - Player disconnect notification

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |

## Game Flow

1. **Game Creation**: Player creates a game with a unique ID
2. **Game Joining**: Second player joins using the same game ID
3. **Gameplay**: Players take turns making moves
4. **Game End**: Winner is determined or draw occurs
5. **Rematch**: Players can restart rounds or entire games

## Storage Strategy

### Redis Storage
- Persistent storage across server restarts
- Fast access for real-time gameplay
- Automatic connection retry with exponential backoff
- Graceful fallback when Redis is unavailable

## Error Handling

- Graceful shutdown on SIGTERM/SIGINT
- Automatic Redis connection recovery
- Comprehensive error logging
- Client-friendly error messages

## Performance

- Fastify for high-performance HTTP serving
- Redis for fast data access and persistence
- Socket.IO for efficient real-time communication
- Connection retry limits to prevent resource exhaustion 