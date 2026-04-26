import Link from "next/link";
import { AssistimmoMark } from "@/components/brand/logo";
import { signup } from "../login/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: "rgba(255,255,255,.6)",
        border: "1px solid var(--color-line)",
        borderRadius: 24,
        padding: "44px 38px",
        backdropFilter: "blur(8px)",
        boxShadow: "0 30px 80px rgba(12,12,12,.10)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "linear-gradient(135deg, var(--color-cream-2), var(--color-cream-3))",
            border: "1px solid rgba(155,138,114,.2)",
            display: "grid",
            placeItems: "center",
            color: "var(--color-taupe-d)",
            marginBottom: 14,
          }}>
            <AssistimmoMark size={32} />
          </div>
          <p className="mono">Création de compte</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, marginTop: 8, color: "var(--color-ink)", textAlign: "center" }}>
            Rejoindre Assistimmo
          </h1>
        </div>

        {params.error && (
          <div style={{
            marginBottom: 18,
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(177,56,24,.08)",
            border: "1px solid rgba(177,56,24,.25)",
            color: "#7d2811",
            fontSize: 13,
          }}>
            {params.error}
          </div>
        )}

        <form action={signup} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Nom complet" name="full_name" type="text" required autoComplete="name" placeholder="Marie Lefebvre" />
          <Field label="Email" name="email" type="email" required autoComplete="email" placeholder="vous@agence.fr" />
          <Field label="Mot de passe" name="password" type="password" required autoComplete="new-password" />

          <button type="submit" style={{
            marginTop: 10,
            padding: "13px 20px",
            borderRadius: 999,
            background: "var(--color-ink)",
            color: "var(--color-cream)",
            border: "none",
            fontWeight: 500,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: "0 14px 32px rgba(12,12,12,.18)",
          }}>
            Créer mon compte →
          </button>
        </form>

        <p style={{ marginTop: 28, fontSize: 13, color: "var(--color-muted)", textAlign: "center" }}>
          Déjà un compte ?{" "}
          <Link href="/login" style={{ color: "var(--color-taupe-d)", fontWeight: 500 }}>
            Se connecter
          </Link>
        </p>

        <p style={{ marginTop: 24, fontSize: 11, color: "var(--color-muted)", textAlign: "center", lineHeight: 1.5 }}>
          En créant un compte, vous acceptez nos conditions d&apos;utilisation et notre politique de confidentialité (RGPD, hébergement UE).
        </p>
      </div>
    </main>
  );
}

function Field({ label, name, type, required, autoComplete, placeholder }: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, color: "var(--color-muted)", fontWeight: 500 }}>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
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
    </label>
  );
}
