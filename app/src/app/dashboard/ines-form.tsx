"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { runInesAction, type InesActionResult } from "./actions";

export function InesForm() {
  const [state, formAction] = useActionState<InesActionResult | null, FormData>(
    runInesAction,
    null
  );
  const [mode, setMode] = useState<"fiche_poste" | "message_chasse" | "score_cv" | "kit_entretien">("fiche_poste");

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <span aria-hidden style={{ ...avatar, background: "linear-gradient(135deg,#E25C7A,#b13a55)" }}>I</span>
        <div>
          <h2 style={h2}>Inès · Recrutement immobilier</h2>
          <p style={pSub}>Fiches de poste, chasse LinkedIn, scoring CV, kits d&apos;entretien — anti-discrimination intégrée.</p>
        </div>
      </div>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Select
            label="Mode"
            name="mode"
            defaultValue="fiche_poste"
            onChange={(e) => setMode(e.target.value as typeof mode)}
          >
            <option value="fiche_poste">📋 Rédiger une fiche de poste</option>
            <option value="message_chasse">💼 Message LinkedIn / chasse</option>
            <option value="score_cv">📊 Scorer un CV</option>
            <option value="kit_entretien">🎯 Kit questions d&apos;entretien</option>
          </Select>
          <Input
            label="Intitulé du poste"
            name="job_title"
            required
            placeholder="Négociateur senior · Manager d'agence · Assistant commercial"
          />
        </div>

        <Textarea
          label="Brief / contexte"
          name="context"
          required
          rows={4}
          placeholder={
            mode === "fiche_poste"
              ? "Ex: Agence Drancy 5 négos · poste de négo senior 2-5 ans XP · CDI 28-35k brut + commissions · valeurs: autonomie, sens du collectif, exigence client. Process: 3 entretiens (RH 30 min, manager 1h, déjeuner équipe)."
              : mode === "message_chasse"
                ? "Ex: Cible un négociateur expérimenté en place chez un confrère. Argument: rejoindre une agence à taille humaine, mandat exclusif sur Petit Drancy, perspective d'évolution manager d'ici 18 mois. Ton chaleureux mais pro."
                : mode === "score_cv"
                  ? "Ex: Poste négo senior · expérience immo souhaitée 3 ans+ · zone Drancy/Bobigny · valeurs: autonomie, rigueur, écoute. Le brief sert à comparer le CV au profil idéal."
                  : "Ex: Entretien final négo senior · valeurs agence: autonomie + rigueur + esprit d'équipe · veux mises en situation prospection vendeur réticent et négociation prix."
          }
        />

        {mode === "score_cv" && (
          <Textarea
            label="Texte du CV à scorer"
            name="cv_text"
            rows={8}
            placeholder="Colle ici le contenu texte du CV (copier-coller depuis PDF). Inès en extrait les signaux et te retourne un score 0-100 + breakdown 5 critères + forces / points à creuser / red flags."
            hint="Tu peux ouvrir le PDF du candidat dans un onglet → tout sélectionner → coller ici."
          />
        )}

        {mode === "message_chasse" && (
          <Input
            label="URL profil candidat (optionnel)"
            name="candidate_url"
            placeholder="https://linkedin.com/in/..."
          />
        )}

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
      {pending ? "Inès rédige… (≈ 12 s)" : "Lancer Inès →"}
    </button>
  );
}

function ResultPanel({ state }: { state: Extract<InesActionResult, { ok: true }> }) {
  const { result, document_id, candidate_id } = state;
  const [copied, setCopied] = useState<string | null>(null);

  function copy(label: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    }).catch(() => {/* ignore */});
  }

  return (
    <div style={{ marginTop: 22, padding: 22, borderRadius: 18, background: "linear-gradient(135deg, var(--color-cream-2), #fff)", border: "1px solid var(--color-line)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <span style={pill}>Mode : {result.mode}</span>
        <span style={pill}>{(result.meta.duration_ms / 1000).toFixed(1)} s</span>
        {document_id && <span style={{ ...pill, background: "rgba(93,187,106,.15)" }}>Document sauvegardé</span>}
        {candidate_id && <span style={{ ...pill, background: "rgba(93,187,106,.15)" }}>Candidat enregistré</span>}
      </div>

      {result.legal_warnings.length > 0 && (
        <div style={{ marginBottom: 18, padding: 14, background: "rgba(177,56,24,.08)", border: "1px solid rgba(177,56,24,.25)", borderRadius: 12 }}>
          <SectionTitle>⚖️ Avertissements anti-discrimination</SectionTitle>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.55, color: "#7d2811" }}>
            {result.legal_warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Mode fiche_poste */}
      {result.job_post_md && (
        <div style={{ marginBottom: 18 }}>
          <SectionTitle>Fiche de poste complète</SectionTitle>
          <pre style={preBlock}>{result.job_post_md}</pre>
          <button type="button" onClick={() => copy("post", result.job_post_md!)} style={btnCopy(copied === "post")}>
            {copied === "post" ? "✓ Copié" : "Copier la fiche"}
          </button>
          {result.job_post_short && (
            <div style={{ marginTop: 14, padding: 12, background: "rgba(197,169,121,.08)", border: "1px solid rgba(197,169,121,.25)", borderRadius: 10 }}>
              <SectionTitle>Version courte (réseaux sociaux)</SectionTitle>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{result.job_post_short}</p>
            </div>
          )}
        </div>
      )}

      {/* Mode message_chasse */}
      {result.outreach_subject && (
        <div style={{ marginBottom: 18 }}>
          <SectionTitle>Objet</SectionTitle>
          <p style={{ margin: "0 0 12px", fontWeight: 600, fontSize: 15 }}>{result.outreach_subject}</p>
          <SectionTitle>Message</SectionTitle>
          <pre style={preBlock}>{result.outreach_body}</pre>
          <button type="button" onClick={() => copy("body", `Objet : ${result.outreach_subject}\n\n${result.outreach_body}`)} style={btnCopy(copied === "body")}>
            {copied === "body" ? "✓ Copié" : "Copier objet + message"}
          </button>
          {result.outreach_followups.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <SectionTitle>Séquence de relance</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {result.outreach_followups.map((f, i) => (
                  <div key={i} style={{ background: "#fff", border: "1px solid var(--color-line)", borderRadius: 10, padding: 12 }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-taupe)", marginBottom: 4 }}>
                      Relance {["J+3", "J+10", "J+30"][i] ?? `#${i + 1}`}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}>{f}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode score_cv */}
      {result.score_global !== null && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <div style={{
              width: 80, height: 80,
              borderRadius: 999,
              background: scoreColor(result.score_global),
              color: "#fff",
              display: "grid", placeItems: "center",
              fontFamily: "var(--font-display)",
              fontSize: 32,
            }}>
              {result.score_global}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>Score global</div>
              <div style={{ fontSize: 12.5, color: "var(--color-muted)" }}>
                {result.score_global >= 80 ? "Excellent fit, à rencontrer en priorité" :
                  result.score_global >= 65 ? "Bon profil, à rencontrer" :
                  result.score_global >= 50 ? "Profil moyen, à creuser" :
                  "Profil éloigné du brief"}
              </div>
            </div>
          </div>

          {result.score_breakdown && (
            <div style={{ marginBottom: 18 }}>
              <SectionTitle>Détail par critère</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
                {Object.entries(result.score_breakdown).map(([k, v]) => (
                  <div key={k} style={{ background: "#fff", border: "1px solid var(--color-line)", borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 10.5, color: "var(--color-muted)", letterSpacing: ".06em", textTransform: "uppercase" }}>
                      {k.replace(/_/g, " ")}
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 22, marginTop: 3 }}>{v as number}</div>
                    <div style={{ height: 4, background: "var(--color-cream-3)", borderRadius: 999, marginTop: 6, overflow: "hidden" }}>
                      <div style={{ width: `${v as number}%`, height: "100%", background: scoreColor(v as number) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            {result.strengths.length > 0 && (
              <BulletBox title="Forces" items={result.strengths} color="#2a6e36" />
            )}
            {result.to_explore.length > 0 && (
              <BulletBox title="À creuser" items={result.to_explore} color="#7d5e08" />
            )}
            {result.red_flags.length > 0 && (
              <BulletBox title="🚩 Red flags" items={result.red_flags} color="#7d2811" />
            )}
          </div>
        </div>
      )}

      {/* Mode kit_entretien */}
      {result.questions.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <SectionTitle>Questions d&apos;entretien · {result.questions.length}</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(["competences", "valeurs", "situation", "motivation"] as const).map((cat) => {
              const qs = result.questions.filter((q) => q.category === cat);
              if (qs.length === 0) return null;
              return (
                <div key={cat}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--color-taupe)", marginBottom: 6 }}>
                    {cat}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {qs.map((q, i) => (
                      <div key={i} style={{ background: "#fff", border: "1px solid var(--color-line)", borderRadius: 10, padding: 12 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{q.question}</p>
                        {q.expected_signals && q.expected_signals.length > 0 && (
                          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 5 }}>
                            {q.expected_signals.map((s, j) => (
                              <span key={j} style={{ ...pill, fontSize: 10.5, background: "rgba(93,187,106,.10)", color: "#2a6e36" }}>
                                ✓ {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {result.evaluation_grid && (
            <div style={{ marginTop: 16 }}>
              <SectionTitle>Grille d&apos;évaluation</SectionTitle>
              <pre style={preBlock}>{result.evaluation_grid}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function scoreColor(s: number): string {
  if (s >= 80) return "linear-gradient(135deg,#5DBB6A,#3a8e47)";
  if (s >= 65) return "linear-gradient(135deg,#F0C44A,#c69b22)";
  if (s >= 50) return "linear-gradient(135deg,#F59E5B,#c47533)";
  return "linear-gradient(135deg,#E25C7A,#b13a55)";
}

function BulletBox({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--color-line)", borderRadius: 12, padding: 14 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", color, marginBottom: 8 }}>
        {title}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.5 }}>
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return <div style={{ marginTop: 18, padding: "12px 16px", borderRadius: 12, background: "rgba(177,56,24,.08)", border: "1px solid rgba(177,56,24,.25)", color: "#7d2811", fontSize: 13 }}>{message}</div>;
}

function Input({ label, name, required, placeholder }: { label: string; name: string; required?: boolean; placeholder?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11.5, color: "var(--color-muted)", fontWeight: 500 }}>{label}</span>
      <input name={name} type="text" required={required} placeholder={placeholder} style={inputStyle} />
    </label>
  );
}
function Textarea({ label, name, rows = 3, placeholder, hint, required }: { label: string; name: string; rows?: number; placeholder?: string; hint?: string; required?: boolean }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11.5, color: "var(--color-muted)", fontWeight: 500 }}>{label}</span>
      <textarea name={name} rows={rows} required={required} placeholder={placeholder} style={inputStyle} />
      {hint && <span style={{ fontSize: 10.5, color: "var(--color-muted)", marginTop: 1 }}>{hint}</span>}
    </label>
  );
}
function Select({ label, name, defaultValue, onChange, children }: { label: string; name: string; defaultValue: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11.5, color: "var(--color-muted)", fontWeight: 500 }}>{label}</span>
      <select name={name} defaultValue={defaultValue} onChange={onChange} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>{children}</select>
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
const btnCopy = (copied: boolean): React.CSSProperties => ({ padding: "8px 14px", borderRadius: 999, background: copied ? "rgba(93,187,106,.15)" : "rgba(255,255,255,.7)", border: "1px solid var(--color-line)", color: copied ? "#2a6e36" : "var(--color-ink-2)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" });
const pill: React.CSSProperties = { display: "inline-block", padding: "4px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 500, background: "var(--color-cream-3)", color: "var(--color-ink-2)" };
const preBlock: React.CSSProperties = { background: "#fff", border: "1px solid var(--color-line)", borderRadius: 12, padding: "14px 16px", margin: "0 0 8px", fontFamily: "inherit", fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word" };
