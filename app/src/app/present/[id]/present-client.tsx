"use client";

import { useEffect, useState } from "react";

type Slide = {
  number: number;
  title: string;
  body: string[];
  speaker_notes?: string;
  visual_prompt?: string;
  duration_seconds?: number;
};

export function PresentClient({
  title,
  framework,
  durationMinutes,
  slides,
}: {
  title: string;
  framework: string;
  durationMinutes: number;
  slides: Slide[];
}) {
  const [current, setCurrent] = useState(0);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        setCurrent((c) => Math.min(slides.length - 1, c + 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setCurrent((c) => Math.max(0, c - 1));
      } else if (e.key === "Home") {
        setCurrent(0);
      } else if (e.key === "End") {
        setCurrent(slides.length - 1);
      } else if (e.key === "n" || e.key === "N") {
        setShowNotes((v) => !v);
      } else if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length]);

  if (slides.length === 0) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--color-cream)" }}>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 24 }}>Aucune slide à afficher.</p>
      </main>
    );
  }

  const slide = slides[current];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, var(--color-cream-2) 0%, #fff 50%, var(--color-cream-3) 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* halos décoratifs */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(700px 500px at 12% 0%, rgba(155,138,114,.18), transparent 60%), radial-gradient(900px 600px at 95% 100%, rgba(197,169,121,.12), transparent 60%)",
        }}
      />

      {/* topbar */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: "rgba(245,242,233,.65)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid var(--color-line)",
          zIndex: 10,
        }}
      >
        <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--color-taupe-d)" }}>
          Assistimmo
        </span>
        <span style={{ color: "var(--color-muted)", fontSize: 13 }}>·</span>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{title}</span>
        <span style={{ color: "var(--color-muted)", fontSize: 12, marginLeft: "auto" }}>
          {framework} · {durationMinutes}min · slide {current + 1}/{slides.length}
        </span>
      </header>

      {/* slide */}
      <section
        style={{
          minHeight: "100vh",
          padding: "120px 8vw 140px",
          display: "grid",
          placeItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ maxWidth: 980, width: "100%" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: ".2em",
              textTransform: "uppercase",
              color: "var(--color-taupe)",
              marginBottom: 14,
            }}
          >
            Slide {String(slide.number).padStart(2, "0")}
            {slide.duration_seconds ? ` · ${slide.duration_seconds}s` : ""}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(36px, 5vw, 64px)",
              lineHeight: 1.05,
              color: "var(--color-ink)",
              marginBottom: 36,
              letterSpacing: ".005em",
            }}
          >
            {slide.title}
          </h1>
          {slide.body.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
              {slide.body.map((b, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: "clamp(18px, 1.6vw, 24px)",
                    lineHeight: 1.55,
                    color: "var(--color-ink-2)",
                    paddingLeft: 24,
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "0.7em",
                      width: 10,
                      height: 2,
                      background: "var(--color-taupe)",
                    }}
                  />
                  {b}
                </li>
              ))}
            </ul>
          )}
          {showNotes && slide.speaker_notes && (
            <div
              style={{
                marginTop: 40,
                padding: "16px 20px",
                background: "rgba(27,42,78,.06)",
                border: "1px solid rgba(27,42,78,.15)",
                borderRadius: 14,
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--color-ink-2)",
                fontStyle: "italic",
              }}
            >
              🎤 {slide.speaker_notes}
            </div>
          )}
        </div>
      </section>

      {/* footer / nav */}
      <footer
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "rgba(245,242,233,.65)",
          backdropFilter: "blur(14px)",
          borderTop: "1px solid var(--color-line)",
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          style={navBtn(current === 0)}
        >
          ← précédent
        </button>
        <button
          type="button"
          onClick={() => setCurrent((c) => Math.min(slides.length - 1, c + 1))}
          disabled={current === slides.length - 1}
          style={navBtn(current === slides.length - 1)}
        >
          suivant →
        </button>
        <div style={{ flex: 1, display: "flex", gap: 4, justifyContent: "center", overflowX: "auto", padding: "0 12px" }}>
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                background: i === current ? "var(--color-ink)" : "rgba(255,255,255,.7)",
                color: i === current ? "var(--color-cream)" : "var(--color-muted)",
                fontWeight: 500,
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setShowNotes((v) => !v)} style={navBtn(false)}>
          {showNotes ? "🙈 notes" : "🎤 notes (N)"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen();
            else document.documentElement.requestFullscreen?.();
          }}
          style={navBtn(false)}
        >
          ⛶ plein écran (F)
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          style={navBtn(false)}
          title="Cmd+P pour exporter en PDF"
        >
          🖨 PDF
        </button>
      </footer>

      <style>{`
        @media print {
          header, footer { display: none !important; }
          section { padding: 40px 60px !important; min-height: 100vh; page-break-after: always; }
          body::before { display: none; }
        }
      `}</style>
    </main>
  );
}

function navBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 999,
    border: "1px solid var(--color-line)",
    background: disabled ? "rgba(255,255,255,.4)" : "rgba(255,255,255,.85)",
    color: disabled ? "var(--color-muted)" : "var(--color-ink-2)",
    fontSize: 12,
    fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
  };
}
