export interface Environment {
  DATABASE_URL?: string;
  DATABASE_URL_TEST?: string;
  NODE_ENV?: 'development' | 'production' | 'test';
  POSTHOG_KEY?: string;
}
