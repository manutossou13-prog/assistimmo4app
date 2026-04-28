"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runTom, runTomManual, type TomResult, type TomManualInput } from "@/lib/agents/tom";
import { runSarah, type SarahInput, type SarahResult } from "@/lib/agents/sarah";
import { runEmma, emmaToMarkdown, type EmmaInput, type EmmaResult } from "@/lib/agents/emma";
import { runStella, type StellaInput, type StellaResult } from "@/lib/agents/stella";
import { runLea, type LeaInput, type LeaResult } from "@/lib/agents/lea";
import { runFranck, type FranckInput, type FranckResult } from "@/lib/agents/franck";
import { runGabriel, type GabrielInput, type GabrielResult } from "@/lib/agents/gabriel";
import { runInes, type InesInput, type InesResult } from "@/lib/agents/ines";
import { runHugo, type HugoInput, type HugoResult } from "@/lib/agents/hugo";
import { fetchAirtableRecords, recordsToCsv } from "@/lib/integrations/airtable";
import { runNora, type NoraInput, type NoraResult, type NoraSellerInput } from "@/lib/agents/nora";

export type TomActionResult =
  | { ok: true; result: TomResult; property_id?: string }
  | { ok: false; error: string };

export async function investigateListingAction(
  _prev: TomActionResult | null,
  formData: FormData
): Promise<TomActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non connecté." };

  const { data: memberships } = await supabase
    .from("memberships")
    .select("agency_id")
    .eq("user_id", user.id)
    .limit(1);

  const agencyId = memberships?.[0]?.agency_id;
  if (!agencyId) return { ok: false, error: "Aucune agence rattachée." };

  // Lecture des champs structurés (mode manuel)
  const city = String(formData.get("city") ?? "").trim();
  const zipcode = String(formData.get("zipcode") ?? "").trim() || null;
  const typeRaw = String(formData.get("type") ?? "").trim();
  const type =
    typeRaw === "house" || typeRaw === "apartment" || typeRaw === "land" || typeRaw === "commercial"
      ? (typeRaw as TomManualInput["type"])
      : null;
  const surface_habitable = parseFloatOrNull(String(formData.get("surface_habitable") ?? ""));
  const surface_terrain = parseFloatOrNull(String(formData.get("surface_terrain") ?? ""));
  const rooms = parseIntOrNull(String(formData.get("rooms") ?? ""));
  const floor = parseIntOrNull(String(formData.get("floor") ?? ""));
  const dpe_letter = (String(formData.get("dpe_letter") ?? "").trim().toUpperCase() || null) as string | null;
  const ges_letter = (String(formData.get("ges_letter") ?? "").trim().toUpperCase() || null) as string | null;
  const dpe_year = parseIntOrNull(String(formData.get("dpe_year") ?? ""));
  const conso_ep = parseFloatOrNull(String(formData.get("conso_ep") ?? ""));
  const ges_emission = parseFloatOrNull(String(formData.get("ges_emission") ?? ""));
  const price = parseFloatOrNull(String(formData.get("price") ?? ""));
  const agency_name = String(formData.get("agency_name") ?? "").trim() || null;
  const source_url = String(formData.get("source_url") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!city || city.length < 2) {
    return { ok: false, error: "La ville est requise (saisie obligatoire)." };
  }

  const manualInput: TomManualInput = {
    city, zipcode, type, surface_habitable, surface_terrain, rooms, floor,
    dpe_letter, ges_letter, dpe_year, conso_ep, ges_emission,
    price, agency_name, source_url, notes,
  };

  const { data: run } = await supabase
    .from("agent_runs")
    .insert({
      agency_id: agencyId,
      user_id: user.id,
      intent: `tom.manual: ${city} ${dpe_letter ?? ""} ${surface_habitable ?? ""}m²`.trim(),
      plan: { agents: ["tom"], steps: ["ademe_query", "score", "geocode"] },
      status: "running",
    })
    .select("id")
    .single();

  const runId = run?.id ?? null;

  try {
    const result = await runTomManual(manualInput);

    // Persist agent_step
    if (runId) {
      await supabase.from("agent_steps").insert({
        run_id: runId,
        agent_slug: "tom",
        input: manualInput as unknown as Record<string, unknown>,
        output: {
          extraction: result.extraction,
          candidates: result.candidates.map((c) => ({ rank: c.rank, address: c.address, score: c.score })),
          confidence: result.confidence,
          recommendation: result.recommendation,
          priority: result.priority,
        },
        duration_ms: result.meta.duration_ms,
      });
    }

    // Persist property if confident enough
    let propertyId: string | undefined;
    if (result.candidates.length > 0 && result.confidence >= 50) {
      const top = result.candidates[0];
      const { data: prop } = await supabase
        .from("properties")
        .insert({
          agency_id: agencyId,
          owner_user_id: user.id,
          status: result.confidence >= 70 ? "prospect" : "lead",
          type: result.extraction.type,
          address: top.address,
          city: result.extraction.city,
          zipcode: result.extraction.zipcode,
          lat: top.geo?.lat ?? null,
          lng: top.geo?.lng ?? null,
          surface_habitable: result.extraction.surface_habitable,
          rooms: result.extraction.rooms,
          floor: result.extraction.floor,
          dpe_letter: result.extraction.dpe_letter,
          ges_letter: result.extraction.ges_letter,
          price: result.extraction.price,
          source_url: source_url,
          confidence_score: result.confidence,
          metadata: {
            tom_run_id: runId,
            ademe_matches: result.meta.ademe_total_matches,
            features: result.extraction.features,
          },
        })
        .select("id")
        .single();
      propertyId = prop?.id;
    }

    if (runId) {
      await supabase
        .from("agent_runs")
        .update({ status: "done", ended_at: new Date().toISOString() })
        .eq("id", runId);
    }

    revalidatePath("/dashboard");
    return { ok: true, result, property_id: propertyId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur Tom inconnue.";
    if (runId) {
      await supabase
        .from("agent_runs")
        .update({ status: "failed", ended_at: new Date().toISOString() })
        .eq("id", runId);
      await supabase.from("agent_steps").insert({
        run_id: runId,
        agent_slug: "tom",
        input: manualInput as unknown as Record<string, unknown>,
        error: message,
      });
    }
    return { ok: false, error: message };
  }
}

function parseFloatOrNull(s: string): number | null {
  const cleaned = s.replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}
function parseIntOrNull(s: string): number | null {
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

// ============================================================
// SARAH — copywriter terrain
// ============================================================

export type SarahActionResult =
  | { ok: true; result: SarahResult; document_ids: string[] }
  | { ok: false; error: string };

export async function generateContentAction(
  _prev: SarahActionResult | null,
  formData: FormData
): Promise<SarahActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non connecté." };

  const { data: memberships } = await supabase
    .from("memberships")
    .select("agency:agencies(id, name)")
    .eq("user_id", user.id)
    .limit(1);

  const m = memberships?.[0];
  const agency = m?.agency as unknown as { id: string; name: string } | null;
  if (!agency) return { ok: false, error: "Aucune agence rattachée." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const channel = String(formData.get("channel") ?? "courrier") as SarahInput["channel"];
  const tone = String(formData.get("tone") ?? "direct") as SarahInput["tone"];
  const objective = String(formData.get("objective") ?? "obtenir_estimation") as SarahInput["objective"];
  const context = String(formData.get("context") ?? "").trim();
  const cta = String(formData.get("cta") ?? "").trim() || undefined;

  if (context.length < 30) {
    return { ok: false, error: "Context trop court (≥ 30 caractères). Décris le bien, le secteur, la situation vendeur." };
  }

  const { data: run } = await supabase
    .from("agent_runs")
    .insert({
      agency_id: agency.id,
      user_id: user.id,
      intent: `sarah.write: ${channel}/${objective}`,
      plan: { agents: ["sarah"], steps: ["draft", "variants"] },
      status: "running",
    })
    .select("id")
    .single();

  const runId = run?.id ?? null;

  try {
    const result = await runSarah({
      channel,
      tone,
      objective,
      context,
      cta,
      agency_name: agency.name,
      agent_name: profile?.full_name ?? "votre négociateur",
    });

    if (runId) {
      await supabase.from("agent_steps").insert({
        run_id: runId,
        agent_slug: "sarah",
        input: { channel, tone, objective, context_preview: context.slice(0, 200) },
        output: {
          framework: result.framework,
          messages_count: result.messages.length,
          word_counts: result.messages.map((m) => m.word_count),
        },
        duration_ms: result.meta.duration_ms,
      });
    }

    // Persiste chaque variante comme document (kind=courrier/email selon canal)
    const docKind: "courrier" | "email" | "sms" | "autre" =
      channel === "courrier" ? "courrier" : channel === "email" ? "email" : channel === "sms" ? "sms" : "autre";

    const docInserts = result.messages.map((msg, i) => ({
      agency_id: agency.id,
      owner_user_id: user.id,
      kind: docKind,
      title: `${OBJECTIVE_TITLE[objective]} — ${msg.label} (${channel})`,
      format: "md" as const,
      metadata: {
        sarah_run_id: runId,
        framework: result.framework,
        tone,
        channel,
        objective,
        subject: msg.subject ?? null,
        body: msg.body,
        variant_index: i,
        word_count: msg.word_count,
      },
    }));

    const { data: docs } = await supabase.from("documents").insert(docInserts).select("id");
    const documentIds = (docs ?? []).map((d) => d.id as string);

    if (runId) {
      await supabase
        .from("agent_runs")
        .update({ status: "done", ended_at: new Date().toISOString() })
        .eq("id", runId);
    }

    revalidatePath("/dashboard");
    return { ok: true, result, document_ids: documentIds };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur Sarah inconnue.";
    if (runId) {
      await supabase
        .from("agent_runs")
        .update({ status: "failed", ended_at: new Date().toISOString() })
        .eq("id", runId);
      await supabase.from("agent_steps").insert({
        run_id: runId,
        agent_slug: "sarah",
        input: { channel, tone, objective, context_preview: context.slice(0, 200) },
        error: message,
      });
    }
    return { ok: false, error: message };
  }
}

const OBJECTIVE_TITLE: Record<SarahInput["objective"], string> = {
  obtenir_estimation: "Obtention d'estimation",
  obtenir_mandat: "Obtention de mandat",
  relance_post_estimation: "Relance post-estimation",
  relance_mandat_expire: "Relance mandat expiré",
  reprise_ancien_client: "Reprise contact ancien client",
  remerciement: "Remerciement",
  confirmation_rdv: "Confirmation rendez-vous",
};

// ============================================================
// EMMA — présentations & pitch
// ============================================================

export type EmmaActionResult =
  | { ok: true; result: EmmaResult; markdown: string; document_id: string | null }
  | { ok: false; error: string };

export async function generatePresentationAction(
  _prev: EmmaActionResult | null,
  formData: FormData
): Promise<EmmaActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non connecté." };

  const { data: memberships } = await supabase
    .from("memberships")
    .select("agency:agencies(id, name)")
    .eq("user_id", user.id)
    .limit(1);

  const m = memberships?.[0];
  const agency = m?.agency as unknown as { id: string; name: string } | null;
  if (!agency) return { ok: false, error: "Aucune agence rattachée." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const topic = String(formData.get("topic") ?? "").trim();
  const audience = String(formData.get("audience") ?? "vendeur") as EmmaInput["audience"];
  const objective = String(formData.get("objective") ?? "obtenir_mandat") as EmmaInput["objective"];
  const tone = String(formData.get("tone") ?? "premium") as EmmaInput["tone"];
  const duration_minutes = parseInt(String(formData.get("duration_minutes") ?? "10"), 10);
  const context = String(formData.get("context") ?? "").trim();

  if (topic.length < 5) {
    return { ok: false, error: "Le sujet est trop court (≥ 5 caractères)." };
  }
  if (context.length < 30) {
    return { ok: false, error: "Le contexte est trop court (≥ 30 caractères)." };
  }
  if (isNaN(duration_minutes) || duration_minutes < 2 || duration_minutes > 60) {
    return { ok: false, error: "Durée invalide (entre 2 et 60 minutes)." };
  }

  const { data: run } = await supabase
    .from("agent_runs")
    .insert({
      agency_id: agency.id,
      user_id: user.id,
      intent: `emma.deck: ${topic.slice(0, 60)}`,
      plan: { agents: ["emma"], steps: ["plan", "slides", "speaker_notes"] },
      status: "running",
    })
    .select("id")
    .single();

  const runId = run?.id ?? null;

  try {
    const inputObj: EmmaInput = {
      topic,
      audience,
      objective,
      tone,
      duration_minutes,
      context,
      agency_name: agency.name,
      agent_name: profile?.full_name ?? "votre négociateur",
    };
    const result = await runEmma(inputObj);
    const markdown = emmaToMarkdown(result, inputObj);

    if (runId) {
      await supabase.from("agent_steps").insert({
        run_id: runId,
        agent_slug: "emma",
        input: { topic, audience, objective, tone, duration_minutes, context_preview: context.slice(0, 200) },
        output: {
          framework: result.framework,
          slide_count: result.slide_count,
          total_duration_minutes: result.total_duration_minutes,
        },
        duration_ms: result.meta.duration_ms,
      });
    }

    // Persiste comme document
    const { data: doc } = await supabase
      .from("documents")
      .insert({
        agency_id: agency.id,
        owner_user_id: user.id,
        kind: "presentation" as const,
        title: `Pitch — ${topic.slice(0, 80)}`,
        format: "md" as const,
        metadata: {
          emma_run_id: runId,
          framework: result.framework,
          audience,
          objective,
          tone,
          duration_minutes: result.total_duration_minutes,
          slide_count: result.slide_count,
          markdown,
        },
      })
      .select("id")
      .single();

    if (runId) {
      await supabase
        .from("agent_runs")
        .update({ status: "done", ended_at: new Date().toISOString() })
        .eq("id", runId);
    }

    revalidatePath("/dashboard");
    return { ok: true, result, markdown, document_id: (doc?.id as string) ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur Emma inconnue.";
    if (runId) {
      await supabase
        .from("agent_runs")
        .update({ status: "failed", ended_at: new Date().toISOString() })
        .eq("id", runId);
      await supabase.from("agent_steps").insert({
        run_id: runId,
        agent_slug: "emma",
        input: { topic, audience, objective, tone, duration_minutes, context_preview: context.slice(0, 200) },
        error: message,
      });
    }
    return { ok: false, error: message };
  }
}

// ============================================================
// STELLA — réseaux sociaux
// ============================================================

export type StellaActionResult =
  | { ok: true; result: StellaResult; document_ids: string[] }
  | { ok: false; error: string };

export async function generateSocialAction(
  _prev: StellaActionResult | null,
  formData: FormData
): Promise<StellaActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non connecté." };

  const { data: memberships } = await supabase
    .from("memberships")
    .select("agency:agencies(id, name)")
    .eq("user_id", user.id)
    .limit(1);
  const m = memberships?.[0];
  const agency = m?.agency as unknown as { id: string; name: string } | null;
  if (!agency) return { ok: false, error: "Aucune agence rattachée." };

  const channel = String(formData.get("channel") ?? "linkedin") as StellaInput["channel"];
  const format = String(formData.get("format") ?? "post") as StellaInput["format"];
  const tone = String(formData.get("tone") ?? "expert") as StellaInput["tone"];
  const objective = String(formData.get("objective") ?? "valoriser_bien") as StellaInput["objective"];
  const topic = String(formData.get("topic") ?? "").trim();
  const context = String(formData.get("context") ?? "").trim();

  if (topic.length < 5) return { ok: false, error: "Sujet trop court (≥ 5 caractères)." };
  if (context.length < 30) return { ok: false, error: "Contexte trop court (≥ 30 caractères)." };

  const { data: run } = await supabase
    .from("agent_runs")
    .insert({
      agency_id: agency.id,
      user_id: user.id,
      intent: `stella.social: ${channel}/${format}`,
      plan: { agents: ["stella"], steps: ["copy", "hashtags", "visual_prompt"] },
      status: "running",
    })
    .select("id")
    .single();
  const runId = run?.id ?? null;

  try {
    const result = await runStella({
      channel, format, tone, objective, topic, context,
      agency_name: agency.name,
    });

    if (runId) {
      await supabase.from("agent_steps").insert({
        run_id: runId,
        agent_slug: "stella",
        input: { channel, format, tone, objective, topic, context_preview: context.slice(0, 200) },
        output: { framework: result.framework, post_count: result.posts.length },
        duration_ms: result.meta.duration_ms,
      });
    }

    const docInserts = result.posts.map((p, i) => ({
      agency_id: agency.id,
      owner_user_id: user.id,
      kind: "autre" as const,
      title: `Post ${STELLA_CHANNEL_LABEL[channel]} — ${topic.slice(0, 60)} (variante ${i + 1})`,
      format: "md" as const,
      metadata: {
        stella_run_id: runId,
        framework: result.framework,
        channel, format, tone, objective,
        hook: p.hook,
        body: p.body,
        cta: p.cta,
        hashtags: p.hashtags,
        visual_prompt: p.visual_prompt,
        carrousel_slides: p.carrousel_slides ?? null,
        variant_index: i,
        word_count: p.word_count,
      },
    }));

    const { data: docs } = await supabase.from("documents").insert(docInserts).select("id");
    const documentIds = (docs ?? []).map((d) => d.id as string);

    if (runId) {
      await supabase.from("agent_runs")
        .update({ status: "done", ended_at: new Date().toISOString() })
        .eq("id", runId);
    }

    revalidatePath("/dashboard");
    return { ok: true, result, document_ids: documentIds };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur Stella inconnue.";
    if (runId) {
      await supabase.from("agent_runs")
        .update({ status: "failed", ended_at: new Date().toISOString() })
        .eq("id", runId);
      await supabase.from("agent_steps").insert({
        run_id: runId,
        agent_slug: "stella",
        input: { channel, format, tone, objective, topic, context_preview: context.slice(0, 200) },
        error: message,
      });
    }
    return { ok: false, error: message };
  }
}

const STELLA_CHANNEL_LABEL: Record<StellaInput["channel"], string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube_short: "YT Shorts",
};

// ============================================================
// LÉA — comptes rendus & relation client
// ============================================================

export type LeaActionResult =
  | { ok: true; result: LeaResult; document_id: string | null; meeting_report_id: string | null }
  | { ok: false; error: string };

export async function generateMeetingReportAction(
  _prev: LeaActionResult | null,
  formData: FormData
): Promise<LeaActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non connecté." };

  const { data: memberships } = await supabase
    .from("memberships")
    .select("agency:agencies(id, name)")
    .eq("user_id", user.id)
    .limit(1);
  const m = memberships?.[0];
  const agency = m?.agency as unknown as { id: string; name: string } | null;
  if (!agency) return { ok: false, error: "Aucune agence rattachée." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const meeting_kind = String(formData.get("meeting_kind") ?? "visit_buyer") as LeaInput["meeting_kind"];
  const participants = String(formData.get("participants") ?? "").trim();
  const property_context = String(formData.get("property_context") ?? "").trim() || null;
  const objective = String(formData.get("objective") ?? "").trim() || null;
  const raw = String(formData.get("raw") ?? "").trim();

  if (raw.length < 50) {
    return { ok: false, error: "Notes/transcript trop court (≥ 50 caractères). Colle au moins une dizaine de phrases." };
  }
  if (!participants) {
    return { ok: false, error: "Indique au moins les participants (ex: \"M. Martin acheteur, Marie L. négo\")." };
  }

  const { data: run } = await supabase
    .from("agent_runs")
    .insert({
      agency_id: agency.id,
      user_id: user.id,
      intent: `lea.cr: ${meeting_kind}`,
      plan: { agents: ["lea"], steps: ["structure", "extract_intentions", "draft_email"] },
      status: "running",
    })
    .select("id")
    .single();
  const runId = run?.id ?? null;

  try {
    const result = await runLea({
      meeting_kind,
      participants,
      property_context,
      objective,
      raw,
      agency_name: agency.name,
      agent_name: profile?.full_name ?? "votre négociateur",
    });

    if (runId) {
      await supabase.from("agent_steps").insert({
        run_id: runId,
        agent_slug: "lea",
        input: { meeting_kind, participants, raw_preview: raw.slice(0, 400) },
        output: {
          context: result.context,
          key_points_count: result.key_points.length,
          tasks_count: result.tasks.length,
        },
        duration_ms: result.meta.duration_ms,
      });
    }

    // Persist meeting_report
    const { data: mr } = await supabase
      .from("meeting_reports")
      .insert({
        agency_id: agency.id,
        kind: meeting_kind,
        participants: { raw: participants },
        transcript: raw,
        summary_md: buildSummaryMarkdown(result),
        next_actions: result.tasks as unknown as Record<string, unknown>[],
      })
      .select("id")
      .single();
    const mrId = mr?.id ?? null;

    // Persist email draft as document
    const { data: doc } = await supabase
      .from("documents")
      .insert({
        agency_id: agency.id,
        owner_user_id: user.id,
        kind: "email" as const,
        title: `CR ${LEA_KIND_LABEL[meeting_kind]} — email retour`,
        format: "md" as const,
        metadata: {
          lea_run_id: runId,
          meeting_report_id: mrId,
          meeting_kind,
          email_body: result.client_email_draft,
          internal_summary: result.internal_summary,
        },
      })
      .select("id")
      .single();

    // Crée des tasks dans la table dédiée
    if (result.tasks.length > 0) {
      const taskInserts = result.tasks.map((t) => ({
        agency_id: agency.id,
        assignee_user_id: user.id,
        title: t.title,
        status: "open" as const,
        created_by_agent: "lea",
        due_at: null,
      }));
      await supabase.from("tasks").insert(taskInserts);
    }

    if (runId) {
      await supabase.from("agent_runs")
        .update({ status: "done", ended_at: new Date().toISOString() })
        .eq("id", runId);
    }

    revalidatePath("/dashboard");
    return {
      ok: true,
      result,
      document_id: (doc?.id as string) ?? null,
      meeting_report_id: mrId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur Léa inconnue.";
    if (runId) {
      await supabase.from("agent_runs")
        .update({ status: "failed", ended_at: new Date().toISOString() })
        .eq("id", runId);
      await supabase.from("agent_steps").insert({
        run_id: runId,
        agent_slug: "lea",
        input: { meeting_kind, participants, raw_preview: raw.slice(0, 400) },
        error: message,
      });
    }
    return { ok: false, error: message };
  }
}

const LEA_KIND_LABEL: Record<LeaInput["meeting_kind"], string> = {
  visit_buyer: "Visite acheteur",
  visit_seller: "Visite vendeur",
  estimation: "Estimation",
  team: "Réunion équipe",
  client_call: "Appel client",
  negotiation: "Négociation",
};

function buildSummaryMarkdown(r: LeaResult): string {
  const lines: string[] = [];
  lines.push(`## Contexte`, "", r.context, "");
  if (r.key_points.length) {
    lines.push(`## Points clés`, "");
    r.key_points.forEach((p) => lines.push(`- ${p}`));
    lines.push("");
  }
  if (r.intentions.length) {
    lines.push(`## Intentions`, "");
    r.intentions.forEach((p) => lines.push(`- ${p}`));
    lines.push("");
  }
  if (r.objections.length) {
    lines.push(`## Objections`, "");
    r.objections.forEach((p) => lines.push(`- ${p}`));
    lines.push("");
  }
  if (r.engagements.length) {
    lines.push(`## Engagements`, "");
    r.engagements.forEach((p) => lines.push(`- ${p}`));
    lines.push("");
  }
  if (r.vigilance.length) {
    lines.push(`## Points de vigilance`, "");
    r.vigilance.forEach((p) => lines.push(`- ⚠ ${p}`));
    lines.push("");
  }
  if (r.tasks.length) {
    lines.push(`## Tâches`, "");
    r.tasks.forEach((t) => lines.push(`- [ ] **${t.title}** — ${t.assignee} · ${t.due_when}`));
    lines.push("");
  }
  if (r.next_meeting) lines.push(`## Prochain rdv\n\n${r.next_meeting}\n`);
  if (r.client_email_draft) lines.push(`## Email retour client (draft)\n\n${r.client_email_draft}`);
  return lines.join("\n");
}

// ============================================================
// FRANCK — vidéaste
// ============================================================

export type FranckActionResult =
  | { ok: true; result: FranckResult; document_id: string | null }
  | { ok: false; error: string };

export async function generateVideoScriptAction(
  _prev: FranckActionResult | null,
  formData: FormData
): Promise<FranckActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non connecté." };

  const { data: memberships } = await supabase
    .from("memberships")
    .select("agency:agencies(id, name)")
    .eq("user_id", user.id)
    .limit(1);
  const m = memberships?.[0];
  const agency = m?.agency as unknown as { id: string; name: string } | null;
  if (!agency) return { ok: false, error: "Aucune agence rattachée." };

  const video_kind = String(formData.get("video_kind") ?? "bien") as FranckInput["video_kind"];
  const channel = String(formData.get("channel") ?? "reel") as FranckInput["channel"];
  const duration_seconds = parseInt(String(formData.get("duration_seconds") ?? "30"), 10);
  const style = String(formData.get("style") ?? "cinematique") as FranckInput["style"];
  const topic = String(formData.get("topic") ?? "").trim();
  const context = String(formData.get("context") ?? "").trim();

  if (topic.length < 5) return { ok: false, error: "Sujet trop court (≥ 5 caractères)." };
  if (context.length < 30) return { ok: false, error: "Contexte trop court (≥ 30 caractères)." };
  if (isNaN(duration_seconds) || duration_seconds < 10 || duration_seconds > 600) {
    return { ok: false, error: "Durée invalide (10-600 secondes)." };
  }

  const { data: run } = await supabase
    .from("agent_runs")
    .insert({
      agency_id: agency.id,
      user_id: user.id,
      intent: `franck.video: ${video_kind}/${channel}/${duration_seconds}s`,
      plan: { agents: ["franck"], steps: ["hook", "shots", "voiceover", "captions"] },
      status: "running",
    })
    .select("id")
    .single();
  const runId = run?.id ?? null;

  try {
    const result = await runFranck({
      video_kind, channel, duration_seconds, style, topic, context,
      agency_name: agency.name,
    });

    if (runId) {
      await supabase.from("agent_steps").insert({
        run_id: runId,
        agent_slug: "franck",
        input: { video_kind, channel, duration_seconds, style, topic },
        output: { hook: result.hook_3s, shots_count: result.shots.length },
        duration_ms: result.meta.duration_ms,
      });
    }

    const { data: doc } = await supabase
      .from("documents")
      .insert({
        agency_id: agency.id,
        owner_user_id: user.id,
        kind: "autre" as const,
        title: `Script vidéo ${channel} — ${topic.slice(0, 60)}`,
        format: "md" as const,
        metadata: {
          franck_run_id: runId,
          video_kind, channel, duration_seconds, style,
          hook_3s: result.hook_3s,
          shots: result.shots,
          voiceover_full: result.voiceover_full,
          caption_post: result.caption_post,
          hashtags: result.hashtags,
          music_brief: result.music_brief,
          shot_list_to_film: result.shot_list_to_film,
        },
      })
      .select("id")
      .single();

    if (runId) {
      await supabase.from("agent_runs")
        .update({ status: "done", ended_at: new Date().toISOString() })
        .eq("id", runId);
    }

    revalidatePath("/dashboard");
    return { ok: true, result, document_id: (doc?.id as string) ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur Franck inconnue.";
    if (runId) {
      await supabase.from("agent_runs")
        .update({ status: "failed", ended_at: new Date().toISOString() })
        .eq("id", runId);
      await supabase.from("agent_steps").insert({
        run_id: runId,
        agent_slug: "franck",
        input: { video_kind, channel, duration_seconds, style, topic },
        error: message,
      });
    }
    return { ok: false, error: message };
  }
}

// ============================================================
// GABRIEL — pilote financier
// ============================================================

export type GabrielActionResult =
  | { ok: true; result: GabrielResult; document_id: string | null }
  | { ok: false; error: string };

export async function analyzeFinanceAction(
  _prev: GabrielActionResult | null,
  formData: FormData
): Promise<GabrielActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non connecté." };

  const { data: memberships } = await supabase
    .from("memberships")
    .select("agency:agencies(id, name)")
    .eq("user_id", user.id)
    .limit(1);
  const m = memberships?.[0];
  const agency = m?.agency as unknown as { id: string; name: string } | null;
  if (!agency) return { ok: false, error: "Aucune agence rattachée." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const mode = String(formData.get("mode") ?? "analyse") as GabrielInput["mode"];
  const data_raw = String(formData.get("data_raw") ?? "").trim();
  const period_label = String(formData.get("period_label") ?? "").trim() || null;
  const monthly_revenue = parseFloatOrNull(String(formData.get("monthly_revenue") ?? ""));
  const context = String(formData.get("context") ?? "").trim() || null;

  if (data_raw.length < 30) {
    return { ok: false, error: "Données trop courtes (≥ 30 caractères). Colle ton tableau Excel ou décris la charge." };
  }

  const { data: run } = await supabase
    .from("agent_runs")
    .insert({
      agency_id: agency.id,
      user_id: user.id,
      intent: `gabriel.${mode}: ${period_label ?? ""}`,
      plan: { agents: ["gabriel"], steps: ["categorize", "score", "recommend"] },
      status: "running",
    })
    .select("id")
    .single();
  const runId = run?.id ?? null;

  try {
    const result = await runGabriel({
      mode, data_raw, period_label, monthly_revenue, context,
      agency_name: agency.name,
      agent_name: profile?.full_name ?? "le dirigeant",
    });

    if (runId) {
      await supabase.from("agent_steps").insert({
        run_id: runId,
        agent_slug: "gabriel",
        input: { mode, period_label, data_preview: data_raw.slice(0, 400) },
        output: {
          total_yearly: result.total_charges_yearly,
          recos: result.recommendations.length,
          alerts: result.alerts.length,
        },
        duration_ms: result.meta.duration_ms,
      });
    }

    const docTitle =
      mode === "resiliation"
        ? `Lettre de résiliation — ${period_label ?? "à compléter"}`
        : `Analyse financière — ${period_label ?? "période non précisée"}`;

    const docKind = mode === "resiliation" ? "resiliation" : "autre";

    const { data: doc } = await supabase
      .from("documents")
      .insert({
        agency_id: agency.id,
        owner_user_id: user.id,
        kind: docKind as "resiliation" | "autre",
        title: docTitle,
        format: "md" as const,
        metadata: {
          gabriel_run_id: runId,
          mode, period_label,
          synthese: result.synthese,
          total_charges_monthly: result.total_charges_monthly,
          total_charges_yearly: result.total_charges_yearly,
          recommendations: result.recommendations,
          alerts: result.alerts,
          resiliation_letter: result.resiliation_letter,
        },
      })
      .select("id")
      .single();

    if (runId) {
      await supabase.from("agent_runs")
        .update({ status: "done", ended_at: new Date().toISOString() })
        .eq("id", runId);
    }

    revalidatePath("/dashboard");
    return { ok: true, result, document_id: (doc?.id as string) ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur Gabriel inconnue.";
    if (runId) {
      await supabase.from("agent_runs")
        .update({ status: "failed", ended_at: new Date().toISOString() })
        .eq("id", runId);
      await supabase.from("agent_steps").insert({
        run_id: runId,
        agent_slug: "gabriel",
        input: { mode, data_preview: data_raw.slice(0, 400) },
        error: message,
      });
    }
    return { ok: false, error: message };
  }
}

// ============================================================
// INÈS — recrutement immobilier
// ============================================================

export type InesActionResult =
  | { ok: true; result: InesResult; document_id: string | null; candidate_id: string | null }
  | { ok: false; error: string };

export async function runInesAction(
  _prev: InesActionResult | null,
  formData: FormData
): Promise<InesActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non connecté." };

  const { data: memberships } = await supabase
    .from("memberships")
    .select("agency:agencies(id, name)")
    .eq("user_id", user.id)
    .limit(1);
  const m = memberships?.[0];
  const agency = m?.agency as unknown as { id: string; name: string } | null;
  if (!agency) return { ok: false, error: "Aucune agence rattachée." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const mode = String(formData.get("mode") ?? "fiche_poste") as InesInput["mode"];
  const job_title = String(formData.get("job_title") ?? "").trim();
  const context = String(formData.get("context") ?? "").trim();
  const cv_text = String(formData.get("cv_text") ?? "").trim() || null;
  const candidate_url = String(formData.get("candidate_url") ?? "").trim() || null;

  if (!job_title || job_title.length < 3) {
    return { ok: false, error: "Intitulé du poste requis (≥ 3 caractères)." };
  }
  if (context.length < 30) {
    return { ok: false, error: "Brief trop court (≥ 30 caractères). Décris le poste / candidat / contexte." };
  }
  if (mode === "score_cv" && (!cv_text || cv_text.length < 100)) {
    return { ok: false, error: "Pour scorer un CV, colle au moins 100 caractères de texte de CV." };
  }

  const { data: run } = await supabase
    .from("agent_runs")
    .insert({
      agency_id: agency.id,
      user_id: user.id,
      intent: `ines.${mode}: ${job_title.slice(0, 60)}`,
      plan: { agents: ["ines"], steps: [mode] },
      status: "running",
    })
    .select("id")
    .single();
  const runId = run?.id ?? null;

  try {
    const result = await runInes({
      mode, job_title, context, cv_text, candidate_url,
      agency_name: agency.name,
      agent_name: profile?.full_name ?? "le recruteur",
    });

    if (runId) {
      await supabase.from("agent_steps").insert({
        run_id: runId,
        agent_slug: "ines",
        input: { mode, job_title, context_preview: context.slice(0, 200) },
        output: {
          mode,
          legal_warnings_count: result.legal_warnings.length,
          score_global: result.score_global,
          questions_count: result.questions.length,
        },
        duration_ms: result.meta.duration_ms,
      });
    }

    // Persist as document
    const docTitleByMode: Record<InesInput["mode"], string> = {
      fiche_poste: `Fiche de poste — ${job_title}`,
      message_chasse: `Chasse LinkedIn — ${job_title}`,
      score_cv: `Score CV — ${job_title}`,
      kit_entretien: `Kit entretien — ${job_title}`,
    };

    const { data: doc } = await supabase
      .from("documents")
      .insert({
        agency_id: agency.id,
        owner_user_id: user.id,
        kind: "fiche" as const,
        title: docTitleByMode[mode],
        format: "md" as const,
        metadata: {
          ines_run_id: runId,
          mode,
          job_title,
          job_post_md: result.job_post_md,
          job_post_short: result.job_post_short,
          outreach_subject: result.outreach_subject,
          outreach_body: result.outreach_body,
          outreach_followups: result.outreach_followups,
          score_global: result.score_global,
          score_breakdown: result.score_breakdown,
          strengths: result.strengths,
          to_explore: result.to_explore,
          red_flags: result.red_flags,
          questions: result.questions,
          evaluation_grid: result.evaluation_grid,
          legal_warnings: result.legal_warnings,
        },
      })
      .select("id")
      .single();

    // Si mode = score_cv, persist aussi en candidates
    let candidateId: string | null = null;
    if (mode === "score_cv" && result.score_global !== null && cv_text) {
      // Tentative d'extraction d'un nom depuis le CV (simple heuristique)
      const firstLine = cv_text.split("\n").find((l) => l.trim().length > 5);
      const candidateName = firstLine ? firstLine.trim().slice(0, 80) : null;

      const { data: cand } = await supabase
        .from("candidates")
        .insert({
          agency_id: agency.id,
          full_name: candidateName,
          job_title,
          score: result.score_global,
          score_breakdown: result.score_breakdown,
          strengths: result.strengths,
          to_explore: result.to_explore,
          red_flags: result.red_flags,
          status: "new",
        })
        .select("id")
        .single();
      candidateId = (cand?.id as string) ?? null;
    }

    if (runId) {
      await supabase.from("agent_runs")
        .update({ status: "done", ended_at: new Date().toISOString() })
        .eq("id", runId);
    }

    revalidatePath("/dashboard");
    return {
      ok: true,
      result,
      document_id: (doc?.id as string) ?? null,
      candidate_id: candidateId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur Inès inconnue.";
    if (runId) {
      await supabase.from("agent_runs")
        .update({ status: "failed", ended_at: new Date().toISOString() })
        .eq("id", runId);
      await supabase.from("agent_steps").insert({
        run_id: runId,
        agent_slug: "ines",
        input: { mode, job_title, context_preview: context.slice(0, 200) },
        error: message,
      });
    }
    return { ok: false, error: message };
  }
}

// ============================================================
// HUGO — manager & analyste KPI
// ============================================================

export type HugoActionResult =
  | {
      ok: true;
      result: HugoResult;
      document_id: string | null;
      airtable_meta?: { records_count: number; table: string } | null;
    }
  | { ok: false; error: string };

export async function runHugoAction(
  _prev: HugoActionResult | null,
  formData: FormData
): Promise<HugoActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non connecté." };

  const { data: memberships } = await supabase
    .from("memberships")
    .select("agency:agencies(id, name)")
    .eq("user_id", user.id)
    .limit(1);
  const m = memberships?.[0];
  const agency = m?.agency as unknown as { id: string; name: string } | null;
  if (!agency) return { ok: false, error: "Aucune agence rattachée." };

  const source = String(formData.get("source") ?? "manual") as "manual" | "airtable";
  const period = String(formData.get("period") ?? "month") as HugoInput["period"];
  const period_label = String(formData.get("period_label") ?? "").trim() || "Période courante";
  const targets = String(formData.get("targets") ?? "").trim() || null;
  const context = String(formData.get("context") ?? "").trim() || null;

  let data_raw = "";
  let airtable_meta: { records_count: number; table: string } | null = null;

  if (source === "airtable") {
    const pat = String(formData.get("airtable_pat") ?? "").trim();
    const baseId = String(formData.get("airtable_base_id") ?? "").trim();
    const tableNameOrId = String(formData.get("airtable_table") ?? "").trim();
    const view = String(formData.get("airtable_view") ?? "").trim() || undefined;
    const filterByFormula = String(formData.get("airtable_filter") ?? "").trim() || undefined;

    if (!pat || !pat.startsWith("pat")) {
      return { ok: false, error: "Personal Access Token Airtable manquant ou invalide (doit commencer par 'pat')." };
    }
    if (!baseId || !baseId.startsWith("app")) {
      return { ok: false, error: "Base ID Airtable manquant ou invalide (doit commencer par 'app')." };
    }
    if (!tableNameOrId) {
      return { ok: false, error: "Nom de la table Airtable requis." };
    }

    try {
      const { records } = await fetchAirtableRecords({ pat, baseId, tableNameOrId, view, filterByFormula, maxRecords: 500 });
      if (records.length === 0) {
        return { ok: false, error: "Aucune ligne récupérée depuis Airtable. Vérifie les filtres / la vue / les permissions du PAT." };
      }
      data_raw = recordsToCsv(records);
      airtable_meta = { records_count: records.length, table: tableNameOrId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur Airtable";
      return { ok: false, error: msg };
    }
  } else {
    data_raw = String(formData.get("data_raw") ?? "").trim();
    if (data_raw.length < 30) {
      return { ok: false, error: "Données trop courtes (≥ 30 caractères). Colle un tableau ou un dump CRM." };
    }
  }

  const { data: run } = await supabase
    .from("agent_runs")
    .insert({
      agency_id: agency.id,
      user_id: user.id,
      intent: `hugo.${source}: ${period} ${period_label}`,
      plan: { agents: ["hugo"], steps: ["ingest", "compute_kpi", "alerts", "ranking", "actions"] },
      status: "running",
    })
    .select("id")
    .single();
  const runId = run?.id ?? null;

  try {
    const result = await runHugo({
      period, period_label, targets, context,
      data_raw,
      agency_name: agency.name,
    });

    if (runId) {
      await supabase.from("agent_steps").insert({
        run_id: runId,
        agent_slug: "hugo",
        input: { source, period, period_label, airtable_meta, data_size: data_raw.length },
        output: {
          kpis_count: result.kpis.length,
          alerts_count: result.alerts.length,
          ranking_count: result.ranking.length,
          actions_count: result.actions.length,
        },
        duration_ms: result.meta.duration_ms,
      });
    }

    // Persist KPI snapshot
    await supabase.from("kpi_records").insert({
      agency_id: agency.id,
      period_start: null,
      period_end: null,
      metrics: {
        period_label,
        synthese: result.synthese,
        kpis: result.kpis,
        alerts: result.alerts,
        ranking: result.ranking,
        actions: result.actions,
        airtable_meta,
      },
    } as unknown as Record<string, unknown>);

    // Persist as document (CR pilotage)
    const { data: doc } = await supabase
      .from("documents")
      .insert({
        agency_id: agency.id,
        owner_user_id: user.id,
        kind: "autre" as const,
        title: `Pilotage Hugo — ${period_label}`,
        format: "md" as const,
        metadata: {
          hugo_run_id: runId,
          period, period_label,
          synthese: result.synthese,
          kpis: result.kpis,
          alerts: result.alerts,
          ranking: result.ranking,
          actions: result.actions,
          meeting_brief_md: result.meeting_brief_md,
          airtable_meta,
        },
      })
      .select("id")
      .single();

    if (runId) {
      await supabase.from("agent_runs")
        .update({ status: "done", ended_at: new Date().toISOString() })
        .eq("id", runId);
    }

    revalidatePath("/dashboard");
    return { ok: true, result, document_id: (doc?.id as string) ?? null, airtable_meta };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur Hugo inconnue.";
    if (runId) {
      await supabase.from("agent_runs")
        .update({ status: "failed", ended_at: new Date().toISOString() })
        .eq("id", runId);
      await supabase.from("agent_steps").insert({
        run_id: runId,
        agent_slug: "hugo",
        input: { source, period, period_label },
        error: message,
      });
    }
    return { ok: false, error: message };
  }
}

// ============================================================
// NORA — administratif & mandats
// ============================================================

export type NoraActionResult =
  | { ok: true; result: NoraResult; mandate_id: string; document_id: string }
  | { ok: false; error: string };

export async function generateMandateAction(
  _prev: NoraActionResult | null,
  formData: FormData
): Promise<NoraActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non connecté." };

  const { data: memberships } = await supabase
    .from("memberships")
    .select("agency:agencies(id, name, address, carte_t_number)")
    .eq("user_id", user.id)
    .limit(1);
  const m = memberships?.[0];
  const agency = m?.agency as unknown as {
    id: string;
    name: string;
    address: string | null;
    carte_t_number: string | null;
  } | null;
  if (!agency) return { ok: false, error: "Aucune agence rattachée." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  // Type & dates
  const type = String(formData.get("type") ?? "exclusif") as NoraInput["type"];
  const start_date = String(formData.get("start_date") ?? "").trim();
  const duration_months = parseInt(String(formData.get("duration_months") ?? "3"), 10);

  // Bien
  const property_address = String(formData.get("property_address") ?? "").trim();
  const property_city = String(formData.get("property_city") ?? "").trim() || null;
  const property_zipcode = String(formData.get("property_zipcode") ?? "").trim() || null;
  const property_designation = String(formData.get("property_designation") ?? "").trim();
  const property_surface_habitable = parseFloatOrNull(String(formData.get("property_surface_habitable") ?? ""));
  const property_surface_terrain = parseFloatOrNull(String(formData.get("property_surface_terrain") ?? ""));

  // Vendeurs (1 ou 2)
  const sellers: NoraSellerInput[] = [];
  for (let i = 0; i < 2; i++) {
    const civility = String(formData.get(`seller_${i}_civility`) ?? "").trim();
    const first_name = String(formData.get(`seller_${i}_first_name`) ?? "").trim();
    const last_name = String(formData.get(`seller_${i}_last_name`) ?? "").trim();
    if (!first_name && !last_name) continue;
    sellers.push({
      civility: civility || "M.",
      first_name,
      last_name,
      birth_date: String(formData.get(`seller_${i}_birth_date`) ?? "").trim() || null,
      birth_place: String(formData.get(`seller_${i}_birth_place`) ?? "").trim() || null,
      address: String(formData.get(`seller_${i}_address`) ?? "").trim(),
      email: String(formData.get(`seller_${i}_email`) ?? "").trim() || null,
      phone: String(formData.get(`seller_${i}_phone`) ?? "").trim() || null,
      id_doc_type: String(formData.get(`seller_${i}_id_doc_type`) ?? "").trim() || null,
      id_doc_ref: String(formData.get(`seller_${i}_id_doc_ref`) ?? "").trim() || null,
    });
  }

  // Conditions financières
  const price = parseFloatOrNull(String(formData.get("price") ?? "")) ?? 0;
  const commission_amount = parseFloatOrNull(String(formData.get("commission_amount") ?? ""));
  const commission_pct = parseFloatOrNull(String(formData.get("commission_pct") ?? ""));
  const commission_payer = String(formData.get("commission_payer") ?? "seller") as NoraInput["commission_payer"];

  const special_conditions = String(formData.get("special_conditions") ?? "").trim() || null;

  // Validations
  if (sellers.length === 0) return { ok: false, error: "Au moins un vendeur requis (nom + prénom)." };
  if (!property_address || !property_designation) return { ok: false, error: "Adresse et désignation du bien requises." };
  if (!price || price < 1000) return { ok: false, error: "Prix de mise en vente invalide." };
  if (!start_date) return { ok: false, error: "Date de début du mandat requise." };
  if (isNaN(duration_months) || duration_months < 1 || duration_months > 24) return { ok: false, error: "Durée invalide (1-24 mois)." };
  if (!commission_amount && !commission_pct) return { ok: false, error: "Honoraires requis (montant € OU pourcentage %)." };

  // Numéro de registre via fonction Postgres
  const { data: regData, error: regErr } = await supabase.rpc("next_mandate_registry_number", {
    p_agency_id: agency.id,
  });
  if (regErr || !regData) {
    return { ok: false, error: `Impossible de générer le numéro de registre : ${regErr?.message ?? "erreur inconnue"}` };
  }
  const registry_number = String(regData);

  const { data: run } = await supabase
    .from("agent_runs")
    .insert({
      agency_id: agency.id,
      user_id: user.id,
      intent: `nora.mandate: ${type} ${registry_number}`,
      plan: { agents: ["nora"], steps: ["validate", "generate", "conformity_check", "persist"] },
      status: "running",
    })
    .select("id")
    .single();
  const runId = run?.id ?? null;

  try {
    const inputObj: NoraInput = {
      type,
      sellers,
      property_address,
      property_city,
      property_zipcode,
      property_designation,
      property_surface_habitable,
      property_surface_terrain,
      price,
      commission_amount,
      commission_pct,
      commission_payer,
      start_date,
      duration_months,
      registry_number,
      special_conditions,
      agency_name: agency.name,
      agency_address: agency.address,
      agency_carte_t: agency.carte_t_number,
      agent_full_name: profile?.full_name ?? "le négociateur",
    };

    const result = await runNora(inputObj);

    if (runId) {
      await supabase.from("agent_steps").insert({
        run_id: runId,
        agent_slug: "nora",
        input: { type, registry_number, price, duration_months, sellers_count: sellers.length },
        output: {
          conformity_ok: result.conformity.filter((c) => c.ok).length,
          conformity_total: result.conformity.length,
          warnings_count: result.warnings.length,
        },
        duration_ms: result.meta.duration_ms,
      });
    }

    // Persist document FIRST
    const sellerSummary = sellers.map((s) => `${s.civility} ${s.first_name} ${s.last_name}`).join(" & ");
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .insert({
        agency_id: agency.id,
        owner_user_id: user.id,
        kind: "mandate" as const,
        title: `Mandat ${type} n° ${registry_number} — ${property_address}`,
        format: "md" as const,
        metadata: {
          nora_run_id: runId,
          type,
          registry_number,
          mandate_md: result.mandate_md,
          conformity: result.conformity,
          warnings: result.warnings,
          end_date: result.end_date,
          commission_amount_final: result.commission_amount_final,
          commission_payer,
          legal_disclaimer: result.legal_disclaimer,
          // Pour la page d'impression
          property_address,
          property_city,
          property_zipcode,
          property_designation,
          sellers_summary: sellerSummary,
          price,
          start_date,
          duration_months,
          agency: {
            name: agency.name,
            address: agency.address,
            carte_t: agency.carte_t_number,
          },
          agent_name: profile?.full_name ?? null,
        },
      })
      .select("id")
      .single();

    if (docErr || !doc) {
      throw new Error(`Persist document : ${docErr?.message ?? "inconnu"}`);
    }

    // Persist mandate
    const { data: mandate, error: mandateErr } = await supabase
      .from("mandates")
      .insert({
        agency_id: agency.id,
        type: type === "avenant" ? "simple" : type, // 'avenant' n'est pas un type DB
        start_date,
        end_date: result.end_date,
        price,
        commission: result.commission_amount_final,
        commission_payer,
        status: "draft" as const,
        document_id: doc.id,
        registry_number,
      })
      .select("id")
      .single();

    if (mandateErr || !mandate) {
      throw new Error(`Persist mandate : ${mandateErr?.message ?? "inconnu"}`);
    }

    if (runId) {
      await supabase.from("agent_runs")
        .update({ status: "done", ended_at: new Date().toISOString() })
        .eq("id", runId);
    }

    revalidatePath("/dashboard");
    return { ok: true, result, mandate_id: mandate.id as string, document_id: doc.id as string };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur Nora inconnue.";
    if (runId) {
      await supabase.from("agent_runs")
        .update({ status: "failed", ended_at: new Date().toISOString() })
        .eq("id", runId);
      await supabase.from("agent_steps").insert({
        run_id: runId,
        agent_slug: "nora",
        input: { type, registry_number, sellers_count: sellers.length },
        error: message,
      });
    }
    return { ok: false, error: message };
  }
}
