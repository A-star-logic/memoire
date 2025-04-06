export interface Environment {
  DATABASE_URL?: string;
  DATABASE_URL_TEST?: string;
  MISTRAL_API_KEY?: string;
  NODE_ENV?: 'development' | 'production' | 'test';
  POSTHOG_KEY?: string;
}
