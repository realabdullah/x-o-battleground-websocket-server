import { FastifyPluginAsync } from 'fastify';

const indexRouter: FastifyPluginAsync = async (fastify, options) => {
  fastify.get('/', async (request, reply) => {
    return { message: 'x-o-battleground webSocket server is running.' };
  });

  // Add game management endpoints
  fastify.get('/games', async (request, reply) => {
    const { storageService } = await import('../services/storage');
    const games = await storageService.getAllGames();
    return { games };
  });

  fastify.get('/games/:gameId', async (request, reply) => {
    const { gameId } = request.params as { gameId: string };
    const { storageService } = await import('../services/storage');
    const game = await storageService.getGame(gameId);
    
    if (!game) {
      return reply.code(404).send({ error: 'Game not found' });
    }
    
    return { game };
  });

  fastify.delete('/games/:gameId', async (request, reply) => {
    const { gameId } = request.params as { gameId: string };
    const { storageService } = await import('../services/storage');
    await storageService.deleteGame(gameId);
    return { message: 'Game deleted successfully' };
  });
};

export default indexRouter;
