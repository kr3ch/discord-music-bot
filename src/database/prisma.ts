import { PrismaClient } from '@prisma/client';
import { createChildLogger } from '../utils/logger';

const log = createChildLogger('database');

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('error', (e) => log.error(e, 'Prisma error'));
prisma.$on('warn', (e) => log.warn(e, 'Prisma warning'));

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    log.info('Connected to database');
  } catch (err) {
    log.fatal(err, 'Failed to connect to database');
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  log.info('Disconnected from database');
}
