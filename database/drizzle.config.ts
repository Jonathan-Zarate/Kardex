import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'
import { resolve } from 'path'

config({ path: resolve('..', '.env') })

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
})
