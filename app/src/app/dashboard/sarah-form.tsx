"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { generateContentAction, type SarahActionResult } from "./actions";

export function SarahForm() {
  const [state, formAction] = useActionState<SarahActionResult | null, FormData>(
    generateContentAction,
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
            background: "linear-gradient(135deg,#E94F8A,#b13668)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          S
        </span>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: 0 }}>Sarah · Copywriter terrain</h2>
          <p style={{ fontSize: 12, color: "var(--color-muted)", margin: 0, marginTop: 2 }}>
            Courriers, e-mails, SMS, scripts d&apos;appel — multi-canal, multi-tonalité, prêts à envoyer.
          </p>
        </div>
      </div>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <Select label="Canal" name="channel" defaultValue="courrier">
            <option value="courrier">📬 Courrier postal</option>
            <option value="email">✉️ E-mail</option>
            <option value="sms">📱 SMS</option>
            <option value="whatsapp">💬 WhatsApp</option>
            <option value="linkedin">💼 LinkedIn DM</option>
            <option value="appel">📞 Script d&apos;appel</option>
          </Select>
          <Select label="Ton" name="tone" defaultValue="direct">
            <option value="direct">Direct</option>
            <option value="chaleureux">Chaleureux</option>
            <option value="expert">Expert</option>
            <option value="premium">Premium</option>
            <option value="familial">Familial</option>
          </Select>
          <Select label="Objectif" name="objective" defaultValue="obtenir_estimation">
            <option value="obtenir_estimation">Obtenir une estimation</option>
            <option value="obtenir_mandat">Obtenir un mandat</option>
            <option value="relance_post_estimation">Relance post-estimation</option>
            <option value="relance_mandat_expire">Relance mandat expiré</option>
            <option value="reprise_ancien_client">Reprise ancien client</option>
            <option value="remerciement">Remerciement</option>
            <option value="confirmation_rdv">Confirmation rdv</option>
          </Select>
        </div>

        <Field
          label="Contexte"
          name="context"
          required
          placeholder="Ex: Maison 4 pièces 95m² rue de la République à Drancy, vendeur âgé envisage la maison de retraite, mandat ouvert chez Foncia depuis 4 mois sans visite."
          rows={4}
          hint="Plus tu donnes de détails, plus Sarah peut personnaliser."
        />
        <Field
          label="Call-to-action souhaité (optionnel)"
          name="cta"
          placeholder="Ex: rappel téléphonique cette semaine, rdv samedi matin, lien Calendly…"
          rows={1}
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
      {pending ? "Sarah rédige… (≈ 8 s)" : "Lancer Sarah →"}
    </button>
  );
}

function ResultPanel({ state }: { state: Extract<SarahActionResult, { ok: true }> }) {
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
        <span style={pill}>{result.tone}</span>
        <span style={pill}>{(result.meta.duration_ms / 1000).toFixed(1)} s</span>
        <span style={{ ...pill, background: "rgba(93,187,106,.15)" }}>
          {document_ids.length} document{document_ids.length > 1 ? "s" : ""} enregistré{document_ids.length > 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--color-line)", marginBottom: 14, flexWrap: "wrap" }}>
        {result.messages.map((m, i) => (
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
            {m.label} <small style={{ opacity: 0.6 }}>· {m.word_count} mots</small>
          </button>
        ))}
      </div>

      <MessageView message={result.messages[activeTab]} />

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

      {result.follow_up_sequence && result.follow_up_sequence.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <SectionTitle>Séquence de relance recommandée</SectionTitle>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
            {result.follow_up_sequence.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MessageView({ message }: { message: { label: string; subject?: string; body: string; word_count: number } }) {
  const [copied, setCopied] = useState(false);

  async function copyToClipboard() {
    try {
      const text = message.subject ? `Objet : ${message.subject}\n\n${message.body}` : message.body;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      {message.subject && (
        <div style={{ marginBottom: 10 }}>
          <SectionTitle>Objet</SectionTitle>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{message.subject}</p>
        </div>
      )}
      <SectionTitle>Corps</SectionTitle>
      <pre
        style={{
          background: "#fff",
          border: "1px solid var(--color-line)",
          borderRadius: 12,
          padding: "14px 16px",
          margin: 0,
          fontFamily: "inherit",
          fontSize: 13.5,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          color: "var(--color-ink)",
        }}
      >
        {message.body}
      </pre>
      <button
        type="button"
        onClick={copyToClipboard}
        style={{
          marginTop: 10,
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
        {copied ? "✓ Copié dans le presse-papier" : "Copier le contenu"}
      </button>
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
