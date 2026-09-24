import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// The anonymous key is deliberately public. RLS policies in supabase/schema.sql protect all writes.
export const supabase = url && key ? createClient(url, key) : null
