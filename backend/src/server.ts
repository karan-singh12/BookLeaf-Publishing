import mongoose from 'mongoose';
import { app } from './app';
import { env } from './config/env';

async function bootstrap() {
  try {
    console.info('[database] Connecting to MongoDB...');
    await mongoose.connect(env.mongodbUri);
    console.info('[database] MongoDB connected successfully.');

    const server = app.listen(env.port, () => {
      console.info(`[server] BookLeaf Support API running on port ${env.port} (${env.nodeEnv})`);
      console.info(`[server] API base URL: http://localhost:${env.port}${env.api.prefix}`);
      console.info(`[server] Swagger API documentation available at http://localhost:${env.port}/api/docs`);
    });

    const shutdown = async (signal: string) => {
      console.info(`[server] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await mongoose.connection.close();
        console.info('[server] Process terminated.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('[server] Fatal startup error:', error);
    process.exit(1);
  }
}

void bootstrap();
