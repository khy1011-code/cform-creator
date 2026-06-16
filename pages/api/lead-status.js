import crypto from "crypto";

// Receives a webhook from GHL when a lead's opportunity changes stage
// (e.g. moved to "Patient Booked Appointment" = booked + paid + showed up)
// and sends a quality signal back to Meta via the Conversions API.
//
// IMPORTANT: only the event + hashed contact info is sent — never health
// answers, and no booking page is involved. Policy-safe by design.
//
// GHL setup: Workflow trigger "Opportunity Status Changed" → filter to your
// won stage → Webhook (POST) to:
//   https://YOURSITE/api/lead-status?status=qualified&key=YOUR_SECRET
// GHL sends the contact (email/phone/name) as the JSON body.

const sha256 = (v) => crypto.createHash("sha256").update(String(v)).digest("hex");
const normEmail = (e) => String(e || "").trim().toLowerCase();
const normPhone = (p) => {
  let d = String(p || "").replace(/\D/g, "");
  if (d.length === 10) d = "1" + d;
  return d;
};
const hashed = (v) => (v ? [sha256(v)] : undefined);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Optional shared secret so only GHL can fire these (prevents fake signals).
  const secret = process.env.LEAD_STATUS_SECRET;
  if (secret) {
    const provided = req.query.key || req.headers["x-lead-status-key"] || (req.body && req.body.key);
    if (provided !== secret) return res.status(401).json({ error: "unauthorized" });
  }

  const token = process.env.META_CAPI_TOKEN;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || "2169502100563220";
  if (!token || !pixelId) return res.status(200).json({ skipped: true, reason: "CAPI not configured" });

  const b = req.body || {};
  const status = String(req.query.status || b.status || "qualified").toLowerCase();

  // Map the CRM status to a Meta event name (override with ?event=).
  let eventName = req.query.event || b.event_name;
  if (!eventName) {
    eventName = /disqualif|unqualif|lost|junk/.test(status) ? "DisqualifiedLead" : "QualifiedLead";
  }

  // Pull contact fields from common GHL payload shapes.
  const email = b.email || "";
  const phone = b.phone || b.phone_number || "";
  const name = b.full_name || b.name || [b.first_name, b.last_name].filter(Boolean).join(" ");
  if (!email && !phone) {
    return res.status(200).json({ skipped: true, reason: "no email/phone to match" });
  }

  const [firstName, ...rest] = String(name || "").trim().split(" ");
  const value = Number(req.query.value || b.value || b.opportunity_value || 0) || undefined;

  const user_data = {
    em: email ? hashed(normEmail(email)) : undefined,
    ph: phone ? hashed(normPhone(phone)) : undefined,
    fn: firstName ? hashed(firstName.toLowerCase()) : undefined,
    ln: rest.length ? hashed(rest.join(" ").toLowerCase()) : undefined,
  };

  const custom_data = { lead_status: status };
  if (b.form_slug) custom_data.content_category = b.form_slug;
  if (value) { custom_data.currency = "USD"; custom_data.value = value; }

  const event = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: "system_generated", // a backend/CRM event, not a web action
    event_id: b.event_id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    user_data,
    custom_data,
  };

  const body = { data: [event] };
  if (process.env.META_CAPI_TEST_CODE) body.test_event_code = process.env.META_CAPI_TEST_CODE;

  try {
    const r = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(200).json({ skipped: true, reason: JSON.stringify(j).slice(0, 200) });
    return res.status(200).json({ sent: true, event: eventName, events_received: j.events_received });
  } catch (e) {
    return res.status(200).json({ skipped: true, reason: String(e) });
  }
}
