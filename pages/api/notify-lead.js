// Runs when a new lead submits. Two independent, optional integrations:
//   1) Email alert via Resend       (set RESEND_API_KEY / LEAD_NOTIFY_TO / _FROM)
//   2) Push to GoHighLevel (GHL)    (set GHL_WEBHOOK_URL — an Inbound Webhook)
// If a given integration isn't configured, it's skipped — never errors.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const lead = req.body || {};
  const results = {};

  results.email = await sendEmail(lead);
  results.ghl = await pushToGHL(lead);

  return res.status(200).json(results);
}

/* ----------------------- GoHighLevel ----------------------- */
async function pushToGHL(lead) {
  const url = process.env.GHL_WEBHOOK_URL;
  if (!url) return { skipped: true, reason: "GHL not configured" };

  const answers = lead.answers || {};
  const tracking = lead.tracking || {};
  const [firstName, ...rest] = String(lead.name || "").trim().split(" ");
  const notes = Object.entries(answers)
    .map(([q, a]) => `${q}: ${a}`)
    .join("\n");

  // Flat payload — easiest to map in a GHL workflow.
  const payload = {
    name: lead.name || "",
    first_name: firstName || "",
    last_name: rest.join(" "),
    email: lead.email || "",
    phone: lead.phone || "",
    form_title: lead.form_title || "",
    form_slug: lead.form_slug || "",
    source: tracking.utm_source || "Website form",
    submitted_at: lead.created_at || new Date().toISOString(),
    notes,
    // Meta / ad attribution
    utm_source: tracking.utm_source || "",
    utm_medium: tracking.utm_medium || "",
    utm_campaign: tracking.utm_campaign || "",
    utm_content: tracking.utm_content || "",
    utm_term: tracking.utm_term || "",
    fbclid: tracking.fbclid || "",
    gclid: tracking.gclid || "",
    // full answers object too, for nested mapping if preferred
    answers,
  };

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const text = await r.text();
      return { skipped: true, reason: `GHL ${r.status}: ${text.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (e) {
    return { skipped: true, reason: String(e) };
  }
}

/* ----------------------- Email (Resend) -------------------- */
async function sendEmail(lead) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_NOTIFY_TO;
  const from = process.env.LEAD_NOTIFY_FROM;
  if (!apiKey || !to || !from) return { skipped: true, reason: "email not configured" };

  const answers = lead.answers || {};
  const answerLines = Object.entries(answers)
    .map(([q, a]) => `<p style="margin:6px 0"><b>${escapeHtml(q)}:</b> ${escapeHtml(String(a))}</p>`)
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px">
      <h2 style="color:#a8872f">New lead — ${escapeHtml(lead.name || "Unknown")}</h2>
      <p><b>Phone:</b> ${escapeHtml(lead.phone || "—")}</p>
      <p><b>Email:</b> ${escapeHtml(lead.email || "—")}</p>
      <p><b>Form:</b> ${escapeHtml(lead.form_title || lead.form_slug || "—")}</p>
      <hr style="border:none;border-top:1px solid #eee"/>
      ${answerLines || "<p>No question answers.</p>"}
      <p style="color:#888;font-size:12px">${escapeHtml(lead.created_at || "")}</p>
    </div>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: `New lead: ${lead.name || "website form"}`, html }),
    });
    if (!r.ok) {
      const text = await r.text();
      return { skipped: true, reason: text.slice(0, 200) };
    }
    return { sent: true };
  } catch (e) {
    return { skipped: true, reason: String(e) };
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
