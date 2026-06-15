import { supabase, isSupabaseConfigured } from "./supabaseClient";

const LS_KEY = "cform_leads";

// Save one lead (the form submission + answers + which form it came from).
export async function saveLead(lead) {
  const record = { ...lead, created_at: new Date().toISOString() };

  if (isSupabaseConfigured) {
    const { error } = await supabase.from("leads").insert({
      form_slug: record.form_slug,
      form_title: record.form_title,
      name: record.name,
      phone: record.phone,
      email: record.email,
      answers: record.answers, // jsonb
      created_at: record.created_at,
    });
    if (error) throw error;
  } else if (typeof window !== "undefined") {
    const all = readDemo();
    all.unshift({ id: Date.now(), ...record });
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  }

  // Fire-and-forget email alert (only sends if RESEND_API_KEY is set).
  try {
    await fetch("/api/notify-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
  } catch (_) {
    /* never block the user on a notification failure */
  }

  return record;
}

export async function listLeads() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }
  return readDemo();
}

export async function deleteLead(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) throw error;
  } else {
    localStorage.setItem(LS_KEY, JSON.stringify(readDemo().filter((l) => l.id !== id)));
  }
}

// Save admin-only fields (internal note + tags) onto a lead. These are
// for your Lead Center organization only — they are NOT sent to GHL.
export async function updateLead(id, patch) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from("leads").update(patch).eq("id", id);
    if (error) throw error;
  } else {
    const all = readDemo().map((l) => (l.id === id ? { ...l, ...patch } : l));
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  }
}

function readDemo() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch (_) {
    return [];
  }
}
