import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PresentClient } from "./present-client";

export default async function PresentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/present/${id}`);

  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, kind, metadata, created_at, agency_id")
    .eq("id", id)
    .single();

  if (!doc || doc.kind !== "presentation") notFound();

  const meta = (doc.metadata ?? {}) as {
    framework?: string;
    duration_minutes?: number;
    slide_count?: number;
    markdown?: string;
  };

  // Reparser les slides depuis le markdown stocké
  const slides = parseSlidesFromMarkdown(meta.markdown ?? "");

  return (
    <PresentClient
      title={doc.title}
      framework={meta.framework ?? ""}
      durationMinutes={meta.duration_minutes ?? 0}
      slides={slides}
    />
  );
}

type ParsedSlide = {
  number: number;
  title: string;
  body: string[];
  speaker_notes?: string;
  visual_prompt?: string;
  duration_seconds?: number;
};

function parseSlidesFromMarkdown(md: string): ParsedSlide[] {
  if (!md) return [];
  const blocks = md.split(/^## Slide /m).slice(1);
  return blocks.map((block, idx) => {
    const lines = block.split("\n");
    const headerMatch = lines[0].match(/^(\d+)\s+—\s+(.+)$/);
    const number = headerMatch ? parseInt(headerMatch[1], 10) : idx + 1;
    const title = headerMatch ? headerMatch[2].trim() : `Slide ${idx + 1}`;

    const body: string[] = [];
    let speaker = "";
    let visual = "";
    let duration = 0;

    for (let i = 1; i < lines.length; i++) {
      const l = lines[i].trim();
      if (l.startsWith("- ")) body.push(l.slice(2));
      else if (l.startsWith("> 🎤")) speaker = l.replace(/^> 🎤\s*\*\*Notes orateur\*\*\s*—\s*/, "").trim();
      else if (l.startsWith("**Prompt visuel**")) visual = l.replace(/^\*\*Prompt visuel\*\*\s*:\s*/, "").replace(/`/g, "").trim();
      else if (l.startsWith("*Layout")) {
        const m = l.match(/Durée\s*:\s*(\d+)s/);
        if (m) duration = parseInt(m[1], 10);
      }
    }

    return { number, title, body, speaker_notes: speaker, visual_prompt: visual, duration_seconds: duration };
  });
}
