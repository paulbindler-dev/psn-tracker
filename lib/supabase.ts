import { createClient } from '@supabase/supabase-js'

// Next.js inlines NEXT_PUBLIC_* vars at build time, so placeholder strings like
// "your_supabase_project_url" are truthy and bypass a simple || fallback.
// Validate the URL explicitly so the build succeeds with placeholder values.
// At runtime, requests will return 500 until real values are set in .env.local.
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseUrl = /^https?:\/\//.test(rawUrl) ? rawUrl : 'http://localhost:54321'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseKey)
