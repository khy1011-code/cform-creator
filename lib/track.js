import { supabase, isSupabaseConfigured } from "./supabaseClient";

const LS_KEY = "cform_events";

// One id per visitor session (kept across the multi-step flow, reset on a
// fresh visit). Used to count UNIQUE visitors that reach each step.
export function getSessionId() {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = sessionStorage.getItem("cform_sid");
    if (!id) {
      id = (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : String(Date.now()) + Math.random();
      sessionStorage.setItem("cform_sid", id);
    }
    return id;
  } catch (_) {
    return "anon";
  }
}

// Record that this visitor reached a step. FIRE-AND-FORGET — never awaited
// in the form, wrapped in try/catch, errors swallowed. Cannot affect the
// user, the submit, the Pixel, the CAPI, or GHL in any way.
export function logStep(formSlug, step) {
  try {
    const session_id = getSessionId();
    if (isSupabaseConfigured && supabase) {
      supabase
        .from("form_events")
        .insert({ form_slug: formSlug, step, session_id })
        .then(() => {}, () => {});
      return;
    }
    // Demo fallback (browser storage) so the dashboard is testable offline.
    if (typeof window !== "undefined") {
      const all = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      all.push({ form_slug: formSlug, step, session_id, created_at: new Date().toISOString() });
      localStorage.setItem(LS_KEY, JSON.stringify(all.slice(-5000)));
    }
  } catch (_) {
    /* analytics must never throw */
  }
}

// Read raw step events for the Insights dashboard.
export async function getFunnelEvents() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("form_events")
      .select("form_slug,step,session_id")
      .order("created_at", { ascending: false })
      .limit(50000);
    if (error) return [];
    return data || [];
  }
  if (typeof window !== "undefined") {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch (_) {}
  }
  return [];
}
