export interface Capture {
  id: string;
  /** auth.user.id — set when saving while signed in. */
  userId?: string;
  createdAt: number;
  kind: 'voice' | 'note';
  /** voice — raw audio blob, kept locally for instant playback */
  audioBlob?: Blob;
  /** voice — duration in seconds */
  duration?: number;
  /** voice — recorded mime type (e.g. audio/mp4 on iOS, audio/webm on Chrome) */
  mimeType?: string;
  /** voice — Supabase Storage path once uploaded (e.g. `<user_id>/<id>.webm`) */
  audioPath?: string;
  /** note — free text */
  text?: string;
  /** transcription, filled in once Whisper integration lands (Phase 2.3) */
  transcript?: string;
  /** ms timestamp of last successful sync to Supabase. Null/undefined → pending. */
  syncedAt?: number;
}
