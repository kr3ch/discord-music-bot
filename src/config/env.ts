import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  CLIENT_ID: z.string().min(1, 'CLIENT_ID is required'),
  DEV_GUILD_ID: z.string().optional().default(''),

  SPOTIFY_CLIENT_ID: z.string().optional().default(''),
  SPOTIFY_CLIENT_SECRET: z.string().optional().default(''),
  GENIUS_TOKEN: z.string().optional().default(''),

  DATABASE_URL: z.string().default('file:./data/bot.db'),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LEAVE_ON_EMPTY_TIMEOUT: z.coerce.number().int().positive().default(60),
  DEFAULT_COOLDOWN_MS: z.coerce.number().int().nonnegative().default(2000),
  QUEUE_PAGE_SIZE: z.coerce.number().int().positive().default(10),
  MAX_QUEUE_SIZE: z.coerce.number().int().positive().default(500),
  YTDLP_PATH: z.string().optional().default(''),
  FFMPEG_PATH: z.string().optional().default(''),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    for (const issue of result.error.issues) {
      console.error(`   ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
export type Env = z.infer<typeof envSchema>;
