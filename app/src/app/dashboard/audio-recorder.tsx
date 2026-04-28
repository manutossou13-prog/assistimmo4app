"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onTranscript: (text: string) => void;
};

type Status = "idle" | "recording" | "transcribing" | "error";

export function AudioRecorder({ onTranscript }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      stopTick();
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function startTick() {
    setSeconds(0);
    tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }
  function stopTick() {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  }

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickSupportedMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = onStop;
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setStatus("recording");
      startTick();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Permission micro refusée";
      setError(message);
      setStatus("error");
    }
  }

  function stop() {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    rec.stop();
    rec.stream.getTracks().forEach((t) => t.stop());
    stopTick();
  }

  async function onStop() {
    setStatus("transcribing");
    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
    const file = new File([blob], `recording-${Date.now()}.webm`, { type: blob.type });
    const fd = new FormData();
    fd.append("audio", file);
    try {
      const res = await fetch("/api/lea/transcribe", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`);
      onTranscript(json.text ?? "");
      setStatus("idle");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur transcription";
      setError(message);
      setStatus("error");
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) {
      setError(`Fichier trop gros (${(f.size / 1024 / 1024).toFixed(1)} MB). Max 25 MB.`);
      setStatus("error");
      e.target.value = "";
      return;
    }
    setError(null);
    setStatus("transcribing");
    const fd = new FormData();
    fd.append("audio", f);
    try {
      const res = await fetch("/api/lea/transcribe", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`);
      onTranscript(json.text ?? "");
      setStatus("idle");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur transcription";
      setError(message);
      setStatus("error");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div
      style={{
        padding: 12,
        background: "rgba(165,91,224,.08)",
        border: "1px dashed rgba(165,91,224,.3)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {status === "idle" && (
          <>
            <button type="button" onClick={start} style={btnPrimary}>
              🎙 Démarrer l&apos;enregistrement
            </button>
            <span style={{ fontSize: 11.5, color: "var(--color-muted)" }}>ou</span>
            <label style={btnGhost}>
              📁 Importer un fichier audio
              <input
                type="file"
                accept="audio/*"
                onChange={handleFile}
                style={{ display: "none" }}
              />
            </label>
            <span style={{ fontSize: 10.5, color: "var(--color-muted)", marginLeft: "auto" }}>
              MP3 / M4A / WAV / WebM · 25 Mo max
            </span>
          </>
        )}
        {status === "recording" && (
          <>
            <button type="button" onClick={stop} style={{ ...btnPrimary, background: "#b13818" }}>
              ⏹ Arrêter ({formatTime(seconds)})
            </button>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: "#b13818",
                animation: "pulse 1s infinite",
              }}
            />
            <span style={{ fontSize: 12.5, color: "#7d2811" }}>Enregistrement en cours…</span>
          </>
        )}
        {status === "transcribing" && (
          <span style={{ fontSize: 13, color: "var(--color-muted)" }}>
            ⏳ Whisper transcrit l&apos;audio…
          </span>
        )}
        {status === "error" && error && (
          <>
            <span style={{ fontSize: 12.5, color: "#7d2811" }}>⚠ {error}</span>
            <button type="button" onClick={() => setStatus("idle")} style={btnGhost}>
              Réessayer
            </button>
          </>
        )}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}

function pickSupportedMime(): string | null {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return null;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

const btnPrimary: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 999,
  background: "#A55BE0",
  color: "#fff",
  border: "none",
  fontWeight: 500,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};

const btnGhost: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 999,
  background: "rgba(255,255,255,.7)",
  border: "1px solid var(--color-line)",
  color: "var(--color-ink-2)",
  fontWeight: 500,
  fontSize: 12.5,
  cursor: "pointer",
  fontFamily: "inherit",
};
