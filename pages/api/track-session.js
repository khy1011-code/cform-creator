import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";

// Records a visitor session for the Funnel Insights "Audience" view:
// device + OS come from the client; Country + Region come from the
// visitor's IP via Netlify's built-in geo headers (no external service).
// Additive + non-blocking — has no effect on the form, lead, or campaign.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isSupabaseConfigured || !supabase) return res.status(200).json({ skipped: true, reason: "not configured" });

  const b = req.body || {};

  // Netlify injects x-nf-geo (base64 JSON). Fall back to simpler headers.
  let country = "";
  let region = "";
  try {
    const g = req.headers["x-nf-geo"];
    if (g) {
      const geo = JSON.parse(Buffer.from(g, "base64").toString("utf8"));
      country = geo?.country?.name || geo?.country?.code || "";
      region = geo?.subdivision?.name || geo?.subdivision?.code || "";
    }
  } catch (_) {}
  if (!country) country = req.headers["x-country"] || req.headers["x-vercel-ip-country"] || "";
  if (!region) region = req.headers["x-nf-subdivision-code"] || req.headers["x-vercel-ip-country-region"] || "";

  try {
    const { error } = await supabase.from("session_meta").insert({
      session_id: b.session_id,
      form_slug: b.form_slug,
      country: country || "Unknown",
      region: region || "",
      device_type: b.device_type || "",
      os: b.os || "",
      browser: b.browser || "",
    });
    if (error) return res.status(200).json({ skipped: true, reason: error.message });
    return res.status(200).json({ sent: true, country, region });
  } catch (e) {
    return res.status(200).json({ skipped: true, reason: String(e) });
  }
}
