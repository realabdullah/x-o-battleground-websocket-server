import { server } from './app';
import config from './config/config';
import { Logger } from './config/logger.ts';

server.listen(config.port, () => {
    Logger.info(`Server listening on port ${config.port}`);
});