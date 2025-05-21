{
  /*
  what's the point of config.ts?
    Think of config.ts as a middleman:
    It reads values from .env.local
    It can validate, transform, or group them nicely for your app

   Benefits of using config.ts:
    Centralized config – no need to call process.env everywhere.
    Can add fallback values.
    Can validate required envs (e.g., throw error if missing).
*/
}

const config = {
  env: {
    apiEndpoint: process.env.NEXT_PUBLIC_API_ENDPOINT,
    databaseUrl: process.env.DATABASE_URL, // Consistent naming
    authSecret: process.env.AUTH_SECRET,
  },
};

// Validate required environment variables
if (!config.env.databaseUrl) {
  throw new Error('DATABASE_URL is missing in environment variables');
}

export default config;
