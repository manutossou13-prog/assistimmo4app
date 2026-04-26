import { redirect } from "next/navigation";
import { AssistimmoMark } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../login/actions";
import { TomForm } from "./tom-form";
import { SarahForm } from "./sarah-form";

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

  // Si pas d'agence, on bascule sur l'onboarding
  if (!memberships || memberships.length === 0) {
    redirect("/onboarding");
  }

  const firstMembership = memberships[0];
  const agency = firstMembership.agency as unknown as { id: string; name: string; city: string | null } | null;
  const agencyName = agency?.name ?? "—";
  const agencyCity = agency?.city ?? null;
  const role = firstMembership.role;

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
          {agencyName} {agencyCity ? `· ${agencyCity}` : ""} est connectée. Tom, Nora, Sarah et Léa arrivent dans les prochains jours — chaque agent un par un.
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
          <Row label="Agence" value={agencyName} ok />
          <Row label="Rôle" value={role} ok />
        </div>

        {/* TOM — premier agent live */}
        <TomForm />

        {/* SARAH — copywriter terrain */}
        <SarahForm />

        <p style={{ marginTop: 60, fontSize: 11, color: "var(--color-muted)", letterSpacing: ".05em", textAlign: "center" }}>
          v0.5.0 · TOM (DPE/ADEME + Street View) · SARAH (copywriter multi-canal)
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
