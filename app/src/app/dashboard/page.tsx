import { redirect } from "next/navigation";
import { AssistimmoMark } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../login/actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, agency:agencies(id, name, city)")
    .eq("user_id", user.id);

  const hasAgency: boolean = Boolean(memberships?.length);
  const firstMembership = memberships?.[0];
  const agencyName = firstMembership
    ? (firstMembership.agency as unknown as { name: string } | null)?.name ?? "non créée"
    : "non créée";
  const role = firstMembership?.role ?? "—";

  return (
    <main className="min-h-screen px-6 py-12">
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Topbar minimal */}
        <header style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          paddingBottom: 24,
          marginBottom: 40,
          borderBottom: "1px solid var(--color-line)",
        }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: "linear-gradient(135deg, var(--color-cream-2), var(--color-cream-3))",
            border: "1px solid rgba(155,138,114,.2)",
            display: "grid",
            placeItems: "center",
            color: "var(--color-taupe-d)",
          }}>
            <AssistimmoMark size={22} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--color-taupe-d)" }}>
              Assistimmo
            </div>
            <div style={{ fontSize: 11, color: "var(--color-muted)", letterSpacing: ".15em", textTransform: "uppercase", marginTop: 2 }}>
              Operating System immobilier
            </div>
          </div>
          <form action={logout} style={{ marginLeft: "auto" }}>
            <button type="submit" style={{
              padding: "9px 16px",
              borderRadius: 999,
              background: "rgba(255,255,255,.6)",
              border: "1px solid var(--color-line)",
              color: "var(--color-ink-2)",
              fontSize: 12.5,
              cursor: "pointer",
            }}>
              Se déconnecter
            </button>
          </form>
        </header>

        <p className="mono" style={{ marginBottom: 8 }}>Espace OSCAR</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 38, lineHeight: 1.05, color: "var(--color-ink)", marginBottom: 14 }}>
          Bonjour {profile?.full_name?.split(" ")[0] ?? "à vous"}.
        </h1>
        <p style={{ color: "var(--color-muted)", fontSize: 16, maxWidth: 580, marginBottom: 40 }}>
          Votre compte est créé et la base de données multi-tenant Supabase est connectée. Prochaine étape : créer votre agence pour activer les agents IA.
        </p>

        {/* Carte état */}
        <div style={{
          background: "rgba(255,255,255,.65)",
          border: "1px solid var(--color-line)",
          borderRadius: 24,
          padding: 28,
          marginBottom: 18,
        }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, marginBottom: 18 }}>État de votre compte</h2>
          <Row label="Email" value={profile?.email ?? user.email ?? ""} />
          <Row label="Nom" value={profile?.full_name ?? "—"} />
          <Row label="Agence" value={agencyName} ok={hasAgency} />
          <Row label="Rôle" value={role} ok={hasAgency} />
        </div>

        {!hasAgency && (
          <div style={{
            background: "linear-gradient(135deg, var(--color-cream-2), var(--color-cream-3))",
            border: "1px solid var(--color-line)",
            borderRadius: 24,
            padding: 28,
          }}>
            <p className="mono" style={{ marginBottom: 8 }}>Prochaine étape</p>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, marginBottom: 10 }}>Créer votre agence</h3>
            <p style={{ color: "var(--color-muted)", fontSize: 14, marginBottom: 18, maxWidth: 540 }}>
              Pour activer OSCAR et les agents IA, vous devez d&apos;abord configurer votre agence (nom, carte T, branding). Cette étape arrive très bientôt.
            </p>
            <span style={{
              display: "inline-block",
              padding: "7px 14px",
              borderRadius: 999,
              background: "rgba(240,196,74,.2)",
              color: "#7d5e08",
              fontSize: 12,
              fontWeight: 500,
            }}>
              ⚙️ Onboarding agence — en construction
            </span>
          </div>
        )}

        <p style={{ marginTop: 60, fontSize: 11, color: "var(--color-muted)", letterSpacing: ".05em", textAlign: "center" }}>
          v0.2.0 · auth Supabase live · scaffold MVP en cours
        </p>
      </div>
    </main>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      padding: "10px 0",
      borderBottom: "1px solid var(--color-line)",
      fontSize: 13.5,
    }}>
      <span style={{ color: "var(--color-muted)" }}>{label}</span>
      <span style={{ color: ok === false ? "var(--color-muted)" : "var(--color-ink)", fontWeight: 500 }}>
        {ok === true && "✓ "}
        {value}
      </span>
    </div>
  );
}
