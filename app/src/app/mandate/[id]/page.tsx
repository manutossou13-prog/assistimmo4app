import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MandatePrintClient } from "./print-client";

export default async function MandatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/mandate/${id}`);

  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, kind, metadata, created_at")
    .eq("id", id)
    .single();

  if (!doc || doc.kind !== "mandate") notFound();

  const meta = (doc.metadata ?? {}) as {
    type?: string;
    registry_number?: string;
    mandate_md?: string;
    legal_disclaimer?: string;
    end_date?: string;
    commission_amount_final?: number;
    sellers_summary?: string;
    property_address?: string;
    agency?: { name?: string; address?: string | null; carte_t?: string | null };
    agent_name?: string | null;
  };

  return (
    <MandatePrintClient
      title={doc.title}
      registryNumber={meta.registry_number ?? "—"}
      mandateMd={meta.mandate_md ?? ""}
      legalDisclaimer={meta.legal_disclaimer ?? ""}
      agencyName={meta.agency?.name ?? ""}
      createdAt={doc.created_at as string}
    />
  );
}
