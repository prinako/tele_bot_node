import dotenv from 'dotenv';

dotenv.config();

const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 3000),
    databaseUrl: process.env.DATABASE_URL,
    allowedUsers: process.env.ALLOWED_USERS || '',
    adminUsers: process.env.ADMIN_USERS || '',
    log: process.env.LOG === 'true',
    botApiToken: process.env.BOT_API_TOKEN || '',
    adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || '',
    cookieSecure: process.env.COOKIE_SECURE !== 'false',
    corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean),
};

export default env;
