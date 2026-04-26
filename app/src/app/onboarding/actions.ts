"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createAgency(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || null;
  const zipcode = String(formData.get("zipcode") ?? "").trim() || null;
  const carteT = String(formData.get("carte_t") ?? "").trim() || null;

  if (name.length < 2) {
    return redirect(
      `/onboarding?error=${encodeURIComponent("Le nom de l'agence est requis (≥ 2 caractères).")}`
    );
  }

  const { data: existing } = await supabase
    .from("memberships")
    .select("agency_id")
    .eq("user_id", user.id)
    .limit(1);

  if (existing && existing.length > 0) {
    return redirect("/dashboard");
  }

  const { error } = await supabase.rpc("create_agency_with_owner", {
    p_name: name,
    p_city: city,
    p_carte_t: carteT,
    p_zipcode: zipcode,
  });

  if (error) {
    return redirect(
      `/onboarding?error=${encodeURIComponent(`Erreur création agence : ${error.message}`)}`
    );
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
