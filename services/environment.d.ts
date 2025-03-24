export interface Environment {
  AWS_ACCESS_KEY_ID?: string;
  AWS_REGION?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  DATABASE_URL?: string;
  DATABASE_URL_TEST?: string;
  NODE_ENV?: 'development' | 'production' | 'test';
  POSTHOG_KEY?: string;
}
