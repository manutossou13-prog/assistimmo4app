"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { analyzeFinanceAction, type GabrielActionResult } from "./actions";

export function GabrielForm() {
  const [state, formAction] = useActionState<GabrielActionResult | null, FormData>(
    analyzeFinanceAction,
    null
  );

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <span aria-hidden style={{ ...avatar, background: "linear-gradient(135deg,#5681E0,#3258ad)" }}>G</span>
        <div>
          <h2 style={h2}>Gabriel · Pilote financier</h2>
          <p style={pSub}>Analyse charges + recos d&apos;optimisation. Ou génère une lettre de résiliation.</p>
        </div>
      </div>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Select label="Mode" name="mode" defaultValue="analyse">
            <option value="analyse">📊 Analyse charges + recos</option>
            <option value="resiliation">✂️ Lettre de résiliation</option>
            <option value="previsionnel">📈 Prévisionnel trésorerie 3 mois</option>
          </Select>
          <Input label="Période" name="period_label" placeholder="Q1 2026 · Mars 2026 · Année 2026" />
          <Input label="Revenu mensuel agence (€)" name="monthly_revenue" type="number" placeholder="35000" hint="Optionnel — pour ratio charges/CA" />
        </div>

        <Textarea
          label="Données brutes — colle ton tableau Excel/CSV ou décris la charge à résilier"
          name="data_raw"
          required
          rows={10}
          placeholder={`Pour mode "analyse", colle ton tableau de charges :

Fournisseur     | Catégorie       | Montant mensuel
ProBox          | SaaS            | 89 €
Loyer           | Loyer           | 2400 €
Free Pro        | Télécom         | 79 €
AXA Pro         | Assurance       | 320 €
...

Pour mode "résiliation", décris simplement la charge :
"ProBox SaaS, contrat n° ABC-123 souscrit en septembre 2025, 89€/mois, préavis 2 mois, motif : non utilisé depuis 6 mois"`}
          hint="Plus c'est détaillé, plus l'analyse est précise. Pour une résiliation tu peux te limiter à 3-4 lignes."
        />

        <Textarea
          label="Contexte additionnel (optionnel)"
          name="context"
          rows={2}
          placeholder="Ex: agence 5 négociateurs · dirigeant veut réduire 10% des charges · résilier les SaaS doublons"
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
    <button type="submit" disabled={pending} style={{ ...btnSubmit, background: pending ? "var(--color-muted)" : "var(--color-ink)", cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.7 : 1 }}>
      {pending ? "Gabriel analyse… (≈ 12 s)" : "Lancer Gabriel →"}
    </button>
  );
}

function ResultPanel({ state }: { state: Extract<GabrielActionResult, { ok: true }> }) {
  const { result } = state;
  const [copied, setCopied] = useState(false);

  function copyLetter() {
    if (!result.resiliation_letter) return;
    navigator.clipboard.writeText(result.resiliation_letter).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {/* ignore */});
  }

  const fmtEur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  return (
    <div style={{ marginTop: 22, padding: 22, borderRadius: 18, background: "linear-gradient(135deg, var(--color-cream-2), #fff)", border: "1px solid var(--color-line)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <span style={pill}>Mensuel : {fmtEur(result.total_charges_monthly)}</span>
        <span style={pill}>Annuel : {fmtEur(result.total_charges_yearly)}</span>
        <span style={{ ...pill, background: "rgba(93,187,106,.15)" }}>{result.recommendations.length} reco{result.recommendations.length > 1 ? "s" : ""}</span>
        {result.alerts.length > 0 && (
          <span style={{ ...pill, background: "rgba(177,56,24,.10)", color: "#7d2811" }}>⚠ {result.alerts.length} alerte{result.alerts.length > 1 ? "s" : ""}</span>
        )}
        <span style={pill}>{(result.meta.duration_ms / 1000).toFixed(1)} s</span>
      </div>

      <SectionTitle>Synthèse</SectionTitle>
      <p style={{ margin: "0 0 18px", fontSize: 14, lineHeight: 1.6, color: "var(--color-ink-2)" }}>{result.synthese}</p>

      {result.alerts.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <SectionTitle>⚠ Alertes</SectionTitle>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
            {result.alerts.map((a, i) => <li key={i} style={{ color: "#7d2811" }}>{a}</li>)}
          </ul>
        </div>
      )}

      {Object.keys(result.charges_by_category).length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <SectionTitle>Répartition par catégorie</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8 }}>
            {Object.entries(result.charges_by_category).map(([cat, amt]) => (
              <div key={cat} style={{ padding: "10px 12px", background: "#fff", border: "1px solid var(--color-line)", borderRadius: 10 }}>
                <div style={{ fontSize: 10.5, color: "var(--color-muted)", letterSpacing: ".06em", textTransform: "uppercase" }}>{cat}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, marginTop: 3 }}>{fmtEur(amt)}</div>
                <div style={{ fontSize: 10.5, color: "var(--color-muted)" }}>/mois</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.recommendations.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <SectionTitle>Recommandations chiffrées</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.recommendations.map((r) => (
              <div key={r.rank} style={{ background: "#fff", border: "1px solid var(--color-line)", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-taupe)", marginRight: 8 }}>#{r.rank}</span>
                      {r.action}
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--color-muted)", lineHeight: 1.5 }}>{r.rationale}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "#2a6e36" }}>+{fmtEur(r.estimated_yearly_saving)}</div>
                    <div style={{ fontSize: 10, color: "var(--color-muted)" }}>économie/an</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ ...pill, fontSize: 10 }}>Effort {r.effort}</span>
                  <span style={{ ...pill, fontSize: 10 }}>Risque {r.risk}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.charges_lines.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <SectionTitle>Détail des charges</SectionTitle>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: "var(--color-cream-3)" }}>
                  <th style={th}>Fournisseur</th>
                  <th style={th}>Catégorie</th>
                  <th style={th}>Montant /mois</th>
                  <th style={th}>Récurrence</th>
                  <th style={th}>Alerte</th>
                </tr>
              </thead>
              <tbody>
                {result.charges_lines.map((l, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--color-line)", background: l.optimization_flag ? "rgba(240,196,74,.08)" : "transparent" }}>
                    <td style={td}>{l.vendor}</td>
                    <td style={td}>{l.category}</td>
                    <td style={{ ...td, textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmtEur(l.amount_monthly)}</td>
                    <td style={td}>{l.recurrence}</td>
                    <td style={td}>{l.optimization_flag ? `⚠ ${l.optimization_reason ?? "À optimiser"}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result.resiliation_letter && (
        <div style={{ marginTop: 18, padding: 16, background: "rgba(86,129,224,.06)", border: "1px solid rgba(86,129,224,.25)", borderRadius: 12 }}>
          <SectionTitle>📝 Lettre de résiliation (à compléter et envoyer en LRAR)</SectionTitle>
          <pre style={preBlock}>{result.resiliation_letter}</pre>
          <button type="button" onClick={copyLetter} style={btnCopy(copied)}>
            {copied ? "✓ Lettre copiée" : "Copier la lettre"}
          </button>
          <p style={{ marginTop: 10, fontSize: 11, color: "var(--color-muted)", fontStyle: "italic" }}>
            ⚠️ Gabriel n&apos;envoie jamais — copie, colle dans Word/Pages, complète les [...], imprime, signe et envoie en LRAR.
          </p>
        </div>
      )}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return <div style={{ marginTop: 18, padding: "12px 16px", borderRadius: 12, background: "rgba(177,56,24,.08)", border: "1px solid rgba(177,56,24,.25)", color: "#7d2811", fontSize: 13 }}>{message}</div>;
}

function Input({ label, name, type = "text", placeholder, hint }: { label: string; name: string; type?: string; placeholder?: string; hint?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11.5, color: "var(--color-muted)", fontWeight: 500 }}>{label}</span>
      <input name={name} type={type} placeholder={placeholder} style={inputStyle} />
      {hint && <span style={{ fontSize: 10.5, color: "var(--color-muted)", marginTop: 1 }}>{hint}</span>}
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
function Select({ label, name, defaultValue, children }: { label: string; name: string; defaultValue: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11.5, color: "var(--color-muted)", fontWeight: 500 }}>{label}</span>
      <select name={name} defaultValue={defaultValue} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>{children}</select>
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
const th: React.CSSProperties = { padding: "8px 10px", textAlign: "left", fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--color-taupe)" };
const td: React.CSSProperties = { padding: "8px 10px" };
