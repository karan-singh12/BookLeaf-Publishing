import mongoose from 'mongoose';
import { env } from '../config/env';
import { Book, Ticket, TicketMessage, User } from '../models';

/**
 * Makes the database's indexes match the schemas: creates missing ones and drops ones that
 * are no longer declared. Run after changing an index in a model (`npm run db:sync-indexes`).
 */
async function run() {
  await mongoose.connect(env.mongodbUri);
  for (const model of [User, Book, Ticket, TicketMessage]) {
    const dropped = await model.syncIndexes();
    console.info(`[indexes] ${model.modelName}: dropped [${dropped.join(', ') || 'none'}]`);
  }
  await mongoose.connection.close();
}

run().catch((error) => {
  console.error('[indexes] Failed:', error);
  process.exit(1);
});
