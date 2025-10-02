const mustGet = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is missing in environment variables`);
  }
  return value;
};

const config = {
  env: {
    databaseUrl: mustGet('DATABASE_URL'),
    apiEndpoint: process.env.NEXT_PUBLIC_API_ENDPOINT,
    authSecret: process.env.AUTH_SECRET,
    aiApiKey: process.env.AI_API_KEY,
    aiResponseModel: process.env.AI_RESPONSE_MODEL ?? 'gpt-4o-mini',
    aiEmbeddingModel:
      process.env.AI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
};

export default config;
