import { neon } from '@neondatabase/serverless'
import type { User } from './types'

let _sql: ReturnType<typeof neon> | null = null

export function getSql() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!)
  return _sql
}

export async function getOrCreateUser(slug: string): Promise<User> {
  const sql = getSql()
  const rows = await sql`
    INSERT INTO users (slug)
    VALUES (${slug})
    ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
    RETURNING *
  `
  return (rows as User[])[0]
}

export async function updateUserCurrency(slug: string, currency: 'EUR' | 'KRW'): Promise<void> {
  const sql = getSql()
  await sql`UPDATE users SET currency = ${currency} WHERE slug = ${slug}`
}
