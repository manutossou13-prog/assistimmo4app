"use client";

type Props = {
  title: string;
  registryNumber: string;
  mandateMd: string;
  legalDisclaimer: string;
  agencyName: string;
  createdAt: string;
};

/**
 * Page imprimable du mandat. Markdown → HTML simple (sans dépendance lourde).
 * Cmd+P / Ctrl+P pour exporter en PDF.
 */
export function MandatePrintClient({
  title,
  registryNumber,
  mandateMd,
  legalDisclaimer,
  agencyName,
  createdAt,
}: Props) {
  const html = mdToHtml(mandateMd);

  return (
    <main style={{ minHeight: "100vh", background: "#f5f2e9" }}>
      {/* Toolbar non-imprimée */}
      <header
        className="no-print"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: "rgba(245,242,233,.85)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid #e8e4dc",
        }}
      >
        <span style={{ fontFamily: "Tenor Sans, serif", fontSize: 16, color: "#7a6b56" }}>Assistimmo</span>
        <span style={{ color: "#6b6b6b", fontSize: 13 }}>·</span>
        <span style={{ fontSize: 13, fontWeight: 500 }}>Mandat n° {registryNumber}</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              padding: "9px 18px",
              borderRadius: 999,
              background: "#0C0C0C",
              color: "#F5F2E9",
              border: "none",
              fontWeight: 500,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            🖨 Imprimer / Sauver en PDF
          </button>
          <a
            href="/dashboard"
            style={{
              padding: "9px 18px",
              borderRadius: 999,
              background: "rgba(255,255,255,.7)",
              color: "#2A2722",
              border: "1px solid #e8e4dc",
              fontWeight: 500,
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            ← Dashboard
          </a>
        </span>
      </header>

      <div style={{ display: "grid", placeItems: "center", padding: "30px 16px 80px" }}>
        <article className="page" style={pageStyle}>
          {/* Header agence */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 16, borderBottom: "2px solid #9B8A72", marginBottom: 28 }}>
            <div>
              <div style={{ fontFamily: "Tenor Sans, serif", fontSize: 22, color: "#7a6b56" }}>Assistimmo</div>
              <div style={{ fontSize: 11, color: "#6b6b6b", letterSpacing: ".15em", textTransform: "uppercase", marginTop: 3 }}>
                {agencyName || "Agence"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#9B8A72", letterSpacing: ".15em", textTransform: "uppercase" }}>
                Mandat n° {registryNumber}
              </div>
              <div style={{ fontSize: 10, color: "#6b6b6b", marginTop: 3 }}>
                Émis le {new Date(createdAt).toLocaleDateString("fr-FR")}
              </div>
            </div>
          </div>

          <div className="mandate-content" dangerouslySetInnerHTML={{ __html: html }} />

          {legalDisclaimer && (
            <div className="no-print" style={{ marginTop: 40, padding: 14, background: "rgba(240,196,74,.12)", border: "1px solid rgba(240,196,74,.3)", borderRadius: 10, fontSize: 11.5, color: "#7d5e08", lineHeight: 1.6 }}>
              {legalDisclaimer}
            </div>
          )}
        </article>
      </div>

      <style>{`
        body { margin: 0; }

        .mandate-content h1 {
          font-family: 'Tenor Sans', serif;
          font-size: 24px;
          line-height: 1.2;
          color: #0C0C0C;
          margin: 0 0 24px;
          text-align: center;
          letter-spacing: .005em;
        }
        .mandate-content h2 {
          font-family: 'Tenor Sans', serif;
          font-size: 16px;
          color: #7a6b56;
          letter-spacing: .05em;
          text-transform: uppercase;
          margin: 28px 0 10px;
          padding-bottom: 6px;
          border-bottom: 1px solid #e8e4dc;
        }
        .mandate-content h3 {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #2A2722;
          font-weight: 600;
          margin: 14px 0 6px;
          letter-spacing: .03em;
        }
        .mandate-content p {
          margin: 8px 0;
          font-size: 12px;
          line-height: 1.7;
          color: #2A2722;
          text-align: justify;
        }
        .mandate-content ul, .mandate-content ol {
          font-size: 12px;
          line-height: 1.7;
          padding-left: 22px;
          margin: 8px 0;
        }
        .mandate-content li { margin: 4px 0; }
        .mandate-content strong { color: #0C0C0C; }
        .mandate-content code {
          background: #faf7ef;
          padding: 1px 5px;
          border-radius: 3px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
        }
        .mandate-content hr {
          margin: 22px 0;
          border: none;
          border-top: 1px solid #e8e4dc;
        }

        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 18mm 16mm !important;
            max-width: 100% !important;
          }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  width: "210mm",
  minHeight: "297mm",
  background: "#fff",
  padding: "20mm 18mm",
  boxShadow: "0 30px 80px rgba(12,12,12,.10)",
  fontFamily: "DM Sans, sans-serif",
  color: "#0C0C0C",
};

/**
 * Markdown → HTML très simple (titres, gras, listes, paragraphes, séparateurs).
 * Pas de dépendance externe pour rester léger.
 */
function mdToHtml(md: string): string {
  if (!md) return "<p><em>Aucun contenu de mandat.</em></p>";

  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (inList && listType) {
      out.push(`</${listType}>`);
      inList = false;
      listType = null;
    }
  };

  const inline = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+?)`/g, "<code>$1</code>");

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) {
      flushList();
      continue;
    }

    // Headings
    if (/^# /.test(line)) { flushList(); out.push(`<h1>${inline(line.slice(2))}</h1>`); continue; }
    if (/^## /.test(line)) { flushList(); out.push(`<h2>${inline(line.slice(3))}</h2>`); continue; }
    if (/^### /.test(line)) { flushList(); out.push(`<h3>${inline(line.slice(4))}</h3>`); continue; }
    if (/^---$/.test(line)) { flushList(); out.push("<hr/>"); continue; }

    // Lists
    if (/^- /.test(line)) {
      if (!inList || listType !== "ul") { flushList(); out.push("<ul>"); inList = true; listType = "ul"; }
      out.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      if (!inList || listType !== "ol") { flushList(); out.push("<ol>"); inList = true; listType = "ol"; }
      out.push(`<li>${inline(line.replace(/^\d+\.\s/, ""))}</li>`);
      continue;
    }

    flushList();
    out.push(`<p>${inline(line)}</p>`);
  }

  flushList();
  return out.join("\n");
}
