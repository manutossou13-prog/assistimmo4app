"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { generateMandateAction, type NoraActionResult } from "./actions";

export function NoraForm() {
  const [state, formAction] = useActionState<NoraActionResult | null, FormData>(
    generateMandateAction,
    null
  );
  const [hasSecondSeller, setHasSecondSeller] = useState(false);
  const [commissionMode, setCommissionMode] = useState<"pct" | "amount">("pct");

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <span aria-hidden style={{ ...avatar, background: "linear-gradient(135deg,#9B6BFF,#6a3fcf)" }}>N</span>
        <div>
          <h2 style={h2}>Nora · Administratif & mandats</h2>
          <p style={pSub}>Génère mandats simples, exclusifs, semi-exclusifs ou avenants — registre Hoguet automatique.</p>
        </div>
      </div>

      <div style={{ marginBottom: 14, padding: 12, background: "rgba(240,196,74,.10)", border: "1px solid rgba(240,196,74,.3)", borderRadius: 10, fontSize: 12, color: "#7d5e08" }}>
        ⚖️ Modèle juridique généré par IA. <strong>À valider par un avocat partenaire</strong> avant utilisation commerciale réelle. Nora insère automatiquement les mentions Hoguet et la faculté de dénonciation.
      </div>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Type + dates */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Select label="Type de mandat" name="type" defaultValue="exclusif">
            <option value="simple">Simple</option>
            <option value="exclusif">Exclusif (3 mois min)</option>
            <option value="semi_exclusif">Semi-exclusif</option>
            <option value="avenant">Avenant</option>
          </Select>
          <Input label="Date de début" name="start_date" type="date" defaultValue={today} required />
          <Input label="Durée (mois)" name="duration_months" type="number" defaultValue="3" min={1} max={24} />
        </div>

        {/* VENDEUR 1 */}
        <Fieldset title="Vendeur 1">
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr", gap: 10 }}>
            <Select label="Civilité" name="seller_0_civility" defaultValue="M.">
              <option value="M.">M.</option>
              <option value="Mme">Mme</option>
              <option value="Mlle">Mlle</option>
            </Select>
            <Input label="Prénom" name="seller_0_first_name" required placeholder="Jean" />
            <Input label="Nom" name="seller_0_last_name" required placeholder="DUPONT" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <Input label="Date de naissance" name="seller_0_birth_date" type="date" />
            <Input label="Lieu de naissance" name="seller_0_birth_place" placeholder="Paris" />
          </div>
          <div style={{ marginTop: 10 }}>
            <Input label="Adresse" name="seller_0_address" required placeholder="12 rue de la République, 93700 Drancy" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <Input label="Email" name="seller_0_email" type="email" placeholder="jean.dupont@example.com" />
            <Input label="Téléphone" name="seller_0_phone" placeholder="06 XX XX XX XX" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 10, marginTop: 10 }}>
            <Select label="Pièce d'identité" name="seller_0_id_doc_type" defaultValue="CNI">
              <option value="">—</option>
              <option value="CNI">CNI</option>
              <option value="Passeport">Passeport</option>
              <option value="Titre de séjour">Titre de séjour</option>
            </Select>
            <Input label="Référence pièce" name="seller_0_id_doc_ref" placeholder="N° CNI / passeport" />
          </div>
        </Fieldset>

        {/* Toggle deuxième vendeur */}
        <button
          type="button"
          onClick={() => setHasSecondSeller((v) => !v)}
          style={{
            alignSelf: "flex-start",
            padding: "6px 12px",
            borderRadius: 999,
            background: "rgba(255,255,255,.7)",
            border: "1px dashed var(--color-line)",
            fontSize: 11.5,
            fontWeight: 500,
            cursor: "pointer",
            color: "var(--color-taupe-d)",
            fontFamily: "inherit",
          }}
        >
          {hasSecondSeller ? "− Retirer le 2ᵉ vendeur" : "+ Ajouter un 2ᵉ vendeur (couple, indivision)"}
        </button>

        {hasSecondSeller && (
          <Fieldset title="Vendeur 2">
            <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr", gap: 10 }}>
              <Select label="Civilité" name="seller_1_civility" defaultValue="Mme">
                <option value="M.">M.</option>
                <option value="Mme">Mme</option>
                <option value="Mlle">Mlle</option>
              </Select>
              <Input label="Prénom" name="seller_1_first_name" />
              <Input label="Nom" name="seller_1_last_name" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              <Input label="Date de naissance" name="seller_1_birth_date" type="date" />
              <Input label="Lieu de naissance" name="seller_1_birth_place" />
            </div>
            <div style={{ marginTop: 10 }}>
              <Input label="Adresse" name="seller_1_address" placeholder="(idem si même domicile)" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              <Input label="Email" name="seller_1_email" type="email" />
              <Input label="Téléphone" name="seller_1_phone" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 10, marginTop: 10 }}>
              <Select label="Pièce d'identité" name="seller_1_id_doc_type" defaultValue="CNI">
                <option value="">—</option>
                <option value="CNI">CNI</option>
                <option value="Passeport">Passeport</option>
                <option value="Titre de séjour">Titre de séjour</option>
              </Select>
              <Input label="Référence pièce" name="seller_1_id_doc_ref" />
            </div>
          </Fieldset>
        )}

        {/* BIEN */}
        <Fieldset title="Bien à vendre">
          <Input label="Adresse du bien" name="property_address" required placeholder="12 rue de l'Église" />
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, marginTop: 10 }}>
            <Input label="Code postal" name="property_zipcode" placeholder="93700" maxLength={5} />
            <Input label="Ville" name="property_city" placeholder="Drancy" />
          </div>
          <div style={{ marginTop: 10 }}>
            <Textarea
              label="Désignation précise du bien"
              name="property_designation"
              required
              rows={3}
              placeholder="Ex: Pavillon individuel R+1 sur sous-sol total, 5 pièces (séjour double, cuisine équipée, 3 chambres, salle de bain, WC séparés), garage 2 voitures, jardin clos 200m² exposé sud."
              hint="Plus c'est précis, plus le mandat est solide juridiquement."
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <Input label="Surface habitable (m²)" name="property_surface_habitable" type="number" step="0.1" placeholder="95" />
            <Input label="Surface terrain (m²)" name="property_surface_terrain" type="number" step="0.1" placeholder="200" />
          </div>
        </Fieldset>

        {/* CONDITIONS FINANCIÈRES */}
        <Fieldset title="Conditions financières">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="Prix de mise en vente (€)" name="price" type="number" required min={1000} step={1000} placeholder="449000" />
            <Select label="Charge des honoraires" name="commission_payer" defaultValue="seller">
              <option value="seller">Vendeur</option>
              <option value="buyer">Acquéreur</option>
            </Select>
          </div>
          <div style={{ marginTop: 10, padding: 10, background: "var(--color-cream-3)", borderRadius: 10 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <button type="button" onClick={() => setCommissionMode("pct")} style={tabBtn(commissionMode === "pct")}>
                Pourcentage
              </button>
              <button type="button" onClick={() => setCommissionMode("amount")} style={tabBtn(commissionMode === "amount")}>
                Montant fixe €
              </button>
            </div>
            {commissionMode === "pct" ? (
              <Input label="Honoraires en % du prix de vente" name="commission_pct" type="number" step="0.1" min={0} max={15} placeholder="5" hint="Ex: 5% pour un prix de 449 000€ = 22 450€ TTC" />
            ) : (
              <Input label="Honoraires en € TTC (montant fixe)" name="commission_amount" type="number" min={0} step={100} placeholder="22450" />
            )}
          </div>
        </Fieldset>

        <Textarea
          label="Conditions particulières (optionnel)"
          name="special_conditions"
          rows={2}
          placeholder="Ex: clause de pré-emption locataire, vente en l'état, démembrement, indivision avec...etc."
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
      {pending ? "Nora rédige le mandat… (≈ 15 s)" : "Générer le mandat →"}
    </button>
  );
}

function ResultPanel({ state }: { state: Extract<NoraActionResult, { ok: true }> }) {
  const { result, document_id, mandate_id } = state;

  const okCount = result.conformity.filter((c) => c.ok).length;
  const totalCount = result.conformity.length;

  return (
    <div style={{ marginTop: 22, padding: 22, borderRadius: 18, background: "linear-gradient(135deg, var(--color-cream-2), #fff)", border: "1px solid var(--color-line)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <span style={{ ...pill, background: "rgba(155,107,255,.15)", color: "#6a3fcf" }}>Mandat n° {result.registry_number}</span>
        <span style={pill}>{result.type}</span>
        <span style={{ ...pill, background: okCount === totalCount ? "rgba(93,187,106,.15)" : "rgba(240,196,74,.2)" }}>
          Conformité {okCount}/{totalCount}
        </span>
        {result.warnings.length > 0 && (
          <span style={{ ...pill, background: "rgba(177,56,24,.10)", color: "#7d2811" }}>
            ⚠ {result.warnings.length} alerte{result.warnings.length > 1 ? "s" : ""}
          </span>
        )}
        <span style={pill}>Fin : {result.end_date}</span>
        <span style={pill}>Honoraires : {result.commission_amount_final.toLocaleString("fr-FR")} €</span>
      </div>

      {/* CTA principaux */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
        <a
          href={`/mandate/${document_id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "11px 20px",
            borderRadius: 999,
            background: "var(--color-ink)",
            color: "var(--color-cream)",
            fontWeight: 500,
            fontSize: 13.5,
            textDecoration: "none",
            boxShadow: "0 14px 32px rgba(12,12,12,.18)",
          }}
        >
          📄 Ouvrir le mandat (Cmd+P pour imprimer en PDF)
        </a>
        <span style={{ fontSize: 12, color: "var(--color-muted)", alignSelf: "center" }}>
          Mandat #{mandate_id.slice(0, 8)} · sauvegardé en base · statut <strong>draft</strong>
        </span>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <SectionTitle>⚠ Alertes & points de vigilance</SectionTitle>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: "#7d2811" }}>
            {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Conformité */}
      {result.conformity.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <SectionTitle>Checklist Hoguet</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 6 }}>
            {result.conformity.map((c, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "8px 10px",
                  background: "#fff",
                  border: `1px solid ${c.ok ? "rgba(93,187,106,.3)" : "rgba(240,196,74,.5)"}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
              >
                <span>{c.ok ? "✅" : "⚠️"}</span>
                <div>
                  <div style={{ fontWeight: 500 }}>{c.field}</div>
                  {c.note && <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2 }}>{c.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aperçu mandat */}
      <SectionTitle>Aperçu du mandat</SectionTitle>
      <pre style={preBlock}>{result.mandate_md.slice(0, 2000)}{result.mandate_md.length > 2000 ? "\n\n…" : ""}</pre>
      <p style={{ marginTop: 6, fontSize: 11, color: "var(--color-muted)", fontStyle: "italic" }}>{result.legal_disclaimer}</p>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return <div style={{ marginTop: 18, padding: "12px 16px", borderRadius: 12, background: "rgba(177,56,24,.08)", border: "1px solid rgba(177,56,24,.25)", color: "#7d2811", fontSize: 13 }}>{message}</div>;
}

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset style={{ border: "1px solid var(--color-line)", borderRadius: 12, padding: "14px 14px 12px", background: "rgba(255,255,255,.4)" }}>
      <legend style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--color-taupe)", padding: "0 8px" }}>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Input({ label, name, type = "text", required, placeholder, defaultValue, hint, maxLength, min, max, step }: {
  label: string; name: string; type?: string; required?: boolean; placeholder?: string; defaultValue?: string; hint?: string; maxLength?: number; min?: number; max?: number; step?: number | string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11.5, color: "var(--color-muted)", fontWeight: 500 }}>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        maxLength={maxLength}
        min={min}
        max={max}
        step={step}
        style={inputStyle}
      />
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
function Select({ label, name, defaultValue, children }: { label: string; name: string; defaultValue?: string; children: React.ReactNode }) {
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
const inputStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid var(--color-line)", background: "#fff", fontSize: 13.5, fontFamily: "inherit", color: "var(--color-ink)", outline: "none", resize: "vertical", lineHeight: 1.55, width: "100%" };
const btnSubmit: React.CSSProperties = { alignSelf: "flex-start", padding: "12px 22px", borderRadius: 999, color: "var(--color-cream)", border: "none", fontWeight: 500, fontSize: 14, boxShadow: "0 14px 32px rgba(12,12,12,.18)" };
const tabBtn = (active: boolean): React.CSSProperties => ({ flex: 1, padding: "7px 12px", borderRadius: 8, border: "none", background: active ? "#fff" : "transparent", color: active ? "var(--color-ink)" : "var(--color-muted)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", boxShadow: active ? "0 2px 6px rgba(12,12,12,.06)" : "none" });
const pill: React.CSSProperties = { display: "inline-block", padding: "4px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 500, background: "var(--color-cream-3)", color: "var(--color-ink-2)" };
const preBlock: React.CSSProperties = { background: "#fff", border: "1px solid var(--color-line)", borderRadius: 12, padding: "14px 16px", margin: 0, fontFamily: "inherit", fontSize: 12.5, lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word" };
