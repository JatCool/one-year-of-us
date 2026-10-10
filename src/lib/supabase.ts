/**
 * Supabase client and the handful of data-access calls the app needs.
 *
 * The anon key is meant to be public: Row Level Security policies in
 * `supabase/schema.sql` allow anyone to read, and only users listed in
 * `public.site_editors` to write.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { normalizeContent, type SiteContent } from '../content/model'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

/** `null` when the env variables are missing — the UI then shows setup instructions. */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

/** Names shared with `supabase/schema.sql`. Change both together. */
export const CONTENT_TABLE = 'site_content'
export const EDITORS_TABLE = 'site_editors'
export const CONTENT_ROW_ID = 'main'
export const MEDIA_BUCKET = 'anniversary-media'
/** Must not exceed the bucket's `file_size_limit` in `schema.sql`. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

/** Loads the site document. Resolves to `null` when nothing has been saved yet. */
export async function fetchContent(client: SupabaseClient): Promise<SiteContent | null> {
  const { data, error } = await client.from(CONTENT_TABLE).select('content').eq('id', CONTENT_ROW_ID).maybeSingle()
  if (error) throw error
  return data?.content ? normalizeContent(data.content) : null
}

export async function saveContent(client: SupabaseClient, content: SiteContent): Promise<void> {
  const { error } = await client
    .from(CONTENT_TABLE)
    .upsert({ id: CONTENT_ROW_ID, content, updated_at: new Date().toISOString() })
  if (error) throw error
}

/** Whether the signed-in user is allowed to edit (present in `site_editors`). */
export async function isEditor(client: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await client.from(EDITORS_TABLE).select('user_id').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return !!data
}

/** Uploads a file to the media bucket and returns its public URL. */
export async function uploadMedia(client: SupabaseClient, file: File, prefix: 'image' | 'audio'): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`Файл завеликий (${Math.ceil(file.size / 1024 / 1024)} МБ). Максимум — ${MAX_UPLOAD_BYTES / 1024 / 1024} МБ.`)
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-80) || prefix
  const path = `${prefix}-${crypto.randomUUID()}-${safeName}`
  const { error } = await client.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type || undefined })
  if (error) throw error
  return client.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
}

/** Maps a public URL of our bucket back to its object path, or `null` for foreign URLs. */
export function mediaPathFromUrl(publicUrl: string, baseUrl = url ?? ''): string | null {
  if (!baseUrl || !publicUrl) return null
  const prefix = `${baseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${MEDIA_BUCKET}/`
  if (!publicUrl.startsWith(prefix)) return null
  const path = publicUrl.slice(prefix.length).split(/[?#]/)[0]
  return path ? decodeURIComponent(path) : null
}

/**
 * Best-effort removal of a file that is no longer referenced. Failures are
 * ignored: an orphaned file only costs storage, never breaks the site.
 */
export async function deleteMediaByUrl(client: SupabaseClient, publicUrl: string): Promise<void> {
  const path = mediaPathFromUrl(publicUrl)
  if (!path) return
  await client.storage.from(MEDIA_BUCKET).remove([path]).catch(() => undefined)
}
