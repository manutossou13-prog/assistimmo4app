"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { investigateListingAction, type TomActionResult } from "./actions";

const DPE_LETTERS = ["", "A", "B", "C", "D", "E", "F", "G"] as const;

export function TomForm() {
  const [state, formAction] = useActionState<TomActionResult | null, FormData>(
    investigateListingAction,
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
            background: "linear-gradient(135deg,#5BC0BE,#3a9c9a)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          T
        </span>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: 0 }}>
            Tom · Enquêteur mandat
          </h2>
          <p style={{ fontSize: 12, color: "var(--color-muted)", margin: 0, marginTop: 2 }}>
            Saisis ce que tu lis sur l&apos;annonce — Tom croise avec l&apos;ADEME et te retourne les adresses probables.
          </p>
        </div>
      </div>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Ville obligatoire + type */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 1fr", gap: 10 }}>
          <Input label="Ville *" name="city" required placeholder="Drancy" />
          <Input label="Code postal" name="zipcode" placeholder="93700" maxLength={5} />
          <Select label="Type de bien *" name="type" defaultValue="house">
            <option value="house">Maison / Pavillon</option>
            <option value="apartment">Appartement</option>
            <option value="land">Terrain</option>
            <option value="commercial">Commercial</option>
          </Select>
        </div>

        {/* Surfaces + pièces */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 80px", gap: 10 }}>
          <Input label="Surface habitable (m²)" name="surface_habitable" placeholder="95" type="number" step="0.1" />
          <Input label="Surface terrain (m²)" name="surface_terrain" placeholder="200" type="number" step="0.1" hint="Discriminant pour les pavillons" />
          <Input label="Pièces" name="rooms" placeholder="5" type="number" />
          <Input label="Étage" name="floor" placeholder="—" type="number" hint="Vide pour maison" />
        </div>

        {/* DPE / GES / année */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Select label="DPE (étiquette énergie)" name="dpe_letter" defaultValue="D">
            {DPE_LETTERS.map((l) => (
              <option key={l} value={l}>
                {l || "—"}
              </option>
            ))}
          </Select>
          <Select label="GES (étiquette climat)" name="ges_letter" defaultValue="">
            {DPE_LETTERS.map((l) => (
              <option key={l} value={l}>
                {l || "—"}
              </option>
            ))}
          </Select>
          <Input
            label="Année du DPE"
            name="dpe_year"
            placeholder="2024"
            type="number"
            min={2000}
            max={2030}
            hint="Si visible sur l'annonce"
          />
        </div>

        {/* Prix + agence + URL */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Input label="Prix annonce (€)" name="price" placeholder="449000" type="number" />
          <Input label="Agence qui commercialise" name="agency_name" placeholder="LAFORÊT, Foncia, Century21..." />
          <Input label="URL de l'annonce" name="source_url" placeholder="https://www.seloger.com/..." type="url" />
        </div>

        {/* Notes libres */}
        <Textarea
          label="Notes / description (optionnel)"
          name="notes"
          rows={3}
          placeholder="Ex: Pavillon individuel quartier Petit Drancy, jardin sud, sous-sol total, garage 2 voitures, cheminée d'origine, proche RER B Le Bourget."
          hint="Plus tu donnes de détails (quartier, atouts), plus Tom peut discriminer."
        />

        <SubmitButton />
      </form>

      {state && state.ok === false && <ErrorBox message={state.error} />}
      {state && state.ok && <ResultCard state={state} />}
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
      {pending ? "Tom enquête… (≈ 4 s)" : "Lancer Tom →"}
    </button>
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

function ResultCard({ state }: { state: Extract<TomActionResult, { ok: true }> }) {
  const { result, property_id } = state;
  const { extraction, candidates, confidence, recommendation, priority, meta } = result;

  const recoLabel: Record<typeof recommendation, string> = {
    boitage_immediat: "✅ Boîtage immédiat",
    enquete_complementaire: "🔎 Enquête complémentaire",
    abandonner: "⏸ Faible confiance",
  };
  const priorityColor: Record<typeof priority, string> = {
    haute: "rgba(93,187,106,.15)",
    moyenne: "rgba(240,196,74,.2)",
    basse: "rgba(107,107,107,.12)",
  };

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
        <span style={{ ...pill, background: priorityColor[priority] }}>{recoLabel[recommendation]}</span>
        <span style={pill}>Fiabilité {confidence}%</span>
        <span style={pill}>
          {candidates.length} candidat{candidates.length > 1 ? "s" : ""} · {meta.ademe_total_matches} DPE consultés
        </span>
        <span style={pill}>{(meta.duration_ms / 1000).toFixed(1)} s</span>
        {property_id && <span style={{ ...pill, background: "rgba(93,187,106,.15)" }}>Sauvegardé en base</span>}
      </div>

      {(extraction.neighborhood || extraction.street_hint || extraction.features.length > 0) && (
        <div style={{ marginBottom: 16, padding: 12, background: "rgba(197,169,121,.08)", borderRadius: 10, border: "1px solid rgba(197,169,121,.25)" }}>
          <SectionTitle>Indices extraits des notes</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {extraction.neighborhood && <span style={pill}>📍 {extraction.neighborhood}</span>}
            {extraction.street_hint && <span style={pill}>🛣 {extraction.street_hint}</span>}
            {extraction.street_number_hint && <span style={pill}>n° {extraction.street_number_hint}</span>}
            {extraction.features.map((f, i) => (
              <span key={i} style={{ ...pill, fontSize: 11 }}>
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      <SectionTitle>Adresses candidates</SectionTitle>
      {candidates.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--color-muted)" }}>
          Aucun candidat. Soit le DPE est trop ancien (avant juillet 2021) et n&apos;est pas dans le dataset moderne, soit le DPE / la surface ne correspondent pas. Essaie de retirer le DPE pour élargir.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {candidates.map((c) => (
            <CandidateCard key={c.rank} candidate={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CandidateCard({ candidate }: { candidate: Extract<TomActionResult, { ok: true }>["result"]["candidates"][number] }) {
  const isTop = candidate.rank === 1;
  const visuals = candidate.visuals;
  const hasStreetView = !!visuals?.streetViewUrl;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: visuals ? "auto 32px 1fr auto" : "32px 1fr auto",
        gap: 14,
        alignItems: "center",
        padding: "12px 14px",
        borderRadius: 14,
        border: "1px solid var(--color-line)",
        background: isTop ? "linear-gradient(90deg,rgba(197,169,121,.15),transparent)" : "#fff",
      }}
    >
      {visuals && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <a href={visuals.mapsLink} target="_blank" rel="noopener noreferrer" title="Voir sur Google Maps">
            <img
              src={hasStreetView ? visuals.streetViewUrl! : visuals.osmStaticUrl}
              alt={hasStreetView ? "Façade Street View" : "Carte OSM"}
              width={120}
              height={90}
              loading="lazy"
              style={{ borderRadius: 8, border: "1px solid var(--color-line)", display: "block", objectFit: "cover" }}
            />
          </a>
          <div style={{ display: "flex", gap: 6, fontSize: 9.5 }}>
            <a href={visuals.mapsLink} target="_blank" rel="noopener noreferrer" style={linkSm}>
              Maps
            </a>
            <span style={{ color: "var(--color-muted)" }}>·</span>
            <a href={visuals.geoportailLink} target="_blank" rel="noopener noreferrer" style={linkSm}>
              Géoportail
            </a>
          </div>
        </div>
      )}
      <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-taupe)", fontSize: 12 }}>
        #{candidate.rank}
      </span>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>{candidate.address}</div>
        <div style={{ fontSize: 11.5, color: "var(--color-muted)", marginTop: 4 }}>
          {candidate.reasons.join(" · ")}
        </div>
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 24,
          color: isTop ? "var(--color-ink)" : "var(--color-muted)",
        }}
      >
        {candidate.score}
      </div>
    </div>
  );
}

const linkSm: React.CSSProperties = {
  color: "var(--color-taupe-d)",
  textDecoration: "none",
  fontWeight: 500,
};

function Input({
  label, name, required, placeholder, type = "text", maxLength, min, max, step, hint,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: string;
  hint?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11.5, color: "var(--color-muted)", fontWeight: 500 }}>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        min={min}
        max={max}
        step={step}
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid var(--color-line)",
          background: "#fff",
          fontSize: 13.5,
          fontFamily: "inherit",
          color: "var(--color-ink)",
          outline: "none",
          width: "100%",
        }}
      />
      {hint && <span style={{ fontSize: 10.5, color: "var(--color-muted)", marginTop: 1 }}>{hint}</span>}
    </label>
  );
}

function Textarea({
  label, name, rows = 3, placeholder, hint,
}: {
  label: string;
  name: string;
  rows?: number;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11.5, color: "var(--color-muted)", fontWeight: 500 }}>{label}</span>
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        style={{
          padding: "11px 13px",
          borderRadius: 10,
          border: "1px solid var(--color-line)",
          background: "#fff",
          fontSize: 13.5,
          fontFamily: "inherit",
          color: "var(--color-ink)",
          outline: "none",
          resize: "vertical",
        }}
      />
      {hint && <span style={{ fontSize: 10.5, color: "var(--color-muted)", marginTop: 1 }}>{hint}</span>}
    </label>
  );
}

function Select({
  label, name, defaultValue, children,
}: {
  label: string;
  name: string;
  defaultValue: string;
  children: React.ReactNode;
}) {
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
