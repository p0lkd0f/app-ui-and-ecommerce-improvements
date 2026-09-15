import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const databaseUrl = process.env.DATABASE_URL?.replace(
  /([?&]sslmode=)(prefer|require|verify-ca)(?=(&|$))/i,
  '$1verify-full',
)

export const pool = new Pool({ connectionString: databaseUrl })
export const db = drizzle(pool, { schema })
