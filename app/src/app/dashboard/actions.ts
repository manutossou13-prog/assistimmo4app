"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runTom, type TomResult } from "@/lib/agents/tom";
import { runSarah, type SarahInput, type SarahResult } from "@/lib/agents/sarah";

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

  const input = String(formData.get("listing") ?? "").trim();
  if (input.length < 20) {
    return { ok: false, error: "Coller une URL ou un texte d'annonce (≥ 20 caractères)." };
  }

  // Trace du run
  const { data: run } = await supabase
    .from("agent_runs")
    .insert({
      agency_id: agencyId,
      user_id: user.id,
      intent: `tom.investigate: ${input.slice(0, 80)}`,
      plan: { agents: ["tom"], steps: ["extract", "ademe_query", "score"] },
      status: "running",
    })
    .select("id")
    .single();

  const runId = run?.id ?? null;

  try {
    const result = await runTom(input);

    // Persist agent_step
    if (runId) {
      await supabase.from("agent_steps").insert({
        run_id: runId,
        agent_slug: "tom",
        input: { listing: input.slice(0, 500) },
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
          source_url: input.startsWith("http") ? input : null,
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
        input: { listing: input.slice(0, 500) },
        error: message,
      });
    }
    return { ok: false, error: message };
  }
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
