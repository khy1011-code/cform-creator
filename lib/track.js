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

// Accurate device + OS detection. Uses UA-Client-Hints where available
// (Chrome/Android) and falls back to user-agent parsing (iOS Safari etc.).
// Handles the iPadOS "Macintosh" UA quirk via touch points.
export function getDeviceInfo() {
  if (typeof navigator === "undefined") return { device_type: "Unknown", os: "Unknown", browser: "Unknown" };
  const ua = navigator.userAgent || "";
  const touch = navigator.maxTouchPoints || 0;
  const isIpad = /ipad/i.test(ua) || (/macintosh/i.test(ua) && touch > 1);

  let os = "Other";
  if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipod/i.test(ua) || isIpad) os = "iOS";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  const isTablet = isIpad || (/android/i.test(ua) && !/mobile/i.test(ua));
  const isMobile = !isTablet && /iphone|ipod|android.*mobile|windows phone|mobile/i.test(ua);
  let device_type = isTablet ? "Tablet" : isMobile ? "Mobile" : "Desktop";

  let browser = "Other";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/(chrome|crios)\//i.test(ua)) browser = "Chrome";
  else if (/(firefox|fxios)\//i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua)) browser = "Safari";

  // Client Hints refine platform/mobile when present (Chromium browsers).
  const uaData = navigator.userAgentData;
  if (uaData) {
    const p = (uaData.platform || "").toLowerCase();
    if (p.includes("android")) os = "Android";
    else if (p.includes("windows")) os = "Windows";
    else if (p.includes("macos") && !isIpad) os = "macOS";
    if (typeof uaData.mobile === "boolean" && !isTablet) device_type = uaData.mobile ? "Mobile" : "Desktop";
  }
  return { device_type, os, browser };
}

// Log this visitor's session once (device sent from client, location added
// server-side from the IP). Fire-and-forget — never blocks the form.
export function logSession(formSlug) {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem("cform_sess_logged")) return; // once per session
    sessionStorage.setItem("cform_sess_logged", "1");
    const session_id = getSessionId();
    const device = getDeviceInfo();
    if (isSupabaseConfigured && supabase) {
      fetch("/api/track-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id, form_slug: formSlug, ...device }),
      }).catch(() => {});
    } else {
      const all = JSON.parse(localStorage.getItem("cform_sessions") || "[]");
      all.push({ session_id, form_slug: formSlug, country: "—", region: "—", ...device, created_at: new Date().toISOString() });
      localStorage.setItem("cform_sessions", JSON.stringify(all.slice(-5000)));
    }
  } catch (_) {}
}

export async function getSessionMeta() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("session_meta")
      .select("form_slug,country,region,device_type,os,browser")
      .order("created_at", { ascending: false })
      .limit(50000);
    if (error) return [];
    return data || [];
  }
  if (typeof window !== "undefined") {
    try { return JSON.parse(localStorage.getItem("cform_sessions") || "[]"); } catch (_) {}
  }
  return [];
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
