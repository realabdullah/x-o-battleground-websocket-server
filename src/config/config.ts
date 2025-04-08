import dotenv from 'dotenv';
import { Config } from '../types.ts';

dotenv.config();

const config: Config = {
    port: Number(process.env.PORT) || 4000,
    nodeEnv: process.env.NODE_ENV || 'development',
};

export default config;