export interface Capture {
  id: string;
  createdAt: number;
  kind: 'voice' | 'note';
  /** voice — raw audio blob */
  audioBlob?: Blob;
  /** voice — duration in seconds */
  duration?: number;
  /** voice — recorded mime type (e.g. audio/mp4 on iOS, audio/webm on Chrome) */
  mimeType?: string;
  /** note — free text */
  text?: string;
  /** transcription, filled in once Whisper integration lands (Phase 2.3) */
  transcript?: string;
}
