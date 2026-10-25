import mongoose from 'mongoose';
import { env } from '../config/env';

/** Read-only: confirms the database is reachable and shows what is in it (`npm run db:status`). */
async function run() {
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database handle.');

  const collections = await db.listCollections().toArray();
  console.info(`Connected to database "${mongoose.connection.name}"`);
  if (collections.length === 0) console.info('  (empty: run `npm run seed`)');
  for (const { name } of collections) {
    console.info(`  ${name.padEnd(16)} ${await db.collection(name).estimatedDocumentCount()} documents`);
  }
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error('Database check failed:', (error as Error).message);
  process.exit(1);
});
