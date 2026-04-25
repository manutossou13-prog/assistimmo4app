import { AssistimmoMark } from "@/components/brand/logo";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-8"
             style={{
               background: "linear-gradient(135deg, var(--color-cream-2), var(--color-cream-3))",
               border: "1px solid rgba(155,138,114,.2)",
               color: "var(--color-taupe-d)",
             }}>
          <AssistimmoMark size={48} />
        </div>

        <p className="mono mb-4">L&apos;OS immobilier · 11 agents IA</p>

        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(40px, 6vw, 64px)",
          lineHeight: 1.05,
          color: "var(--color-ink)",
          marginBottom: 18,
        }}>
          Bienvenue sur <em style={{ fontStyle: "normal", color: "var(--color-taupe-d)" }}>Assistimmo</em>
        </h1>

        <p style={{
          fontSize: 17,
          color: "var(--color-muted)",
          maxWidth: 540,
          margin: "0 auto 36px",
          lineHeight: 1.55,
        }}>
          Une seule conversation. Toute votre agence qui exécute. OSCAR comprend votre demande et active les bons agents IA pour produire vos livrables — mandats, courriers, comptes rendus, présentations.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/dashboard" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "13px 24px",
            borderRadius: 999,
            background: "var(--color-ink)",
            color: "var(--color-cream)",
            fontWeight: 500,
            boxShadow: "0 14px 32px rgba(12,12,12,.18)",
            textDecoration: "none",
          }}>
            Ouvrir l&apos;espace OSCAR →
          </a>
          <a href="/login" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "13px 24px",
            borderRadius: 999,
            background: "transparent",
            color: "var(--color-ink)",
            border: "1px solid var(--color-ink)",
            fontWeight: 500,
            textDecoration: "none",
          }}>
            Se connecter
          </a>
        </div>

        <div style={{
          marginTop: 60,
          paddingTop: 30,
          borderTop: "1px solid var(--color-line)",
          display: "flex",
          gap: 24,
          justifyContent: "center",
          flexWrap: "wrap",
          fontSize: 12,
          color: "var(--color-muted)",
        }}>
          <span>🇫🇷 Hébergement EU</span>
          <span>📜 Loi Hoguet</span>
          <span>✍️ eIDAS Yousign</span>
          <span>🔐 RGPD natif</span>
        </div>

        <p style={{ marginTop: 80, fontSize: 11, color: "var(--color-muted)", letterSpacing: ".05em" }}>
          v0.1.0 · scaffold initial · MVP en construction
        </p>
      </div>
    </main>
  );
}
