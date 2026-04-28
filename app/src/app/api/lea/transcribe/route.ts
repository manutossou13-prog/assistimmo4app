import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB (limite OpenAI Whisper)

export async function POST(request: NextRequest) {
  // Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Vérification clé OpenAI (Whisper)
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY manquante côté serveur. Ajoute la variable dans Vercel pour activer la transcription audio.",
      },
      { status: 500 }
    );
  }

  // Parse multipart
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "FormData invalide." }, { status: 400 });
  }

  const file = formData.get("audio");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Champ 'audio' manquant ou invalide." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Fichier audio vide." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Fichier trop gros (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 25 MB.` },
      { status: 400 }
    );
  }

  // Forward vers OpenAI Whisper
  const whisperForm = new FormData();
  // Whisper accepte mp3, mp4, mpeg, mpga, m4a, wav, webm
  whisperForm.append("file", file, file.name || "recording.webm");
  whisperForm.append("model", "whisper-1");
  whisperForm.append("language", "fr");
  whisperForm.append("response_format", "verbose_json");
  whisperForm.append("temperature", "0");

  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: whisperForm,
      signal: AbortSignal.timeout(55_000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur réseau";
    return NextResponse.json({ error: `Whisper indisponible : ${message}` }, { status: 502 });
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Whisper API ${res.status} : ${body.slice(0, 200)}` },
      { status: 502 }
    );
  }

  const data = (await res.json()) as { text?: string; duration?: number; language?: string };

  return NextResponse.json({
    text: data.text ?? "",
    duration_sec: data.duration ?? null,
    language: data.language ?? "fr",
    transcribe_ms: Date.now() - t0,
    file_size_kb: Math.round(file.size / 1024),
  });
}
