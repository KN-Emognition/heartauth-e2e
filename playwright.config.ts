import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    // baseURL used by request.newContext or openapi-fetch clients (if you read from env there)
    // baseURL: process.env.EXTERNAL_BASE_URL, // optional if your clients read env directly
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'api',
      use: {},
    },
  ],
});
