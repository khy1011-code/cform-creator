// Sends an email to you whenever a new lead submits the form.
// Uses Resend (https://resend.com). If RESEND_API_KEY isn't set, it
// safely returns { skipped: true } instead of erroring.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_NOTIFY_TO;
  const from = process.env.LEAD_NOTIFY_FROM;

  if (!apiKey || !to || !from) {
    return res.status(200).json({ skipped: true, reason: "email not configured" });
  }

  const lead = req.body || {};
  const answers = lead.answers || {};
  const answerLines = Object.entries(answers)
    .map(([q, a]) => `<p style="margin:6px 0"><b>${escapeHtml(q)}:</b> ${escapeHtml(String(a))}</p>`)
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px">
      <h2 style="color:#a8872f">New lead — ${escapeHtml(lead.name || "Unknown")}</h2>
      <p><b>Phone:</b> ${escapeHtml(lead.phone || "—")}</p>
      <p><b>Email:</b> ${escapeHtml(lead.email || "—")}</p>
      <hr style="border:none;border-top:1px solid #eee"/>
      ${answerLines || "<p>No question answers.</p>"}
      <p style="color:#888;font-size:12px">${escapeHtml(lead.created_at || "")}</p>
    </div>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: `New lead: ${lead.name || "website form"}`,
        html,
      }),
    });
    if (!r.ok) {
      const text = await r.text();
      return res.status(200).json({ skipped: true, reason: text });
    }
    return res.status(200).json({ sent: true });
  } catch (e) {
    return res.status(200).json({ skipped: true, reason: String(e) });
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
