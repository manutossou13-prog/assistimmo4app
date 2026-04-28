"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { runOscarAction, type OscarActionResult } from "./actions";

const AGENT_LABELS: Record<string, { name: string; role: string; color: string; emoji: string; anchor: string }> = {
  oscar: { name: "OSCAR", role: "Orchestrateur", color: "linear-gradient(135deg,#1B2A4E,#0f1a36)", emoji: "🎯", anchor: "" },
  tom: { name: "Tom", role: "Enquêteur mandat", color: "linear-gradient(135deg,#5BC0BE,#3a9c9a)", emoji: "🔍", anchor: "tom" },
  nora: { name: "Nora", role: "Mandats", color: "linear-gradient(135deg,#9B6BFF,#6a3fcf)", emoji: "📜", anchor: "nora" },
  sarah: { name: "Sarah", role: "Copywriter", color: "linear-gradient(135deg,#E94F8A,#b13668)", emoji: "✍️", anchor: "sarah" },
  emma: { name: "Emma", role: "Présentations", color: "linear-gradient(135deg,#F59E5B,#c47533)", emoji: "🎬", anchor: "emma" },
  stella: { name: "Stella", role: "Réseaux sociaux", color: "linear-gradient(135deg,#F0C44A,#c69b22)", emoji: "📱", anchor: "stella" },
  lea: { name: "Léa", role: "Comptes rendus", color: "linear-gradient(135deg,#A55BE0,#7a3fb0)", emoji: "🎙", anchor: "lea" },
  franck: { name: "Franck", role: "Vidéaste IA", color: "linear-gradient(135deg,#2FB8A4,#1f8a78)", emoji: "📹", anchor: "franck" },
  gabriel: { name: "Gabriel", role: "Pilote financier", color: "linear-gradient(135deg,#5681E0,#3258ad)", emoji: "💰", anchor: "gabriel" },
  ines: { name: "Inès", role: "Recrutement", color: "linear-gradient(135deg,#E25C7A,#b13a55)", emoji: "👤", anchor: "ines" },
  hugo: { name: "Hugo", role: "Manager KPI", color: "linear-gradient(135deg,#5DBB6A,#3a8e47)", emoji: "📊", anchor: "hugo" },
};

const SUGGESTIONS = [
  "Trouve l'adresse d'une maison à Drancy 95m² DPE D vendue 449k€",
  "Génère un mandat exclusif pour M. Dupont, 449k€ honoraires 5% vendeur, 3 mois",
  "Écris un courrier de boîtage pour le 15e arrondissement, ton chaleureux",
  "Comment va l'agence ce mois ?",
  "Pitch vendeur pour un mandat exclu lundi matin",
];

export function OscarChat() {
  const [state, formAction] = useActionState<OscarActionResult | null, FormData>(
    runOscarAction,
    null
  );

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0C0C0C 0%, #13182b 50%, #0C0C0C 100%)",
        borderRadius: 24,
        padding: 32,
        marginBottom: 28,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 30px 80px rgba(12,12,12,.18)",
      }}
    >
      {/* Halo */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: -120,
          top: -120,
          width: 360,
          height: 360,
          background: "radial-gradient(closest-side, rgba(197,169,121,.20), transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <span
            aria-hidden
            style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              background: "linear-gradient(135deg,#C5A979,#9B8A72)",
              color: "#0C0C0C",
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
              fontSize: 18,
              fontFamily: "var(--font-display)",
              boxShadow: "0 0 0 2px rgba(197,169,121,.2), 0 0 0 14px rgba(197,169,121,.06)",
            }}
          >
            O
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "#C5A979", marginBottom: 3 }}>
              ORCHESTRATEUR · ASSISTIMMO OS
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, margin: 0, color: "#F5F2E9", lineHeight: 1.1 }}>
              Que voulez-vous faire ?
            </h2>
            <p style={{ margin: "6px 0 0", color: "rgba(245,242,233,.65)", fontSize: 13.5 }}>
              Décrivez votre besoin en français. OSCAR identifie le bon agent et pré-remplit son formulaire.
            </p>
          </div>
        </div>

        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <textarea
            name="message"
            required
            rows={2}
            placeholder="Ex: Trouve l'adresse d'une maison Drancy 95m² DPE D 449k€ · Écris un courrier vendeur · Génère un mandat exclu · Comment va l'agence ?"
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid rgba(245,242,233,.15)",
              background: "rgba(245,242,233,.06)",
              fontSize: 14,
              fontFamily: "inherit",
              color: "#F5F2E9",
              outline: "none",
              resize: "vertical",
              lineHeight: 1.55,
              minHeight: 60,
            }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <SubmitButton />
            <span style={{ fontSize: 11, color: "rgba(245,242,233,.4)", alignSelf: "center", marginLeft: 6 }}>
              ou cliquez une suggestion :
            </span>
            {SUGGESTIONS.map((s, i) => (
              <SuggestionChip key={i} text={s} />
            ))}
          </div>
        </form>

        {state && state.ok === false && (
          <div style={{ marginTop: 18, padding: "12px 16px", borderRadius: 12, background: "rgba(255,180,180,.12)", border: "1px solid rgba(255,180,180,.3)", color: "#ffd9d9", fontSize: 13 }}>
            {state.error}
          </div>
        )}

        {state && state.ok && <PlanCard result={state.result} />}
      </div>
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
        padding: "12px 22px",
        borderRadius: 999,
        background: pending ? "rgba(245,242,233,.2)" : "#F5F2E9",
        color: pending ? "rgba(12,12,12,.5)" : "#0C0C0C",
        border: "none",
        fontWeight: 600,
        fontSize: 14,
        cursor: pending ? "not-allowed" : "pointer",
        opacity: pending ? 0.7 : 1,
        fontFamily: "inherit",
      }}
    >
      {pending ? "OSCAR analyse… (≈ 2 s)" : "Demander à OSCAR →"}
    </button>
  );
}

function SuggestionChip({ text }: { text: string }) {
  return (
    <button
      type="submit"
      name="message"
      value={text}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        background: "rgba(245,242,233,.06)",
        border: "1px solid rgba(245,242,233,.15)",
        color: "rgba(245,242,233,.75)",
        fontSize: 11.5,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {text}
    </button>
  );
}

function PlanCard({ result }: { result: OscarActionResult & { ok: true } extends infer U ? (U extends { result: infer R } ? R : never) : never }) {
  const target = AGENT_LABELS[result.plan.agent] ?? AGENT_LABELS.oscar;
  const filled = Object.entries(result.plan.filled_inputs ?? {});

  return (
    <div
      style={{
        marginTop: 22,
        padding: 22,
        borderRadius: 18,
        background: "rgba(245,242,233,.04)",
        border: "1px solid rgba(245,242,233,.1)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: ".18em", textTransform: "uppercase", color: "#C5A979", marginBottom: 6 }}>
          Compréhension
        </div>
        <p style={{ margin: 0, color: "#F5F2E9", fontSize: 14, lineHeight: 1.55 }}>{result.understanding}</p>
      </div>

      {/* Plan card */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, background: "rgba(245,242,233,.06)", borderRadius: 14, border: "1px solid rgba(245,242,233,.12)", marginBottom: 14 }}>
        <span aria-hidden style={{
          width: 44,
          height: 44,
          borderRadius: 999,
          background: target.color,
          color: "#fff",
          display: "grid",
          placeItems: "center",
          fontWeight: 700,
          fontSize: 16,
          flexShrink: 0,
        }}>
          {target.name.slice(0, 2).toUpperCase()}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "#F5F2E9", lineHeight: 1.1 }}>
            {target.emoji} {target.name} · <span style={{ color: "rgba(245,242,233,.6)", fontSize: 14 }}>{target.role}</span>
          </div>
          <div style={{ fontSize: 12.5, color: "rgba(245,242,233,.7)", marginTop: 4, lineHeight: 1.5 }}>
            {result.plan.rationale}
          </div>
        </div>
        {target.anchor && (
          <a
            href={`#${target.anchor}`}
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              background: "#F5F2E9",
              color: "#0C0C0C",
              fontWeight: 500,
              fontSize: 13,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Aller au formulaire →
          </a>
        )}
      </div>

      {filled.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: ".18em", textTransform: "uppercase", color: "#C5A979", marginBottom: 6 }}>
            Champs pré-remplis ({filled.length})
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 6 }}>
            {filled.map(([k, v]) => (
              <div key={k} style={{ background: "rgba(245,242,233,.05)", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(245,242,233,.1)" }}>
                <div style={{ fontSize: 10, color: "rgba(245,242,233,.5)", letterSpacing: ".06em", textTransform: "uppercase" }}>{k}</div>
                <div style={{ fontSize: 12.5, color: "#F5F2E9", marginTop: 2, fontFamily: typeof v === "number" ? "var(--font-mono)" : "inherit" }}>
                  {formatValue(v)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.plan.missing_fields.length > 0 && (
        <div style={{ marginBottom: 14, padding: 12, background: "rgba(240,196,74,.08)", border: "1px solid rgba(240,196,74,.25)", borderRadius: 10 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: ".18em", textTransform: "uppercase", color: "#F0C44A", marginBottom: 6 }}>
            ⚠ Champs manquants à compléter
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {result.plan.missing_fields.map((f, i) => (
              <span key={i} style={{ display: "inline-block", padding: "3px 8px", borderRadius: 999, background: "rgba(240,196,74,.15)", color: "#F0C44A", fontSize: 11, fontFamily: "var(--font-mono)" }}>
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.plan.alternative_agents.length > 0 && (
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(245,242,233,.4)", marginBottom: 6 }}>
            Autres agents pertinents
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {result.plan.alternative_agents.map((slug, i) => {
              const a = AGENT_LABELS[slug];
              if (!a) return null;
              return (
                <a
                  key={i}
                  href={`#${a.anchor}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 11px",
                    borderRadius: 999,
                    background: "rgba(245,242,233,.06)",
                    border: "1px solid rgba(245,242,233,.15)",
                    color: "rgba(245,242,233,.75)",
                    fontSize: 11.5,
                    textDecoration: "none",
                  }}
                >
                  {a.emoji} {a.name}
                </a>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 10.5, color: "rgba(245,242,233,.4)", fontFamily: "var(--font-mono)" }}>
        Routing OSCAR en {(result.meta.duration_ms / 1000).toFixed(1)}s · Claude Haiku
      </div>
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.length > 80 ? v.slice(0, 77) + "…" : v;
  if (typeof v === "number") return v.toLocaleString("fr-FR");
  if (typeof v === "boolean") return v ? "oui" : "non";
  if (Array.isArray(v)) return `[${v.length} item${v.length > 1 ? "s" : ""}]`;
  if (typeof v === "object") return JSON.stringify(v).slice(0, 80) + "…";
  return String(v);
}
