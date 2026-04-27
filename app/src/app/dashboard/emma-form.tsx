"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { generatePresentationAction, type EmmaActionResult } from "./actions";

export function EmmaForm() {
  const [state, formAction] = useActionState<EmmaActionResult | null, FormData>(
    generatePresentationAction,
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
            background: "linear-gradient(135deg,#F59E5B,#c47533)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          E
        </span>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: 0 }}>Emma · Présentations & pitch</h2>
          <p style={{ fontSize: 12, color: "var(--color-muted)", margin: 0, marginTop: 2 }}>
            Slides structurés + notes orateur + prompts visuels — exportable Markdown / Canva / Gamma.
          </p>
        </div>
      </div>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field
          label="Sujet"
          name="topic"
          required
          placeholder="Ex: Pitch mandat exclusif maison Drancy 95m²"
          rows={1}
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <Select label="Audience" name="audience" defaultValue="vendeur">
            <option value="vendeur">Vendeur particulier</option>
            <option value="acheteur">Acheteur</option>
            <option value="equipe">Équipe interne</option>
            <option value="investisseur">Investisseur</option>
            <option value="candidat">Candidat recrutement</option>
            <option value="client_particulier">Client particulier</option>
            <option value="formation">Formation</option>
          </Select>
          <Select label="Objectif" name="objective" defaultValue="obtenir_mandat">
            <option value="obtenir_mandat">Obtenir un mandat</option>
            <option value="valoriser_estimation">Valoriser estimation</option>
            <option value="presenter_services">Présenter services</option>
            <option value="reunion_kpi">Réunion KPI</option>
            <option value="pitch_recrutement">Pitch recrutement</option>
            <option value="pitch_investisseur">Pitch investisseur</option>
            <option value="formation_interne">Formation interne</option>
          </Select>
          <Select label="Ton" name="tone" defaultValue="premium">
            <option value="formel">Formel</option>
            <option value="chaleureux">Chaleureux</option>
            <option value="expert">Expert</option>
            <option value="premium">Premium</option>
            <option value="pedagogique">Pédagogique</option>
          </Select>
          <Select label="Durée (min)" name="duration_minutes" defaultValue="10">
            <option value="5">5 min</option>
            <option value="10">10 min</option>
            <option value="15">15 min</option>
            <option value="20">20 min</option>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
          </Select>
        </div>

        <Field
          label="Contexte (données disponibles, message clé, contraintes)"
          name="context"
          required
          placeholder="Ex: Maison 4 pièces 95m² à Drancy, vendeur âgé envisage maison de retraite, mandat expiré chez Foncia. Ton patrimonial, mettre en avant notre méthode et notre track record."
          rows={4}
          hint="Plus tu donnes de détails (faits, chiffres, atouts), plus Emma personnalise."
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
      {pending ? "Emma rédige le deck… (≈ 15 s)" : "Lancer Emma →"}
    </button>
  );
}

function ResultPanel({ state }: { state: Extract<EmmaActionResult, { ok: true }> }) {
  const { result, markdown, document_id } = state;
  const [copied, setCopied] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const slide = result.slides[activeSlide];

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
        <span style={pill}>{result.framework}</span>
        <span style={pill}>{result.slide_count} slide{result.slide_count > 1 ? "s" : ""}</span>
        <span style={pill}>{result.total_duration_minutes} min</span>
        <span style={pill}>{(result.meta.duration_ms / 1000).toFixed(1)} s</span>
        {document_id && <span style={{ ...pill, background: "rgba(93,187,106,.15)" }}>Sauvegardé en base</span>}
        <button
          type="button"
          onClick={copyMarkdown}
          style={{
            marginLeft: "auto",
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
          {copied ? "✓ Markdown copié" : "Copier markdown (Canva/Gamma)"}
        </button>
      </div>

      {/* Navigation slides */}
      <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 8, marginBottom: 14, borderBottom: "1px solid var(--color-line)" }}>
        {result.slides.map((s, i) => (
          <button
            key={s.number}
            type="button"
            onClick={() => setActiveSlide(i)}
            style={{
              padding: "8px 14px",
              border: "none",
              background: i === activeSlide ? "var(--color-ink)" : "rgba(255,255,255,.7)",
              color: i === activeSlide ? "var(--color-cream)" : "var(--color-ink-2)",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
          >
            #{s.number}
          </button>
        ))}
      </div>

      {/* Slide active */}
      {slide && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: 0, lineHeight: 1.2 }}>
              {slide.title}
            </h3>
            <span style={{ fontSize: 11, color: "var(--color-muted)", whiteSpace: "nowrap" }}>
              Slide {slide.number} · {slide.duration_seconds}s
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 12, fontStyle: "italic" }}>
            Layout : {slide.layout}
          </div>

          <div style={{ background: "#fff", border: "1px solid var(--color-line)", borderRadius: 12, padding: 18, marginBottom: 12 }}>
            {slide.body.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7 }}>
                {slide.body.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            ) : (
              <p style={{ margin: 0, fontSize: 14, color: "var(--color-muted)", fontStyle: "italic" }}>Slide visuelle (pas de texte)</p>
            )}
          </div>

          {slide.visual_prompt && (
            <div style={{ background: "rgba(197,169,121,.10)", border: "1px solid rgba(197,169,121,.3)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
              <SectionTitle>Prompt visuel</SectionTitle>
              <code style={{ fontSize: 12, color: "var(--color-taupe-d)", fontFamily: "var(--font-mono)" }}>
                {slide.visual_prompt}
              </code>
            </div>
          )}

          {slide.speaker_notes && (
            <div style={{ background: "rgba(27,42,78,.06)", border: "1px solid rgba(27,42,78,.15)", borderRadius: 12, padding: 12 }}>
              <SectionTitle>🎤 Notes orateur</SectionTitle>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}>{slide.speaker_notes}</p>
            </div>
          )}
        </div>
      )}

      {result.oral_pitch && (
        <div style={{ marginTop: 22, padding: 16, background: "linear-gradient(135deg, rgba(245,158,91,.08), rgba(197,169,121,.10))", borderRadius: 12, border: "1px solid rgba(245,158,91,.25)" }}>
          <SectionTitle>Pitch oral 60 secondes</SectionTitle>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, fontStyle: "italic" }}>{result.oral_pitch}</p>
        </div>
      )}

      {result.canva_export_hints.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <SectionTitle>Conseils export Canva / Gamma</SectionTitle>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6 }}>
            {result.canva_export_hints.map((h, i) => <li key={i}>{h}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      style={{
        marginTop: 18,
        padding: "12px 16px",
        borderRadius: 12,
        background: "rgba(177,56,24,.08)",
        border: "1px solid rgba(177,56,24,.25)",
        color: "#7d2811",
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
  rows = 3,
  hint,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  hint?: string;
}) {
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
    <h3
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        letterSpacing: ".18em",
        textTransform: "uppercase",
        color: "var(--color-taupe)",
        margin: "0 0 8px",
      }}
    >
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
