# CForm Creator

Build **unlimited premium, mobile-first multi-step forms** from one hidden admin
panel. Each form gets its own **short link** — share the link and visitors see only
the form, never the platform.

- **Public form:** `/<your-form-slug>` (e.g. `yoursite.com/glow-eval`)
- **Hidden admin (CForm Creator):** `/admin`
- **Bare domain `/`:** a neutral page that reveals nothing about the platform.

> 💡 **It runs without any setup.** With no keys filled in, the app runs in **DEMO MODE**
> (browser storage) so you can build and test forms immediately. Add your Supabase keys
> to make it real, permanent, and multi-device. It never crashes if a key is missing.

---

## 1. Run it locally

```bash
cd trueyou
npm install
npm run dev
```

- Admin: <http://localhost:3000/admin> — create a form, give it a short URL.
- Then open the form at <http://localhost:3000/your-slug>.
  (A sample "trueyou" form is seeded automatically on first run.)

---

## 2. Create & share forms (in the CMS)

1. Go to `/admin` → **My Forms** → **＋ New Form**.
2. **⚙️ Settings & URL** — name it and choose a short public URL (e.g. `glow-eval`).
3. **✏️ Page Content / 🔗 Links / 🎨 Theme & Font / 🖼️ Profile Photo** — customize everything.
   Add as many checklist items and numbered steps as you want.
4. **Save**, then back on **My Forms** click **Copy link** to share it.

Each form captures leads independently → **📥 Lead Center** (filter by form, export CSV).

---

## 3. Go live with Supabase (real, multi-device)

1. Supabase → **SQL Editor → New query**, paste [`supabase/schema.sql`](supabase/schema.sql), **Run**.
2. Create your admin login: **Authentication → Users → Add user** (email + password).
3. **Project Settings → API**: copy the **Project URL** and **anon public** key.
4. `cp .env.local.example .env.local` and paste them in:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
   ```
5. Restart `npm run dev`. The badge now reads **LIVE (Supabase)** and `/admin` requires login.

---

## 4. Email alerts on each new lead (optional)

Create a free <https://resend.com> account, verify a domain, make an API key, then add:

```env
RESEND_API_KEY=re_xxxxxxxx
LEAD_NOTIFY_TO=you@example.com
LEAD_NOTIFY_FROM=leads@yourdomain.com
```

If blank, leads still save — you just won't get an email.

---

## 4b. Send leads to GoHighLevel (GHL)

Each submitted lead can be pushed straight into your GHL CRM, where GHL stores
the contact **and** sends the "new signup" email from a workflow.

**Flow:** Meta ad → form link → client submits → app POSTs the full lead to your
GHL **Inbound Webhook** → GHL workflow creates the contact + emails you.

1. In GHL: **Automation → Workflows → Create Workflow** (start blank).
2. Add trigger **"Inbound Webhook"** and **copy the webhook URL**.
3. Put it in your env (and in Netlify env vars):
   ```env
   GHL_WEBHOOK_URL=https://services.leadconnectorhq.com/hooks/xxxx/webhook-trigger/yyyy
   ```
4. Submit one test lead so GHL captures a sample payload, then add workflow actions:
   - **Create/Update Contact** → map `name` / `email` / `phone` / `notes` and any
     `answers` fields onto the contact (and custom fields if you want each answer).
   - **Send Email / Internal Notification** → your "new client signed up" alert.
   - Optionally **Create Opportunity** to drop them into a pipeline.

**Fields the app sends:** `name`, `first_name`, `last_name`, `email`, `phone`,
`form_title`, `form_slug`, `source`, `submitted_at`, `notes` (all answers),
the full `answers` object, plus Meta attribution: `utm_source`, `utm_medium`,
`utm_campaign`, `utm_content`, `utm_term`, `fbclid`, `gclid`.

> Tip: point the form's **Schedule My Appointment** button (CMS → Links →
> *Schedule URL*) at your GHL **calendar booking link** to close the loop.

---

## 5. Deploy to Netlify

1. Push this folder to a GitHub repo.
2. Netlify → **Add new site → Import from GitHub** → pick the repo
   (build settings come from [`netlify.toml`](netlify.toml)).
3. **Site settings → Environment variables:** add the same variables from `.env.local`. Deploy.

Your forms are then live at `your-netlify-site.com/your-slug`.

### Want real subdomains later (`glow.yoursite.com`)?
That needs a custom domain with **wildcard DNS** + a wildcard certificate on Netlify.
The current short-path URLs (`yoursite.com/glow`) are just as short and need zero DNS
setup — recommended to start. We can add true subdomains once you own a domain.

---

## Feature map

| Requirement | Where |
| --- | --- |
| Looks like a plain form when the link is opened | `/<slug>` shows only the form's own brand |
| Platform name hidden | "CForm Creator" appears only inside `/admin` |
| Create unlimited forms with custom questions/details | **My Forms → New Form** |
| Each form has a short custom URL | **Settings & URL** tab |
| Lead Center with answers + date/time, per form | **Lead Center** (filter + CSV) |
| Edit/save all headlines, subheadlines, texts | **Page Content** tab |
| HIPAA + Address(Maps) + Schedule link boxes | **Links** tab |
| Upload header photo (also on last page) | **Profile Photo** tab |
| Back arrow to review/redo answers | Built into every form page |
| Add unlimited checkboxes / numbered steps | **Page Content** (Intro / Confirmation) |
| Customizable theme color + font | **Theme & Font** tab |
