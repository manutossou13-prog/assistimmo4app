import { redirect } from "next/navigation";
import { AssistimmoMark } from "@/components/brand/logo";
import { SubmitButton } from "@/components/ui/submit-button";
import { createClient } from "@/lib/supabase/server";
import { createAgency } from "./actions";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("memberships")
    .select("agency_id")
    .eq("user_id", user.id)
    .limit(1);

  if (memberships && memberships.length > 0) redirect("/dashboard");

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div
        style={{
          width: "100%",
          maxWidth: 540,
          background: "rgba(255,255,255,.65)",
          border: "1px solid var(--color-line)",
          borderRadius: 24,
          padding: "44px 40px",
          backdropFilter: "blur(8px)",
          boxShadow: "0 30px 80px rgba(12,12,12,.10)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, var(--color-cream-2), var(--color-cream-3))",
              border: "1px solid rgba(155,138,114,.2)",
              display: "grid",
              placeItems: "center",
              color: "var(--color-taupe-d)",
              marginBottom: 14,
            }}
          >
            <AssistimmoMark size={32} />
          </div>
          <p className="mono">Création de votre agence</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, marginTop: 10, color: "var(--color-ink)", textAlign: "center" }}>
            Créons votre agence
          </h1>
          <p style={{ color: "var(--color-muted)", fontSize: 14, textAlign: "center", marginTop: 10, maxWidth: 380, lineHeight: 1.5 }}>
            Quelques infos pour configurer votre espace agence et activer la conformité loi Hoguet.
          </p>
        </div>

        {params.error && (
          <div
            style={{
              marginBottom: 20,
              padding: "10px 14px",
              borderRadius: 12,
              background: "rgba(177,56,24,.08)",
              border: "1px solid rgba(177,56,24,.25)",
              color: "#7d2811",
              fontSize: 13,
            }}
          >
            {params.error}
          </div>
        )}

        <form action={createAgency} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field
            label="Nom de l'agence"
            name="name"
            required
            placeholder="Agence Paris 15"
            hint="Nom commercial visible sur vos documents"
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 130px", gap: 14 }}>
            <Field label="Ville" name="city" placeholder="Paris" />
            <Field label="Code postal" name="zipcode" placeholder="75015" />
          </div>
          <Field
            label="Numéro de carte T"
            name="carte_t"
            placeholder="CPI 7501 2026 000 123 456"
            hint="Loi Hoguet — recommandé mais non bloquant"
          />

          <SubmitButton label="Créer mon agence →" pendingLabel="Création en cours…" />
        </form>

        <p style={{ marginTop: 24, fontSize: 11, color: "var(--color-muted)", textAlign: "center", lineHeight: 1.5 }}>
          Le branding (logo, palette, ton éditorial) se configurera dans les paramètres après la création.
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 12, color: "var(--color-muted)", fontWeight: 500 }}>{label}</span>
      <input
        name={name}
        type="text"
        required={required}
        placeholder={placeholder}
        style={{
          padding: "12px 14px",
          borderRadius: 12,
          border: "1px solid var(--color-line)",
          background: "#fff",
          fontSize: 14,
          fontFamily: "inherit",
          color: "var(--color-ink)",
          outline: "none",
        }}
      />
      {hint && <span style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2 }}>{hint}</span>}
    </label>
  );
}
