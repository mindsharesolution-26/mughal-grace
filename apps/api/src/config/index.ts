import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3001'),

  // Multi-tenant
  TENANT_SCHEMA_PREFIX: z.string().default('tenant_'),

  // WhatsApp Business API
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_WEBHOOK_URL: z.string().optional(),
});

const parseEnv = () => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
};

const env = parseEnv();

export const config = {
  nodeEnv: env.NODE_ENV,
  port: parseInt(env.PORT, 10),

  database: {
    url: env.DATABASE_URL,
  },

  redis: {
    url: env.REDIS_URL,
  },

  jwt: {
    secret: env.JWT_SECRET,
    accessExpiry: env.JWT_ACCESS_EXPIRY,
    refreshExpiry: env.JWT_REFRESH_EXPIRY,
  },

  corsOrigins: env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),

  tenant: {
    schemaPrefix: env.TENANT_SCHEMA_PREFIX,
  },

  whatsapp: {
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: env.WHATSAPP_ACCESS_TOKEN || '',
    verifyToken: env.WHATSAPP_VERIFY_TOKEN || '',
    webhookUrl: env.WHATSAPP_WEBHOOK_URL || '',
    enabled: !!env.WHATSAPP_PHONE_NUMBER_ID && !!env.WHATSAPP_ACCESS_TOKEN,
    apiUrl: 'https://graph.facebook.com/v18.0',
  },

  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
} as const;

export type Config = typeof config;
