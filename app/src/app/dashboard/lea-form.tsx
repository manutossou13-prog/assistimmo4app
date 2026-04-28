"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { generateMeetingReportAction, type LeaActionResult } from "./actions";
import { AudioRecorder } from "./audio-recorder";

export function LeaForm() {
  const [state, formAction] = useActionState<LeaActionResult | null, FormData>(
    generateMeetingReportAction,
    null
  );
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function appendTranscript(text: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const sep = ta.value.trim() ? "\n\n" : "";
    ta.value = `${ta.value}${sep}${text}`;
    ta.scrollTop = ta.scrollHeight;
    ta.focus();
  }

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
            background: "linear-gradient(135deg,#A55BE0,#7a3fb0)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          L
        </span>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: 0 }}>Léa · Comptes rendus</h2>
          <p style={{ fontSize: 12, color: "var(--color-muted)", margin: 0, marginTop: 2 }}>
            Tes notes brutes ou un transcript → compte rendu structuré + email retour client + tâches.
          </p>
        </div>
      </div>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Select label="Type de RDV" name="meeting_kind" defaultValue="visit_buyer">
            <option value="visit_buyer">Visite acheteur</option>
            <option value="visit_seller">Visite vendeur / suivi mandat</option>
            <option value="estimation">RDV d&apos;estimation</option>
            <option value="negotiation">Négociation</option>
            <option value="client_call">Appel client</option>
            <option value="team">Réunion équipe</option>
          </Select>
          <Input
            label="Participants"
            name="participants"
            required
            placeholder="M. et Mme Martin (acheteurs), Marie L. (négo)"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input
            label="Bien concerné (optionnel)"
            name="property_context"
            placeholder="12 rue de l&apos;Église, 690k€, mandat exclusif"
          />
          <Input
            label="Objectif du RDV (optionnel)"
            name="objective"
            placeholder="Obtenir une offre · Valider le prix · Signer mandat"
          />
        </div>

        <AudioRecorder onTranscript={appendTranscript} />

        <TextareaRef
          ref={textareaRef}
          label="Notes brutes / transcript (édite après transcription si besoin)"
          name="raw"
          required
          rows={8}
          placeholder="Tape tes notes ici, ou enregistre ton audio juste au-dessus — Whisper le transcrit et l'ajoute automatiquement.

Pas besoin d'être propre, écris comme tu parles."
          hint="Plus c'est complet, plus le CR est riche."
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
      {pending ? "Léa structure le CR… (≈ 12 s)" : "Lancer Léa →"}
    </button>
  );
}

function ResultPanel({ state }: { state: Extract<LeaActionResult, { ok: true }> }) {
  const { result, document_id, meeting_report_id } = state;
  const [tab, setTab] = useState<"summary" | "email">("summary");
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(result.client_email_draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {/* ignore */}
  }

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
        <span style={pill}>{result.tasks.length} tâche{result.tasks.length > 1 ? "s" : ""}</span>
        <span style={pill}>{result.key_points.length} points clés</span>
        {result.vigilance.length > 0 && (
          <span style={{ ...pill, background: "rgba(177,56,24,.10)", color: "#7d2811" }}>
            ⚠ {result.vigilance.length} vigilance
          </span>
        )}
        <span style={pill}>{(result.meta.duration_ms / 1000).toFixed(1)} s</span>
        {meeting_report_id && (
          <span style={{ ...pill, background: "rgba(93,187,106,.15)" }}>CR sauvegardé</span>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--color-line)", marginBottom: 14 }}>
        <TabBtn active={tab === "summary"} onClick={() => setTab("summary")}>
          Compte rendu
        </TabBtn>
        <TabBtn active={tab === "email"} onClick={() => setTab("email")}>
          Email retour client
        </TabBtn>
      </div>

      {tab === "summary" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Section title="Contexte" body={result.context} />
          {result.key_points.length > 0 && <BulletList title="Points clés" items={result.key_points} />}
          {result.intentions.length > 0 && <BulletList title="Intentions" items={result.intentions} accent="green" />}
          {result.objections.length > 0 && <BulletList title="Objections" items={result.objections} accent="orange" />}
          {result.engagements.length > 0 && <BulletList title="Engagements" items={result.engagements} />}
          {result.vigilance.length > 0 && <BulletList title="Points de vigilance" items={result.vigilance} accent="red" />}
          {result.tasks.length > 0 && (
            <div>
              <SectionTitle>Tâches créées</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {result.tasks.map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "8px 12px", background: "#fff", border: "1px solid var(--color-line)", borderRadius: 10 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, border: "1.5px solid var(--color-taupe)", marginTop: 3 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{t.title}</div>
                      <div style={{ fontSize: 11.5, color: "var(--color-muted)" }}>
                        {t.assignee} · {t.due_when}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.next_meeting && (
            <Section title="Prochain rendez-vous suggéré" body={result.next_meeting} />
          )}
          <Section title="Synthèse interne (CRM)" body={result.internal_summary} />
        </div>
      ) : (
        <div>
          <pre style={{
            background: "#fff",
            border: "1px solid var(--color-line)",
            borderRadius: 12,
            padding: "16px 18px",
            margin: 0,
            fontFamily: "inherit",
            fontSize: 13.5,
            lineHeight: 1.65,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: "var(--color-ink)",
          }}>
            {result.client_email_draft}
          </pre>
          <button
            type="button"
            onClick={copyEmail}
            style={{
              marginTop: 12,
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
            {copied ? "✓ Email copié" : "Copier l'email"}
          </button>
          <p style={{ marginTop: 14, fontSize: 11, color: "var(--color-muted)", fontStyle: "italic" }}>
            ⚠️ Léa propose le draft. Relis et envoie-le toi-même depuis ta messagerie.
          </p>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "9px 14px",
        border: "none",
        background: "transparent",
        fontSize: 13,
        fontWeight: 500,
        color: active ? "var(--color-ink)" : "var(--color-muted)",
        borderBottom: active ? "2px solid var(--color-ink)" : "2px solid transparent",
        marginBottom: -1,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  if (!body) return null;
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "var(--color-ink-2)" }}>{body}</p>
    </div>
  );
}

function BulletList({ title, items, accent }: { title: string; items: string[]; accent?: "green" | "orange" | "red" }) {
  const color = accent === "green" ? "#2a6e36" : accent === "orange" ? "#7d5e08" : accent === "red" ? "#7d2811" : "var(--color-taupe)";
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, lineHeight: 1.65 }}>
        {items.map((it, i) => (
          <li key={i} style={{ color: "var(--color-ink-2)" }}>
            <span style={{ color, marginRight: 4 }}>•</span> {it}
          </li>
        ))}
      </ul>
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

function Input({ label, name, required, placeholder }: { label: string; name: string; required?: boolean; placeholder?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11.5, color: "var(--color-muted)", fontWeight: 500 }}>{label}</span>
      <input
        name={name}
        type="text"
        required={required}
        placeholder={placeholder}
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid var(--color-line)",
          background: "#fff",
          fontSize: 13.5,
          fontFamily: "inherit",
          color: "var(--color-ink)",
          outline: "none",
        }}
      />
    </label>
  );
}

type TextareaProps = { label: string; name: string; rows?: number; placeholder?: string; hint?: string; required?: boolean };

const TextareaRef = function TextareaRefInner(
  { label, name, rows = 3, placeholder, hint, required, ref }: TextareaProps & { ref?: React.RefObject<HTMLTextAreaElement | null> }
) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11.5, color: "var(--color-muted)", fontWeight: 500 }}>{label}</span>
      <textarea
        ref={ref}
        name={name}
        rows={rows}
        required={required}
        placeholder={placeholder}
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
          lineHeight: 1.55,
        }}
      />
      {hint && <span style={{ fontSize: 10.5, color: "var(--color-muted)", marginTop: 1 }}>{hint}</span>}
    </label>
  );
};

function Select({ label, name, defaultValue, children }: { label: string; name: string; defaultValue: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11.5, color: "var(--color-muted)", fontWeight: 500 }}>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        style={{
          padding: "10px 12px",
          borderRadius: 10,
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
