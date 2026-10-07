// Browser-side voice: microphone capture with a live level (Web Audio), Web Speech API recognition, and spoken replies.

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type SRCtor = new () => SpeechRecognitionLike;

function recognitionCtor(): SRCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const sttSupported = () => recognitionCtor() !== null;
export const micSupported = () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

export class MicError extends Error {
  constructor(public kind: "denied" | "missing" | "unsupported" | "other", message: string) {
    super(message);
  }
}

export type CaptureResult = { blob: Blob | null; transcript: string };
export type Capture = {
  stop: () => Promise<CaptureResult>;
  cancel: () => void;
};

type CaptureOpts = {
  lang: "vi" | "en";
  /** Called every animation frame with 0..1 level and frequency bins; must be cheap (no React state). */
  onFrame: (level: number, bins: Uint8Array) => void;
  onInterim: (text: string) => void;
  onSilence: () => void;
};

export async function startCapture(opts: CaptureOpts): Promise<Capture> {
  if (!micSupported()) throw new MicError("unsupported", "Trình duyệt chưa hỗ trợ micro");
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch (e) {
    const name = (e as DOMException).name;
    if (name === "NotAllowedError" || name === "SecurityError") throw new MicError("denied", "Micro bị chặn");
    if (name === "NotFoundError" || name === "OverconstrainedError") throw new MicError("missing", "Không thấy micro");
    throw new MicError("other", "Không mở được micro");
  }

  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0.7;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const bins = new Uint8Array(analyser.frequencyBinCount);
  const wave = new Uint8Array(analyser.fftSize);

  // Recorder (audio blob goes to /api/speech/transcribe when the backend has it)
  let recorder: MediaRecorder | null = null;
  const chunks: Blob[] = [];
  try {
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"].find((m) => MediaRecorder.isTypeSupported(m));
    recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.start(250);
  } catch {
    recorder = null;
  }

  // Live recognition in the browser (also the fallback when the backend has no STT)
  let finalText = "";
  let interimText = "";
  let sr: SpeechRecognitionLike | null = null;
  let srEnded = Promise.resolve();
  const SR = recognitionCtor();
  if (SR) {
    try {
      sr = new SR();
      sr.lang = opts.lang === "vi" ? "vi-VN" : "en-US";
      sr.continuous = true;
      sr.interimResults = true;
      srEnded = new Promise<void>((resolve) => {
        sr!.onend = () => resolve();
      });
      sr.onresult = (e) => {
        interimText = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += (finalText ? " " : "") + t.trim();
          else interimText += t;
        }
        opts.onInterim((finalText + " " + interimText).trim());
      };
      sr.onerror = () => {};
      sr.start();
    } catch {
      sr = null;
    }
  }

  const t0 = performance.now();
  let spoken = false;
  let lastVoice = t0;
  let raf = 0;
  let done = false;
  const tick = () => {
    if (done) return;
    analyser.getByteFrequencyData(bins);
    analyser.getByteTimeDomainData(wave);
    let sum = 0;
    for (let i = 0; i < wave.length; i++) {
      const v = (wave[i] - 128) / 128;
      sum += v * v;
    }
    const level = Math.min(1, Math.sqrt(sum / wave.length) * 5);
    opts.onFrame(level, bins);
    const now = performance.now();
    if (level > 0.14) {
      spoken = true;
      lastVoice = now;
    }
    if ((spoken && now - lastVoice > 1700) || now - t0 > 20000) {
      done = true;
      opts.onSilence();
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  const cleanup = () => {
    done = true;
    cancelAnimationFrame(raf);
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close().catch(() => {});
  };

  return {
    cancel() {
      cleanup();
      try { sr?.abort(); } catch {}
      try { if (recorder && recorder.state !== "inactive") recorder.stop(); } catch {}
    },
    async stop() {
      cleanup();
      const blobP = new Promise<Blob | null>((resolve) => {
        if (!recorder || recorder.state === "inactive") return resolve(chunks.length ? new Blob(chunks) : null);
        recorder.onstop = () => resolve(new Blob(chunks, { type: recorder!.mimeType }));
        recorder.stop();
      });
      try { sr?.stop(); } catch {}
      await Promise.race([srEnded, new Promise((r) => setTimeout(r, 800))]);
      const blob = await blobP;
      return { blob, transcript: (finalText + " " + interimText).trim() };
    },
  };
}

// ---------- Spoken replies ----------
export type Speaker = { stop: () => void };

function pickVoice(lang: "vi" | "en"): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return undefined;
  const voices = window.speechSynthesis.getVoices();
  const matching = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith(lang));
  if (!matching.length) return undefined;
  // Ưu tiên các giọng Neural / Natural / Google tiếng Việt cao cấp
  const natural = matching.find(
    (v) =>
      v.name.includes("Natural") ||
      v.name.includes("HoaiMy") ||
      v.name.includes("NamMinh") ||
      v.name.includes("Google") ||
      v.name.includes("Neural")
  );
  return natural || matching[0];
}

export function speakWithSynthesis(text: string, lang: "vi" | "en", onEnd: () => void): Speaker | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "vi" ? "vi-VN" : "en-US";
  const v = pickVoice(lang);
  if (v) u.voice = v;
  u.rate = 1.02;
  u.onend = onEnd;
  u.onerror = onEnd;
  window.speechSynthesis.speak(u);
  return { stop: () => window.speechSynthesis.cancel() };
}

/** Plays backend TTS when given, otherwise speechSynthesis. Resolves a handle that can stop playback. */
export async function speakReply(opts: { text: string; audioUrl?: string; lang: "vi" | "en"; onEnd: () => void }): Promise<Speaker | null> {
  if (opts.audioUrl) {
    try {
      const a = new Audio(opts.audioUrl);
      a.onended = opts.onEnd;
      a.onerror = opts.onEnd;
      await a.play();
      return { stop: () => { a.pause(); opts.onEnd(); } };
    } catch {
      // fall through to speechSynthesis
    }
  }
  return speakWithSynthesis(opts.text, opts.lang, opts.onEnd);
}
