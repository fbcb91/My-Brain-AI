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
  /** Set when this capture is the answer to a Daily Question — stores the
   * question text verbatim, so Claude can use it as context later. */
  questionText?: string;
  /** Marked private by the user. Excluded from chat memory context and
   * (in the future) from heir access. Defaults to false. */
  isPrivate?: boolean;
  /** Server-side flag: has /api/extract-entities already processed this
   * capture? Client treats as read-only — the server flips it to true. */
  entitiesExtracted?: boolean;
  /** ms timestamp of last successful sync to Supabase. Null/undefined → pending. */
  syncedAt?: number;
}
