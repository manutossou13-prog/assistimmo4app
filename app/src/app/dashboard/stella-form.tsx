"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { generateSocialAction, type StellaActionResult } from "./actions";

export function StellaForm() {
  const [state, formAction] = useActionState<StellaActionResult | null, FormData>(
    generateSocialAction,
    null
  );

  return (
    <div
      style={{
        background: "rgba(255,255,255,.65)",
        border: "1px solid var(--color-line)",
        borderRadius: 24,
        padding: 28,
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <span
          aria-hidden
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: "linear-gradient(135deg,#F0C44A,#c69b22)",
            color: "#3a2e10",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          St
        </span>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: 0 }}>Stella · Réseaux sociaux</h2>
          <p style={{ fontSize: 12, color: "var(--color-muted)", margin: 0, marginTop: 2 }}>
            Posts LinkedIn / Insta / Facebook / TikTok / YouTube Shorts — hooks, hashtags, prompts visuels.
          </p>
        </div>
      </div>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field
          label="Sujet"
          name="topic"
          required
          placeholder="Ex: Pavillon vendu à Drancy en 23 jours · 3 visites · pas de négo"
          rows={1}
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <Select label="Canal" name="channel" defaultValue="linkedin">
            <option value="linkedin">LinkedIn</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube_short">YouTube Shorts</option>
          </Select>
          <Select label="Format" name="format" defaultValue="post">
            <option value="post">Post simple</option>
            <option value="carrousel">Carrousel</option>
            <option value="reel">Reel</option>
            <option value="story">Story</option>
          </Select>
          <Select label="Ton" name="tone" defaultValue="chaleureux">
            <option value="expert">Expert</option>
            <option value="chaleureux">Chaleureux</option>
            <option value="punchy">Punchy</option>
            <option value="premium">Premium</option>
            <option value="pedagogique">Pédagogique</option>
          </Select>
          <Select label="Objectif" name="objective" defaultValue="valoriser_bien">
            <option value="valoriser_bien">Valoriser un bien</option>
            <option value="valoriser_mandat_signe">Mandat signé</option>
            <option value="valoriser_vente">Bien vendu</option>
            <option value="estimation_gratuite">Estimation gratuite</option>
            <option value="recrutement">Recrutement</option>
            <option value="pedagogie_dpe">Pédagogie DPE</option>
            <option value="actu_marche">Actu marché</option>
            <option value="coulisses_agence">Coulisses agence</option>
            <option value="temoignage_client">Témoignage client</option>
          </Select>
        </div>

        <Field
          label="Contexte"
          name="context"
          required
          placeholder="Ex: Pavillon 95m² + 200m² de terrain Petit Drancy, mandat exclusif rentré le 12 mars, 3 visites, vendu 449k€ (prix affiché 459k€), acheteurs primo-accédants couple 32 ans. Cible : autres vendeurs Petit Drancy, ton chaleureux, pas vantard."
          rows={4}
          hint="Plus tu donnes de contexte, plus le post est personnalisé et utile."
        />

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
    <button
      type="submit"
      disabled={pending}
      style={{
        alignSelf: "flex-start",
        padding: "12px 22px",
        borderRadius: 999,
        background: pending ? "var(--color-muted)" : "var(--color-ink)",
        color: "var(--color-cream)",
        border: "none",
        fontWeight: 500,
        fontSize: 14,
        cursor: pending ? "not-allowed" : "pointer",
        opacity: pending ? 0.7 : 1,
        boxShadow: "0 14px 32px rgba(12,12,12,.18)",
      }}
    >
      {pending ? "Stella rédige… (≈ 10 s)" : "Lancer Stella →"}
    </button>
  );
}

function ResultPanel({ state }: { state: Extract<StellaActionResult, { ok: true }> }) {
  const { result, document_ids } = state;
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div
      style={{
        marginTop: 22,
        padding: 22,
        borderRadius: 18,
        background: "linear-gradient(135deg, var(--color-cream-2), #fff)",
        border: "1px solid var(--color-line)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <span style={pill}>Framework {result.framework}</span>
        <span style={pill}>{result.channel}</span>
        <span style={pill}>{result.format}</span>
        <span style={pill}>{(result.meta.duration_ms / 1000).toFixed(1)} s</span>
        <span style={{ ...pill, background: "rgba(93,187,106,.15)" }}>{document_ids.length} sauvegardé{document_ids.length > 1 ? "s" : ""}</span>
        {result.best_publish_time && <span style={pill}>⏰ {result.best_publish_time}</span>}
      </div>

      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--color-line)", marginBottom: 14 }}>
        {result.posts.map((p, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            style={{
              padding: "9px 14px",
              border: "none",
              background: "transparent",
              fontSize: 13,
              fontWeight: 500,
              color: i === activeTab ? "var(--color-ink)" : "var(--color-muted)",
              borderBottom: i === activeTab ? "2px solid var(--color-ink)" : "2px solid transparent",
              marginBottom: -1,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            type="button"
          >
            Variante {i + 1} <small style={{ opacity: 0.6 }}>· {p.word_count} mots</small>
          </button>
        ))}
      </div>

      <PostView post={result.posts[activeTab]} />

      {result.legal_notice && (
        <div
          style={{
            marginTop: 16,
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(240,196,74,.12)",
            border: "1px solid rgba(240,196,74,.3)",
            color: "#7d5e08",
            fontSize: 12.5,
          }}
        >
          ⚖️ {result.legal_notice}
        </div>
      )}
    </div>
  );
}

function PostView({ post }: { post: { hook: string; body: string; cta: string; hashtags: string[]; visual_prompt: string | null; carrousel_slides?: { title: string; body: string }[] } }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      const fullText = [post.hook, "", post.body, "", post.cta, "", post.hashtags.join(" ")].join("\n");
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <SectionTitle>Hook</SectionTitle>
      <p style={{ margin: "0 0 14px", fontSize: 16, fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>
        {post.hook}
      </p>

      <SectionTitle>Corps</SectionTitle>
      <pre
        style={{
          background: "#fff",
          border: "1px solid var(--color-line)",
          borderRadius: 12,
          padding: "14px 16px",
          margin: "0 0 12px",
          fontFamily: "inherit",
          fontSize: 13.5,
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          color: "var(--color-ink)",
        }}
      >
        {post.body}
      </pre>

      {post.cta && (
        <>
          <SectionTitle>CTA</SectionTitle>
          <p style={{ margin: "0 0 14px", fontSize: 13.5, fontWeight: 500 }}>{post.cta}</p>
        </>
      )}

      {post.hashtags && post.hashtags.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <SectionTitle>Hashtags</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {post.hashtags.map((h, i) => (
              <span key={i} style={{ ...pill, fontSize: 11, background: "rgba(27,42,78,.06)", color: "var(--color-navy)" }}>
                {h}
              </span>
            ))}
          </div>
        </div>
      )}

      {post.visual_prompt && (
        <div style={{ marginBottom: 14, background: "rgba(197,169,121,.10)", border: "1px solid rgba(197,169,121,.3)", borderRadius: 12, padding: 12 }}>
          <SectionTitle>Prompt visuel</SectionTitle>
          <code style={{ fontSize: 12, color: "var(--color-taupe-d)", fontFamily: "var(--font-mono)" }}>
            {post.visual_prompt}
          </code>
        </div>
      )}

      {post.carrousel_slides && post.carrousel_slides.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <SectionTitle>Slides carrousel</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            {post.carrousel_slides.map((s, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid var(--color-line)", borderRadius: 12, padding: 12 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-taupe)", marginBottom: 6 }}>
                  SLIDE {i + 1}
                </div>
                <h4 style={{ fontFamily: "var(--font-display)", fontSize: 14, margin: "0 0 6px" }}>{s.title}</h4>
                <p style={{ margin: 0, fontSize: 12, color: "var(--color-ink-2)", lineHeight: 1.5 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={copy}
        style={{
          padding: "8px 14px",
          borderRadius: 999,
          background: copied ? "rgba(93,187,106,.15)" : "rgba(255,255,255,.7)",
          border: "1px solid var(--color-line)",
          color: copied ? "#2a6e36" : "var(--color-ink-2)",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        {copied ? "✓ Post copié" : "Copier hook + corps + CTA + hashtags"}
      </button>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{ marginTop: 18, padding: "12px 16px", borderRadius: 12, background: "rgba(177,56,24,.08)", border: "1px solid rgba(177,56,24,.25)", color: "#7d2811", fontSize: 13 }}>
      {message}
    </div>
  );
}

function Field({ label, name, required, placeholder, rows = 3, hint }: { label: string; name: string; required?: boolean; placeholder?: string; rows?: number; hint?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 12, color: "var(--color-muted)", fontWeight: 500 }}>{label}</span>
      <textarea
        name={name}
        required={required}
        placeholder={placeholder}
        rows={rows}
        style={{
          padding: "12px 14px",
          borderRadius: 12,
          border: "1px solid var(--color-line)",
          background: "#fff",
          fontSize: 13.5,
          fontFamily: "inherit",
          color: "var(--color-ink)",
          outline: "none",
          resize: "vertical",
        }}
      />
      {hint && <span style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2 }}>{hint}</span>}
    </label>
  );
}

function Select({ label, name, defaultValue, children }: { label: string; name: string; defaultValue: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 12, color: "var(--color-muted)", fontWeight: 500 }}>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        style={{
          padding: "11px 14px",
          borderRadius: 12,
          border: "1px solid var(--color-line)",
          background: "#fff",
          fontSize: 13.5,
          fontFamily: "inherit",
          color: "var(--color-ink)",
          outline: "none",
          appearance: "none",
          cursor: "pointer",
        }}
      >
        {children}
      </select>
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--color-taupe)", margin: "0 0 8px" }}>
      {children}
    </h3>
  );
}

const pill: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 11px",
  borderRadius: 999,
  fontSize: 11.5,
  fontWeight: 500,
  background: "var(--color-cream-3)",
  color: "var(--color-ink-2)",
};
