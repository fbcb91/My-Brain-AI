import { useCallback, useEffect, useRef, useState } from 'react';

export interface RecordingResult {
  blob: Blob;
  duration: number;
  mimeType: string;
}

interface UseRecorderState {
  isRecording: boolean;
  duration: number;
  error: string | null;
}

interface UseRecorderApi extends UseRecorderState {
  start: () => Promise<void>;
  stop: () => Promise<RecordingResult | null>;
  cancel: () => void;
}

/** Pick a mimeType the current browser actually supports. */
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/aac',
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return undefined;
}

export function useRecorder(): UseRecorderApi {
  const [state, setState] = useState<UseRecorderState>({
    isRecording: false,
    duration: 0,
    error: null,
  });

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const cancelledRef = useRef<boolean>(false);

  const cleanup = useCallback(() => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const start = useCallback(async () => {
    if (recorderRef.current) return;
    cancelledRef.current = false;
    setState({ isRecording: false, duration: 0, error: null });

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState((s) => ({ ...s, error: 'Recording is not supported in this browser.' }));
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const msg =
        e instanceof Error && e.name === 'NotAllowedError'
          ? 'Microphone access denied. Enable it in browser settings.'
          : 'Could not start microphone. Try again?';
      setState((s) => ({ ...s, error: msg }));
      return;
    }

    streamRef.current = stream;
    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      // fallback without options
      recorder = new MediaRecorder(stream);
    }
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start();
    startedAtRef.current = Date.now();
    setState({ isRecording: true, duration: 0, error: null });

    tickRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setState((s) => ({ ...s, duration: elapsed }));
    }, 100);
  }, []);

  const stop = useCallback((): Promise<RecordingResult | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder) {
        resolve(null);
        return;
      }
      const onStop = () => {
        const wasCancelled = cancelledRef.current;
        const dur = (Date.now() - startedAtRef.current) / 1000;
        const blobType = recorder.mimeType || chunksRef.current[0]?.type || 'audio/webm';
        const chunks = chunksRef.current.slice();
        cleanup();
        setState({ isRecording: false, duration: 0, error: null });
        if (wasCancelled || chunks.length === 0) {
          resolve(null);
          return;
        }
        const blob = new Blob(chunks, { type: blobType });
        resolve({ blob, duration: dur, mimeType: blobType });
      };
      recorder.addEventListener('stop', onStop, { once: true });
      try {
        recorder.stop();
      } catch {
        onStop();
      }
    });
  }, [cleanup]);

  const cancel = useCallback(() => {
    if (!recorderRef.current) return;
    cancelledRef.current = true;
    try {
      recorderRef.current.stop();
    } catch {
      cleanup();
      setState({ isRecording: false, duration: 0, error: null });
    }
  }, [cleanup]);

  return { ...state, start, stop, cancel };
}
