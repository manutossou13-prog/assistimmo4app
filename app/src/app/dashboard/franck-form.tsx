"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { generateVideoScriptAction, type FranckActionResult } from "./actions";

export function FranckForm() {
  const [state, formAction] = useActionState<FranckActionResult | null, FormData>(
    generateVideoScriptAction,
    null
  );

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <span aria-hidden style={{ ...avatar, background: "linear-gradient(135deg,#2FB8A4,#1f8a78)" }}>F</span>
        <div>
          <h2 style={h2}>Franck · Vidéaste IA</h2>
          <p style={pSub}>Scripts vidéo + storyboard + voix off + prompts Runway/Luma/Kling.</p>
        </div>
      </div>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Sujet de la vidéo" name="topic" required placeholder="Ex: Pavillon Drancy 95m² avec jardin sud" rows={1} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <Select label="Type" name="video_kind" defaultValue="bien">
            <option value="bien">Présentation bien</option>
            <option value="estimation">Estimation gratuite</option>
            <option value="recrutement">Recrutement</option>
            <option value="temoignage">Témoignage client</option>
            <option value="avant_apres">Avant/après</option>
            <option value="actu_marche">Actu marché</option>
          </Select>
          <Select label="Canal" name="channel" defaultValue="reel">
            <option value="reel">Reel Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube_short">YouTube Short</option>
            <option value="youtube_long">YouTube long</option>
            <option value="linkedin">LinkedIn</option>
          </Select>
          <Select label="Durée (sec)" name="duration_seconds" defaultValue="30">
            <option value="15">15 s</option>
            <option value="30">30 s</option>
            <option value="60">60 s</option>
            <option value="90">90 s</option>
            <option value="180">3 min</option>
            <option value="300">5 min</option>
          </Select>
          <Select label="Style" name="style" defaultValue="cinematique">
            <option value="cinematique">Cinématique</option>
            <option value="dynamique">Dynamique</option>
            <option value="cosy">Cosy</option>
            <option value="premium">Premium</option>
            <option value="terrain">Terrain (selfie)</option>
            <option value="talking_head">Talking head</option>
          </Select>
        </div>

        <Field label="Contexte" name="context" required rows={3} placeholder="Ex: Pavillon Petit Drancy, 95m² + 200m² terrain, jardin sud, garage 2 voitures, DPE D, prix 449k€, mandat exclusif rentré la semaine dernière. Cible: vendeurs Petit Drancy. Ton chaleureux." />

        <SubmitButton />
      </form>

      {state && state.ok === false && <ErrorBox message={state.error} />}
      {state && state.ok && <ResultPanel state={state} />}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} style={{ ...btnSubmit, background: pending ? "var(--color-muted)" : "var(--color-ink)", cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.7 : 1 }}>
      {pending ? "Franck écrit le script… (≈ 10 s)" : "Lancer Franck →"}
    </button>
  );
}

function ResultPanel({ state }: { state: Extract<FranckActionResult, { ok: true }> }) {
  const { result } = state;
  const [activeShot, setActiveShot] = useState(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function copy(label: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 1500);
    }).catch(() => {/* ignore */});
  }

  const shot = result.shots[activeShot];

  return (
    <div style={{ marginTop: 22, padding: 22, borderRadius: 18, background: "linear-gradient(135deg, var(--color-cream-2), #fff)", border: "1px solid var(--color-line)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <span style={pill}>{result.shots.length} plan{result.shots.length > 1 ? "s" : ""}</span>
        <span style={pill}>{result.total_duration} s</span>
        <span style={pill}>{(result.meta.duration_ms / 1000).toFixed(1)} s</span>
      </div>

      <SectionTitle>Hook 3 sec</SectionTitle>
      <p style={{ margin: "0 0 16px", fontFamily: "var(--font-display)", fontSize: 22, color: "var(--color-ink)" }}>
        « {result.hook_3s} »
      </p>

      <SectionTitle>Plans · cliquables</SectionTitle>
      <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 8, marginBottom: 14, borderBottom: "1px solid var(--color-line)" }}>
        {result.shots.map((s, i) => (
          <button key={s.index} type="button" onClick={() => setActiveShot(i)} style={{ padding: "7px 12px", borderRadius: 8, border: "none", background: i === activeShot ? "var(--color-ink)" : "rgba(255,255,255,.7)", color: i === activeShot ? "var(--color-cream)" : "var(--color-muted)", fontSize: 11.5, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
            #{s.index} · {s.start_sec}-{s.end_sec}s
          </button>
        ))}
      </div>

      {shot && (
        <div style={{ background: "#fff", border: "1px solid var(--color-line)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <SectionTitle>Description du plan</SectionTitle>
            <p style={{ margin: 0, fontSize: 14 }}>{shot.description}</p>
          </div>
          {shot.voiceover && shot.voiceover !== "—" && (
            <div style={{ marginBottom: 12 }}>
              <SectionTitle>🎙 Voix off</SectionTitle>
              <p style={{ margin: 0, fontSize: 13.5, fontStyle: "italic" }}>{shot.voiceover}</p>
            </div>
          )}
          {shot.caption_text && (
            <div style={{ marginBottom: 12 }}>
              <SectionTitle>Texte écran (burn-in)</SectionTitle>
              <p style={{ margin: 0, fontSize: 13, fontFamily: "var(--font-display)" }}>{shot.caption_text}</p>
            </div>
          )}
          {shot.ai_video_prompt && (
            <div style={{ background: "rgba(47,184,164,.08)", border: "1px solid rgba(47,184,164,.3)", borderRadius: 10, padding: 12 }}>
              <SectionTitle>🎬 Prompt vidéo IA (Runway / Luma / Kling)</SectionTitle>
              <code style={{ fontSize: 11.5, fontFamily: "var(--font-mono)", color: "#1f8a78", display: "block", marginBottom: 6 }}>{shot.ai_video_prompt}</code>
              <button type="button" onClick={() => copy(`shot-${shot.index}`, shot.ai_video_prompt!)} style={btnCopy(copiedField === `shot-${shot.index}`)}>
                {copiedField === `shot-${shot.index}` ? "✓ Copié" : "Copier"}
              </button>
            </div>
          )}
        </div>
      )}

      <SectionTitle>🎙 Narration complète (voix off)</SectionTitle>
      <pre style={preBlock}>{result.voiceover_full}</pre>
      <button type="button" onClick={() => copy("vo", result.voiceover_full)} style={btnCopy(copiedField === "vo")}>
        {copiedField === "vo" ? "✓ VO copiée" : "Copier la narration"}
      </button>

      {result.shot_list_to_film.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <SectionTitle>Shot list à tourner sur place</SectionTitle>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
            {result.shot_list_to_film.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <SectionTitle>Légende du post</SectionTitle>
        <pre style={preBlock}>{result.caption_post}</pre>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {result.hashtags.map((h, i) => <span key={i} style={{ ...pill, fontSize: 10.5, background: "rgba(27,42,78,.06)", color: "var(--color-navy)" }}>{h}</span>)}
        </div>
      </div>

      {result.music_brief && (
        <div style={{ marginTop: 18, padding: 12, background: "rgba(197,169,121,.08)", borderRadius: 10, border: "1px solid rgba(197,169,121,.25)" }}>
          <SectionTitle>🎵 Brief musique</SectionTitle>
          <p style={{ margin: 0, fontSize: 12.5 }}>{result.music_brief}</p>
        </div>
      )}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return <div style={{ marginTop: 18, padding: "12px 16px", borderRadius: 12, background: "rgba(177,56,24,.08)", border: "1px solid rgba(177,56,24,.25)", color: "#7d2811", fontSize: 13 }}>{message}</div>;
}

// Shared mini components
function Field({ label, name, required, rows = 3, placeholder }: { label: string; name: string; required?: boolean; rows?: number; placeholder?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11.5, color: "var(--color-muted)", fontWeight: 500 }}>{label}</span>
      <textarea name={name} required={required} placeholder={placeholder} rows={rows} style={inputStyle} />
    </label>
  );
}
function Select({ label, name, defaultValue, children }: { label: string; name: string; defaultValue: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11.5, color: "var(--color-muted)", fontWeight: 500 }}>{label}</span>
      <select name={name} defaultValue={defaultValue} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
        {children}
      </select>
    </label>
  );
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--color-taupe)", margin: "0 0 8px" }}>{children}</h3>;
}
const card: React.CSSProperties = { background: "rgba(255,255,255,.65)", border: "1px solid var(--color-line)", borderRadius: 24, padding: 28, marginBottom: 24 };
const avatar: React.CSSProperties = { width: 36, height: 36, borderRadius: 999, color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14 };
const h2: React.CSSProperties = { fontFamily: "var(--font-display)", fontSize: 22, margin: 0 };
const pSub: React.CSSProperties = { fontSize: 12, color: "var(--color-muted)", margin: 0, marginTop: 2 };
const inputStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid var(--color-line)", background: "#fff", fontSize: 13.5, fontFamily: "inherit", color: "var(--color-ink)", outline: "none", resize: "vertical", lineHeight: 1.55 };
const btnSubmit: React.CSSProperties = { alignSelf: "flex-start", padding: "12px 22px", borderRadius: 999, color: "var(--color-cream)", border: "none", fontWeight: 500, fontSize: 14, boxShadow: "0 14px 32px rgba(12,12,12,.18)" };
const btnCopy = (copied: boolean): React.CSSProperties => ({ padding: "6px 12px", borderRadius: 999, background: copied ? "rgba(93,187,106,.15)" : "rgba(255,255,255,.7)", border: "1px solid var(--color-line)", color: copied ? "#2a6e36" : "var(--color-ink-2)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" });
const pill: React.CSSProperties = { display: "inline-block", padding: "4px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 500, background: "var(--color-cream-3)", color: "var(--color-ink-2)" };
const preBlock: React.CSSProperties = { background: "#fff", border: "1px solid var(--color-line)", borderRadius: 12, padding: "14px 16px", margin: "0 0 8px", fontFamily: "inherit", fontSize: 13.5, lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--color-ink)" };
