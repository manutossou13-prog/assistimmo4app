"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { runHugoAction, type HugoActionResult } from "./actions";

export function HugoForm() {
  const [state, formAction] = useActionState<HugoActionResult | null, FormData>(
    runHugoAction,
    null
  );
  const [source, setSource] = useState<"manual" | "airtable">("manual");

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <span aria-hidden style={{ ...avatar, background: "linear-gradient(135deg,#5DBB6A,#3a8e47)" }}>H</span>
        <div>
          <h2 style={h2}>Hugo · Manager & analyste KPI</h2>
          <p style={pSub}>KPI agence + alertes + ranking + plan d&apos;action + brief réunion. Connexion Airtable native.</p>
        </div>
      </div>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Source switch */}
        <div style={{ display: "flex", gap: 6, padding: 4, background: "var(--color-cream-3)", borderRadius: 12 }}>
          <input type="hidden" name="source" value={source} />
          <button
            type="button"
            onClick={() => setSource("manual")}
            style={tabBtn(source === "manual")}
          >
            📋 Coller un tableau
          </button>
          <button
            type="button"
            onClick={() => setSource("airtable")}
            style={tabBtn(source === "airtable")}
          >
            🗂 Connecter Airtable
          </button>
        </div>

        {/* Période */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
          <Select label="Période" name="period" defaultValue="month">
            <option value="week">Semaine</option>
            <option value="month">Mois</option>
            <option value="quarter">Trimestre</option>
            <option value="ytd">Année en cours</option>
          </Select>
          <Input
            label="Libellé période"
            name="period_label"
            placeholder="Ex: Mars 2026 · Q1 2026 · S15 2026"
          />
        </div>

        {/* Mode manuel */}
        {source === "manual" && (
          <Textarea
            label="Données brutes (CSV / tableau collé / extraction CRM)"
            name="data_raw"
            required
            rows={10}
            placeholder={`Colle ton tableau Excel/Numbers ou export CRM. Hugo s'adapte. Exemple :

Négo,Mandats,Estimations,Ventes,CA encaissé
Marie L.,5,8,2,42000
Thomas G.,12,16,4,98000
Sophie M.,9,12,3,71000
Julien R.,3,6,1,28000

Ou décris simplement en français :
"Mois de mars : 8 mandats au total (cible 10), Marie 0 mandat, Thomas 4. Pipeline tiède : 6 dossiers sans relance >14j..."`}
            hint="Plus c'est structuré (colonnes nommées), plus l'analyse est précise."
          />
        )}

        {/* Mode Airtable */}
        {source === "airtable" && (
          <div style={{ padding: 16, background: "rgba(93,187,106,.08)", border: "1px dashed rgba(93,187,106,.3)", borderRadius: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12.5, color: "var(--color-ink-2)", lineHeight: 1.5 }}>
              <strong>Comment configurer :</strong>
              <ol style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12 }}>
                <li>Crée un Personal Access Token sur <a href="https://airtable.com/create/tokens" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-taupe-d)" }}>airtable.com/create/tokens</a></li>
                <li>Scopes : <code style={{ background: "rgba(0,0,0,.05)", padding: "1px 5px", borderRadius: 4 }}>data.records:read</code> + <code style={{ background: "rgba(0,0,0,.05)", padding: "1px 5px", borderRadius: 4 }}>schema.bases:read</code></li>
                <li>Donne accès à ta base (Add a base)</li>
                <li>Trouve le Base ID dans l&apos;URL de la base : <code style={{ background: "rgba(0,0,0,.05)", padding: "1px 5px", borderRadius: 4 }}>airtable.com/<strong>app...</strong>/...</code></li>
              </ol>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input label="Personal Access Token" name="airtable_pat" placeholder="patXXX..." type="password" hint="Jamais stocké. Utilisé uniquement pour ce run." />
              <Input label="Base ID" name="airtable_base_id" placeholder="appXXXXXXXX" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Input label="Nom de la table" name="airtable_table" placeholder="Mandats · Pipeline · KPI 2026" required />
              <Input label="Vue (optionnel)" name="airtable_view" placeholder="Grid view" />
              <Input label="Filtre formula (optionnel)" name="airtable_filter" placeholder="MONTH({Date}) = 3" hint="Syntaxe Airtable" />
            </div>
          </div>
        )}

        {/* Objectifs + contexte */}
        <Textarea
          label="Objectifs définis (optionnel)"
          name="targets"
          rows={2}
          placeholder="Ex: 10 mandats/mois total agence, 30k€ CA/négo, taux transformation estim→mandat ≥ 50%"
        />
        <Textarea
          label="Contexte / commentaires métier (optionnel)"
          name="context"
          rows={2}
          placeholder="Ex: Marie en arrêt 1 semaine en mars · campagne SeLoger lancée · marché Drancy ralenti depuis février"
        />

        <SubmitButton airtable={source === "airtable"} />
      </form>

      {state && state.ok === false && <ErrorBox message={state.error} />}
      {state && state.ok && <ResultPanel state={state} />}
    </div>
  );
}

function SubmitButton({ airtable }: { airtable: boolean }) {
  const { pending } = useFormStatus();
  const label = pending
    ? airtable
      ? "Hugo récupère Airtable + analyse… (≈ 15 s)"
      : "Hugo analyse… (≈ 12 s)"
    : "Lancer Hugo →";
  return (
    <button type="submit" disabled={pending} style={{ ...btnSubmit, background: pending ? "var(--color-muted)" : "var(--color-ink)", cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.7 : 1 }}>
      {label}
    </button>
  );
}

function ResultPanel({ state }: { state: Extract<HugoActionResult, { ok: true }> }) {
  const { result, document_id, airtable_meta } = state;
  const [copied, setCopied] = useState(false);

  function copyMeeting() {
    navigator.clipboard.writeText(result.meeting_brief_md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {/* ignore */});
  }

  return (
    <div style={{ marginTop: 22, padding: 22, borderRadius: 18, background: "linear-gradient(135deg, var(--color-cream-2), #fff)", border: "1px solid var(--color-line)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {airtable_meta && (
          <span style={{ ...pill, background: "rgba(93,187,106,.15)" }}>
            🗂 Airtable · {airtable_meta.records_count} lignes · {airtable_meta.table}
          </span>
        )}
        <span style={pill}>{result.kpis.length} KPI</span>
        {result.alerts.length > 0 && (
          <span style={{ ...pill, background: "rgba(177,56,24,.10)", color: "#7d2811" }}>
            ⚠ {result.alerts.length} alerte{result.alerts.length > 1 ? "s" : ""}
          </span>
        )}
        <span style={pill}>{(result.meta.duration_ms / 1000).toFixed(1)} s</span>
        {document_id && <span style={{ ...pill, background: "rgba(93,187,106,.15)" }}>Sauvegardé</span>}
      </div>

      {/* Synthèse */}
      <SectionTitle>Synthèse</SectionTitle>
      <p style={{ margin: "0 0 22px", fontSize: 14.5, lineHeight: 1.65, color: "var(--color-ink-2)" }}>
        {result.synthese}
      </p>

      {/* KPI tiles */}
      {result.kpis.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <SectionTitle>Tableau de bord</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            {result.kpis.map((k, i) => (
              <div key={i} style={{ padding: 14, background: "#fff", border: "1px solid var(--color-line)", borderRadius: 12, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: kpiColor(k.status) }} />
                <div style={{ fontSize: 10.5, color: "var(--color-muted)", letterSpacing: ".08em", textTransform: "uppercase" }}>{k.label}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 26, marginTop: 4 }}>
                  {k.value}{k.unit ? <small style={{ fontSize: 14, color: "var(--color-muted)", marginLeft: 4 }}>{k.unit}</small> : null}
                </div>
                {k.vs_target && <div style={{ fontSize: 11.5, color: kpiTextColor(k.status), marginTop: 4, fontWeight: 500 }}>{k.vs_target}</div>}
                {k.trend && <div style={{ fontSize: 10.5, color: "var(--color-muted)", marginTop: 2 }}>{k.trend}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertes */}
      {result.alerts.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <SectionTitle>Alertes</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {result.alerts.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: 14, background: "#fff", border: `1px solid ${alertColor(a.severity)}`, borderLeft: `3px solid ${alertColor(a.severity)}`, borderRadius: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 3 }}>
                    {alertEmoji(a.severity)} {a.title}
                  </div>
                  <p style={{ margin: 0, fontSize: 12.5, color: "var(--color-muted)", lineHeight: 1.5 }}>{a.description}</p>
                  <div style={{ marginTop: 6, fontSize: 12, color: "var(--color-taupe-d)", fontStyle: "italic" }}>
                    💡 {a.suggested_action}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranking */}
      {result.ranking.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <SectionTitle>Ranking équipe</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {result.ranking.map((r) => (
              <div key={r.rank} style={{ display: "grid", gridTemplateColumns: "32px 36px 1fr auto auto", gap: 12, alignItems: "center", padding: "10px 12px", background: r.rank === 1 ? "linear-gradient(90deg,rgba(197,169,121,.15),transparent)" : "#fff", border: "1px solid var(--color-line)", borderRadius: 10 }}>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-taupe)", fontSize: 12 }}>#{r.rank}</span>
                <div style={{ width: 30, height: 30, borderRadius: 999, background: avatarColor(r.rank), color: "#fff", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 11 }}>
                  {initialsOf(r.name)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--color-muted)" }}>{r.details}</div>
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: r.rank === 1 ? "var(--color-ink)" : "var(--color-muted)" }}>
                  {r.metric}
                </div>
                <div style={{ fontSize: 16 }}>
                  {r.trend === "up" ? "📈" : r.trend === "down" ? "📉" : r.trend === "stable" ? "➡️" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan d'action */}
      {result.actions.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <SectionTitle>Plan d&apos;action priorisé</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {result.actions.map((a) => (
              <div key={a.priority} style={{ background: "#fff", border: "1px solid var(--color-line)", borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-taupe)", fontSize: 11, marginRight: 8 }}>P{a.priority}</span>
                      {a.action}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--color-muted)", marginTop: 4 }}>
                      👤 {a.owner} · ⏱ {a.deadline}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--color-taupe-d)", fontStyle: "italic", marginTop: 6, paddingTop: 8, borderTop: "1px solid var(--color-line)" }}>
                  Impact attendu : {a.expected_impact}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meeting brief */}
      {result.meeting_brief_md && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <SectionTitle>Brief réunion équipe</SectionTitle>
            <button type="button" onClick={copyMeeting} style={btnCopy(copied)}>
              {copied ? "✓ Copié" : "Copier markdown"}
            </button>
          </div>
          <pre style={preBlock}>{result.meeting_brief_md}</pre>
        </div>
      )}

      {result.next_data_to_collect.length > 0 && (
        <div style={{ padding: 12, background: "rgba(197,169,121,.08)", border: "1px solid rgba(197,169,121,.25)", borderRadius: 10 }}>
          <SectionTitle>📋 Données à collecter pour la prochaine analyse</SectionTitle>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.55 }}>
            {result.next_data_to_collect.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function kpiColor(status: "ok" | "warning" | "critical" | "neutral"): string {
  return status === "ok" ? "#5DBB6A" : status === "warning" ? "#F0C44A" : status === "critical" ? "#E25C7A" : "var(--color-taupe)";
}
function kpiTextColor(status: "ok" | "warning" | "critical" | "neutral"): string {
  return status === "ok" ? "#2a6e36" : status === "warning" ? "#7d5e08" : status === "critical" ? "#7d2811" : "var(--color-muted)";
}
function alertColor(severity: "low" | "medium" | "high"): string {
  return severity === "high" ? "rgba(177,56,24,.4)" : severity === "medium" ? "rgba(240,196,74,.5)" : "rgba(155,138,114,.3)";
}
function alertEmoji(severity: "low" | "medium" | "high"): string {
  return severity === "high" ? "🔴" : severity === "medium" ? "🟠" : "🟡";
}
function avatarColor(rank: number): string {
  if (rank === 1) return "linear-gradient(135deg,#F0C44A,#c69b22)";
  if (rank === 2) return "linear-gradient(135deg,#9B8A72,#7a6b56)";
  if (rank === 3) return "linear-gradient(135deg,#C5A979,#9B8A72)";
  return "linear-gradient(135deg,var(--color-muted),var(--color-ink-2))";
}
function initialsOf(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function ErrorBox({ message }: { message: string }) {
  return <div style={{ marginTop: 18, padding: "12px 16px", borderRadius: 12, background: "rgba(177,56,24,.08)", border: "1px solid rgba(177,56,24,.25)", color: "#7d2811", fontSize: 13 }}>{message}</div>;
}

function Input({ label, name, type = "text", placeholder, hint, required }: { label: string; name: string; type?: string; placeholder?: string; hint?: string; required?: boolean }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11.5, color: "var(--color-muted)", fontWeight: 500 }}>{label}</span>
      <input name={name} type={type} placeholder={placeholder} required={required} style={inputStyle} />
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
const tabBtn = (active: boolean): React.CSSProperties => ({ flex: 1, padding: "9px 14px", borderRadius: 8, border: "none", background: active ? "#fff" : "transparent", color: active ? "var(--color-ink)" : "var(--color-muted)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", boxShadow: active ? "0 2px 8px rgba(12,12,12,.06)" : "none" });
const pill: React.CSSProperties = { display: "inline-block", padding: "4px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 500, background: "var(--color-cream-3)", color: "var(--color-ink-2)" };
const preBlock: React.CSSProperties = { background: "#fff", border: "1px solid var(--color-line)", borderRadius: 12, padding: "14px 16px", margin: 0, fontFamily: "inherit", fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word" };
