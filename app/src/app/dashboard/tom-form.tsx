"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { investigateListingAction, type TomActionResult } from "./actions";

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
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: 0 }}>Tom · Enquêteur mandat</h2>
          <p style={{ fontSize: 12, color: "var(--color-muted)", margin: 0, marginTop: 2 }}>
            Colle l&apos;URL d&apos;une annonce (SeLoger, LeBonCoin, PAP…) ou son texte. Tom retrouve l&apos;adresse via DPE/ADEME.
          </p>
        </div>
      </div>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          name="listing"
          placeholder="https://www.seloger.com/annonces/...
ou colle directement le texte de l'annonce"
          required
          rows={5}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: 14,
            border: "1px solid var(--color-line)",
            background: "#fff",
            fontSize: 13.5,
            fontFamily: "inherit",
            color: "var(--color-ink)",
            outline: "none",
            resize: "vertical",
            minHeight: 100,
          }}
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
      {pending ? "Tom enquête… (≈ 8 s)" : "Lancer Tom →"}
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
        <span style={pill}>{candidates.length} candidat{candidates.length > 1 ? "s" : ""} · {meta.ademe_total_matches} DPE consultés</span>
        <span style={pill}>{(meta.duration_ms / 1000).toFixed(1)} s</span>
        {property_id && <span style={{ ...pill, background: "rgba(93,187,106,.15)" }}>Sauvegardé en base</span>}
      </div>

      <SectionTitle>Extraction</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 18 }}>
        <Field label="Ville" value={extraction.city} />
        <Field label="CP" value={extraction.zipcode} />
        <Field label="Surface" value={extraction.surface_habitable ? `${extraction.surface_habitable} m²` : null} />
        <Field label="Pièces" value={extraction.rooms} />
        <Field label="DPE" value={extraction.dpe_letter} />
        <Field label="GES" value={extraction.ges_letter} />
        <Field label="Année DPE" value={extraction.dpe_year} />
        <Field label="Prix" value={extraction.price ? `${extraction.price.toLocaleString("fr-FR")} €` : null} />
        <Field label="Type" value={extraction.type} />
        <Field label="Agence" value={extraction.agency_name} />
      </div>

      <SectionTitle>Adresses candidates</SectionTitle>
      {candidates.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--color-muted)" }}>
          Aucun match suffisant ({meta.ademe_total_matches} DPE consultés). Vérifiez la ville et le DPE saisis.
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

const pill: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 11px",
  borderRadius: 999,
  fontSize: 11.5,
  fontWeight: 500,
  background: "var(--color-cream-3)",
  color: "var(--color-ink-2)",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        letterSpacing: ".18em",
        textTransform: "uppercase",
        color: "var(--color-taupe)",
        margin: "0 0 10px",
      }}
    >
      {children}
    </h3>
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
          {hasStreetView ? (
            <a href={visuals.mapsLink} target="_blank" rel="noopener noreferrer" title="Voir sur Google Maps">
              <img
                src={visuals.streetViewUrl!}
                alt="Façade Street View"
                width={120}
                height={90}
                loading="lazy"
                style={{ borderRadius: 8, border: "1px solid var(--color-line)", display: "block", objectFit: "cover" }}
              />
            </a>
          ) : (
            <a href={visuals.mapsLink} target="_blank" rel="noopener noreferrer" title="Ouvrir sur Google Maps">
              <img
                src={visuals.osmStaticUrl}
                alt="Carte OSM"
                width={120}
                height={90}
                loading="lazy"
                style={{ borderRadius: 8, border: "1px solid var(--color-line)", display: "block", objectFit: "cover" }}
              />
            </a>
          )}
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
        {visuals && !hasStreetView && (
          <div style={{ fontSize: 10.5, color: "var(--color-muted)", marginTop: 5, fontStyle: "italic" }}>
            💡 Ajoutez `GOOGLE_MAPS_API_KEY` dans Vercel pour activer Street View (façade)
          </div>
        )}
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

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div
      style={{
        padding: "8px 10px",
        background: "rgba(255,255,255,.7)",
        border: "1px solid var(--color-line)",
        borderRadius: 10,
      }}
    >
      <div style={{ fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--color-muted)" }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: value === null ? "var(--color-muted)" : "var(--color-ink)" }}>
        {value === null ? "—" : value}
      </div>
    </div>
  );
}
