import { useEffect, useState } from "react";
import Head from "next/head";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { DEFAULT_CONTENT } from "../lib/content";
import { applyTheme } from "../lib/applyTheme";
import { listLeads, deleteLead, updateLead } from "../lib/leads";
import { getFunnelEvents, getSessionMeta } from "../lib/track";
import {
  listForms, createForm, updateForm, deleteForm,
  cleanSlug, isSlugAvailable, ensureSampleForm,
} from "../lib/forms";

const APP_NAME = "CForm Creator";

const FONT_CHOICES = [
  { label: "Inter (clean sans)", value: "'Inter', system-ui, sans-serif" },
  { label: "Poppins (modern sans)", value: "'Poppins', system-ui, sans-serif" },
  { label: "Montserrat (geometric)", value: "'Montserrat', system-ui, sans-serif" },
  { label: "Playfair Display (luxury serif)", value: "'Playfair Display', Georgia, serif" },
  { label: "Cormorant Garamond (elegant serif)", value: "'Cormorant Garamond', Georgia, serif" },
  { label: "Lora (readable serif)", value: "'Lora', Georgia, serif" },
];

export default function Admin() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [view, setView] = useState("forms"); // forms | edit | leads
  const [forms, setForms] = useState([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [editForm, setEditForm] = useState(null);
  const [editTab, setEditTab] = useState("settings");
  const [toast, setToast] = useState("");

  // ---- Auth ----
  useEffect(() => {
    if (!isSupabaseConfigured) { setAuthReady(true); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loggedIn = !isSupabaseConfigured || !!session;

  async function refreshForms() {
    setLoadingForms(true);
    try {
      let f = await listForms();
      if (f.length === 0) f = await ensureSampleForm();
      setForms(f);
    } catch (_) { setForms([]); }
    setLoadingForms(false);
  }
  useEffect(() => { if (loggedIn) refreshForms(); }, [loggedIn]);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2400); }

  function openEditor(form) {
    setEditForm(JSON.parse(JSON.stringify(form)));
    applyTheme(form.data.theme);
    setEditTab("settings");
    setView("edit");
  }
  function closeEditor() {
    applyTheme(DEFAULT_CONTENT.theme);
    setEditForm(null);
    setView("forms");
    refreshForms();
  }

  async function handleNewForm() {
    const f = await createForm("Untitled form");
    await refreshForms();
    openEditor(f);
    showToast("New form created ✓");
  }

  async function handleSaveForm() {
    const slug = cleanSlug(editForm.slug) || editForm.slug;
    if (!slug) { showToast("Please enter a URL name."); return; }
    const free = await isSlugAvailable(slug, editForm.id);
    if (!free) { showToast(`The URL "/${slug}" is taken or reserved — pick another.`); return; }
    const toSave = { ...editForm, slug };
    try {
      const res = await updateForm(toSave);
      setEditForm(toSave);
      applyTheme(toSave.data.theme);
      showToast(res.mode === "live" ? "Saved to your live site ✓" : "Saved (demo mode) ✓");
    } catch (e) { showToast("Save failed: " + (e.message || e)); }
  }

  async function handleDeleteForm(form) {
    if (!confirm(`Delete "${form.title}"? This cannot be undone.`)) return;
    await deleteForm(form.id);
    refreshForms();
    showToast("Form deleted.");
  }

  if (!authReady) return <Shell><p className="hint">Loading…</p></Shell>;
  if (isSupabaseConfigured && !loggedIn) return <LoginScreen />;

  // Helpers passed to editors operate on the editing form's data.
  const content = editForm?.data;
  const setContent = (data) => setEditForm({ ...editForm, data });

  return (
    <div className="admin">
      <Head><title>{APP_NAME} · Admin</title></Head>
      <div className="admin-wrap">
        <div className="admin-row" style={{ justifyContent: "space-between" }}>
          <h1>
            {APP_NAME}
            <span className={"admin-badge " + (isSupabaseConfigured ? "live" : "demo")}>
              {isSupabaseConfigured ? "LIVE (Supabase)" : "DEMO MODE"}
            </span>
          </h1>
          {isSupabaseConfigured && (
            <button className="admin-btn secondary small" onClick={() => supabase.auth.signOut()}>Sign out</button>
          )}
        </div>

        {view !== "edit" && (
          <div className="admin-tabs">
            <button className={"admin-tab" + (view === "forms" ? " active" : "")} onClick={() => setView("forms")}>🗂️ My Forms</button>
            <button className={"admin-tab" + (view === "leads" ? " active" : "")} onClick={() => setView("leads")}>📥 Lead Center</button>
            <button className={"admin-tab" + (view === "insights" ? " active" : "")} onClick={() => setView("insights")}>📊 Funnel Insights</button>
          </div>
        )}

        {/* ---------- FORMS MANAGER ---------- */}
        {view === "forms" && (
          <FormsManager
            forms={forms} loading={loadingForms}
            onNew={handleNewForm} onEdit={openEditor} onDelete={handleDeleteForm}
            onCopied={() => showToast("Link copied ✓")}
          />
        )}

        {/* ---------- LEAD CENTER ---------- */}
        {view === "leads" && <LeadCenter forms={forms} />}

        {/* ---------- FUNNEL INSIGHTS ---------- */}
        {view === "insights" && <FunnelInsights forms={forms} />}

        {/* ---------- FORM EDITOR ---------- */}
        {view === "edit" && editForm && (
          <>
            <div className="admin-row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
              <button className="admin-btn secondary small" onClick={closeEditor}>← All forms</button>
              <span className="hint" style={{ margin: 0 }}>Editing: <b>{editForm.title}</b></span>
            </div>
            <div className="admin-tabs">
              {[
                ["settings", "⚙️ Settings & URL"],
                ["content", "✏️ Page Content"],
                ["links", "🔗 Links"],
                ["theme", "🎨 Theme & Font"],
                ["photo", "🖼️ Profile Photo"],
              ].map(([id, label]) => (
                <button key={id} className={"admin-tab" + (editTab === id ? " active" : "")} onClick={() => setEditTab(id)}>{label}</button>
              ))}
            </div>

            {editTab === "settings" && <SettingsEditor form={editForm} setForm={setEditForm} onSave={handleSaveForm} />}
            {editTab === "content" && <ContentEditor content={content} setContent={setContent} onSave={handleSaveForm} />}
            {editTab === "links" && <LinksEditor content={content} setContent={setContent} onSave={handleSaveForm} />}
            {editTab === "theme" && <ThemeEditor content={content} setContent={setContent} onSave={handleSaveForm} />}
            {editTab === "photo" && <PhotoEditor content={content} setContent={setContent} onSave={handleSaveForm} />}
          </>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Shell({ children }) {
  return <div className="admin"><div className="admin-wrap">{children}</div></div>;
}

/* ===================== LOGIN ===================== */
function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function signIn(e) {
    e.preventDefault(); setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message);
    setBusy(false);
  }
  return (
    <div className="admin">
      <Head><title>{APP_NAME} · Login</title></Head>
      <div className="admin-wrap">
        <div className="admin-card login-box">
          <h2>{APP_NAME} — Admin Login</h2>
          <p className="hint">Sign in with the admin account you created in Supabase.</p>
          <form onSubmit={signIn}>
            <label className="admin-label">Email</label>
            <input className="admin-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label className="admin-label">Password</label>
            <input className="admin-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {err && <p style={{ color: "#ff9b9b", fontSize: 13, marginTop: 12 }}>{err}</p>}
            <button className="admin-btn" style={{ marginTop: 16, width: "100%" }} disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ===================== FORMS MANAGER ===================== */
function FormsManager({ forms, loading, onNew, onEdit, onDelete, onCopied }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  function copy(slug) {
    const url = `${origin}/${slug}`;
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(onCopied);
  }
  return (
    <div className="admin-card">
      <div className="admin-row" style={{ justifyContent: "space-between" }}>
        <div>
          <h2>My Forms</h2>
          <p className="hint">Each form has its own short link. Share the link — visitors see only the form.</p>
        </div>
        <button className="admin-btn" onClick={onNew}>＋ New Form</button>
      </div>

      {loading ? <p className="hint">Loading…</p> : forms.length === 0 ? (
        <p className="hint">No forms yet. Click “New Form” to create your first one.</p>
      ) : (
        <table className="lead-table">
          <thead><tr><th>Form name</th><th>Public link</th><th></th></tr></thead>
          <tbody>
            {forms.map((f) => (
              <tr key={f.id}>
                <td><b>{f.title}</b></td>
                <td>
                  <code style={{ color: "var(--gold)" }}>/{f.slug}</code>
                  <div className="admin-row" style={{ marginTop: 6 }}>
                    <button className="admin-btn secondary small" onClick={() => copy(f.slug)}>Copy link</button>
                    <a className="admin-btn secondary small" href={`/${f.slug}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>Open</a>
                  </div>
                </td>
                <td>
                  <div className="admin-row">
                    <button className="admin-btn small" onClick={() => onEdit(f)}>Edit</button>
                    <button className="admin-btn danger small" onClick={() => onDelete(f)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ===================== SETTINGS & URL ===================== */
function SettingsEditor({ form, setForm, onSave }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://yoursite.com";
  return (
    <>
      <div className="admin-card">
        <h2>Form settings</h2>
        <p className="hint">Internal name (only you see this) and the public short URL.</p>
        <Field label="Form name (internal)" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <label className="admin-label">Public URL name</label>
        <div className="admin-row">
          <span className="hint" style={{ margin: 0 }}>{origin}/</span>
          <input className="admin-input" style={{ flex: 1 }} value={form.slug}
            onChange={(e) => setForm({ ...form, slug: cleanSlug(e.target.value) })} />
        </div>
        <p className="hint" style={{ marginTop: 8 }}>Keep it short &amp; memorable — letters, numbers and dashes only.</p>
      </div>
      <SaveBar onSave={onSave} />
    </>
  );
}

/* ===================== LEAD CENTER ===================== */
function LeadCenter({ forms }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null); // which lead row is expanded

  async function refresh() {
    setLoading(true);
    try { setLeads(await listLeads()); } catch (_) { setLeads([]); }
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  async function remove(id) {
    if (!confirm("Delete this lead permanently?")) return;
    await deleteLead(id);
    if (openId === id) setOpenId(null);
    refresh();
  }

  // Persist a note/tags change locally (instant UI) + to the database.
  async function patchLead(id, patch) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    try { await updateLead(id, patch); } catch (e) { alert("Couldn't save: " + (e.message || e)); }
  }

  const shown = filter === "all" ? leads : leads.filter((l) => l.form_slug === filter);

  function exportCsv() {
    const rows = [["Date", "Form", "Name", "Phone", "Email", "Tags", "Note", "Answers"]];
    shown.forEach((l) => rows.push([
      fmt(l.created_at), l.form_title || l.form_slug || "", l.name || "", l.phone || "", l.email || "",
      (l.tags || []).join("; "), l.admin_notes || "", JSON.stringify(l.answers || {}),
    ]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "leads.csv"; a.click();
  }

  return (
    <div className="admin-card">
      <div className="admin-row" style={{ justifyContent: "space-between" }}>
        <div>
          <h2>Lead Center</h2>
          <p className="hint">Click a lead to expand. Notes &amp; tags are private to you (not sent to GHL).</p>
        </div>
        <div className="admin-row">
          <select className="admin-input" style={{ width: "auto" }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All forms</option>
            {forms.map((f) => <option key={f.id} value={f.slug}>{f.title}</option>)}
          </select>
          <button className="admin-btn secondary small" onClick={refresh}>Refresh</button>
          <button className="admin-btn small" onClick={exportCsv} disabled={!shown.length}>Export CSV</button>
        </div>
      </div>

      {loading ? <p className="hint">Loading leads…</p> : shown.length === 0 ? (
        <p className="hint">No leads yet for this selection.</p>
      ) : (
        <div className="lead-accordion">
          {shown.map((l) => (
            <LeadRow
              key={l.id}
              lead={l}
              open={openId === l.id}
              onToggle={() => setOpenId(openId === l.id ? null : l.id)}
              onPatch={(patch) => patchLead(l.id, patch)}
              onDelete={() => remove(l.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LeadRow({ lead, open, onToggle, onPatch, onDelete }) {
  const tags = lead.tags || [];
  const [note, setNote] = useState(lead.admin_notes || "");
  const [newTag, setNewTag] = useState("");

  // keep local note in sync if the lead reloads
  useEffect(() => { setNote(lead.admin_notes || ""); }, [lead.id]);

  function addTag() {
    const t = newTag.trim();
    if (!t || tags.includes(t)) { setNewTag(""); return; }
    onPatch({ tags: [...tags, t] });
    setNewTag("");
  }
  function removeTag(t) { onPatch({ tags: tags.filter((x) => x !== t) }); }

  return (
    <div className={"lead-row" + (open ? " open" : "")}>
      {/* ---- collapsed summary (always visible) ---- */}
      <button className="lead-summary" onClick={onToggle}>
        <span className={"lead-chevron" + (open ? " open" : "")}>▸</span>
        <span className="lead-name">{lead.name || "—"}</span>
        <span className="lead-meta">{lead.form_title || lead.form_slug || "—"}</span>
        <span className="lead-meta lead-date">{fmt(lead.created_at)}</span>
        <span className="lead-summary-tags">
          {tags.slice(0, 3).map((t) => <span key={t} className="tag-chip mini">{t}</span>)}
          {tags.length > 3 && <span className="tag-chip mini">+{tags.length - 3}</span>}
        </span>
      </button>

      {/* ---- expanded detail ---- */}
      {open && (
        <div className="lead-detail">
          <div className="lead-detail-grid">
            <div><span className="lead-k">Phone</span><a href={`tel:${lead.phone}`}>{lead.phone || "—"}</a></div>
            <div><span className="lead-k">Email</span><a href={`mailto:${lead.email}`}>{lead.email || "—"}</a></div>
          </div>

          <div className="lead-answers">
            {Object.entries(lead.answers || {}).map(([k, v]) => (
              <div key={k} className="lead-answer"><span className="lead-k">{k}</span><span>{String(v) || "—"}</span></div>
            ))}
          </div>

          {/* Tags */}
          <div>
            <span className="admin-label">Tags</span>
            <div className="tag-list">
              {tags.length === 0 && <span className="hint" style={{ margin: 0 }}>No tags yet.</span>}
              {tags.map((t) => (
                <span key={t} className="tag-chip">{t}<button className="tag-x" onClick={() => removeTag(t)} aria-label="Remove tag">×</button></span>
              ))}
            </div>
            <div className="admin-row" style={{ marginTop: 8 }}>
              <input className="admin-input" style={{ flex: 1, maxWidth: 260 }} placeholder="Add a custom tag…" value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
              <button className="admin-btn secondary small" onClick={addTag}>＋ Add tag</button>
            </div>
          </div>

          {/* Note */}
          <div style={{ marginTop: 14 }}>
            <span className="admin-label">Note</span>
            <textarea className="admin-textarea" placeholder="Private note about this lead…" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="admin-row" style={{ marginTop: 6 }}>
              <button className="admin-btn small" onClick={() => onPatch({ admin_notes: note })}
                disabled={note === (lead.admin_notes || "")}>Save note</button>
              <button className="admin-btn danger small" onClick={onDelete}>Delete lead</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fmt(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch (_) { return iso; }
}

/* ===================== FUNNEL INSIGHTS ===================== */
const FUNNEL_STEPS = [
  ["intro", "1 · Landing / Intro"],
  ["verify", "2 · Human check"],
  ["q1", "3 · Question 1"],
  ["q2", "4 · Question 2"],
  ["q3", "5 · Question 3 (notes)"],
  ["contact", "6 · Contact info"],
  ["review", "7 · Review"],
  ["privacy", "8 · Privacy"],
  ["confirm", "9 · Submitted ✅"],
];

// Count occurrences of a field across rows → sorted [ [label, n], ... ].
function tally(rows, field) {
  const m = {};
  for (const r of rows) {
    const k = (r && r[field]) || "Unknown";
    m[k] = (m[k] || 0) + 1;
  }
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

function Breakdown({ title, rows, field, max }) {
  const items = tally(rows, field);
  const total = rows.length || 1;
  const shown = max ? items.slice(0, max) : items;
  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <span className="admin-label">{title}</span>
      {shown.length === 0 && <p className="hint" style={{ margin: 0 }}>No data yet.</p>}
      {shown.map(([label, n]) => {
        const pct = Math.round((n / total) * 100);
        return (
          <div className="funnel-row" key={label}>
            <div className="funnel-label" style={{ width: 120 }}>{label}</div>
            <div className="funnel-bar-wrap"><div className="funnel-bar" style={{ width: pct + "%" }} /></div>
            <div className="funnel-num">{n}<span className="funnel-pct">{pct}%</span></div>
          </div>
        );
      })}
    </div>
  );
}

function FunnelInsights({ forms }) {
  const [events, setEvents] = useState([]);
  const [leads, setLeads] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [audienceForm, setAudienceForm] = useState("all");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [e, l, s] = await Promise.all([getFunnelEvents(), listLeads(), getSessionMeta()]);
      setEvents(e); setLeads(l); setSessions(s);
    } catch (_) { setEvents([]); setLeads([]); setSessions([]); }
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  const audRows = audienceForm === "all" ? sessions : sessions.filter((s) => s.form_slug === audienceForm);

  // Count UNIQUE visitor sessions that reached each step, per form.
  const byForm = {};
  for (const ev of events) {
    if (!ev || !ev.form_slug) continue;
    const f = (byForm[ev.form_slug] = byForm[ev.form_slug] || {});
    const s = (f[ev.step] = f[ev.step] || new Set());
    s.add(ev.session_id);
  }

  // Show a card per form that has any data (plus any known forms with data).
  const slugs = Object.keys(byForm);
  const titleFor = (slug) => (forms.find((f) => f.slug === slug) || {}).title || slug;

  return (
    <div className="admin-card">
      <div className="admin-row" style={{ justifyContent: "space-between" }}>
        <div>
          <h2>Funnel Insights</h2>
          <p className="hint">Unique visitors that reached each step. Compare Step 1 to your Meta <b>PageViews</b> and “Submitted” to your Meta <b>Leads</b> — big gaps can signal bots or a tracking issue.</p>
        </div>
        <button className="admin-btn secondary small" onClick={refresh}>Refresh</button>
      </div>

      {/* ---- Audience / Targeting (device + location) ---- */}
      <div className="funnel-card" style={{ marginBottom: 18 }}>
        <div className="admin-row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>🎯 Audience &amp; Targeting <span className="hint" style={{ margin: 0, fontWeight: 400 }}>· {audRows.length} sessions</span></h3>
          <select className="admin-input" style={{ width: "auto" }} value={audienceForm} onChange={(e) => setAudienceForm(e.target.value)}>
            <option value="all">All forms</option>
            {forms.map((f) => <option key={f.id} value={f.slug}>{f.title}</option>)}
          </select>
        </div>
        {audRows.length === 0 ? (
          <p className="hint" style={{ margin: 0 }}>No audience data yet. Once visitors land (and the <code>session_meta</code> table exists), device + location appear here.</p>
        ) : (
          <div className="admin-row" style={{ alignItems: "flex-start", gap: 28 }}>
            <Breakdown title="Device" rows={audRows} field="device_type" />
            <Breakdown title="Operating system" rows={audRows} field="os" />
            <Breakdown title="Top regions" rows={audRows} field="region" max={6} />
            <Breakdown title="Top countries" rows={audRows} field="country" max={6} />
          </div>
        )}
        <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>Targeting check: most should match your ad geo (e.g. California) and be mostly mobile. Off-geo or heavy desktop = mis-targeting or bots.</p>
      </div>

      {loading ? <p className="hint">Loading…</p> : slugs.length === 0 ? (
        <p className="hint">No funnel data yet. Once visitors hit your forms (and the <code>form_events</code> table exists), counts appear here.</p>
      ) : (
        slugs.map((slug) => {
          const stepCounts = FUNNEL_STEPS.map(([k, label]) => ({ k, label, n: (byForm[slug][k] || new Set()).size }));
          const top = stepCounts[0].n || 0;
          const leadCount = leads.filter((l) => l.form_slug === slug).length;
          const submitted = stepCounts[stepCounts.length - 1].n;
          const cvr = top ? Math.round((submitted / top) * 1000) / 10 : 0;
          return (
            <div key={slug} className="funnel-card">
              <div className="admin-row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>{titleFor(slug)} <code style={{ color: "var(--gold)" }}>/{slug}</code></h3>
                <span className="hint" style={{ margin: 0 }}>Step 1 → Submit: <b style={{ color: "var(--gold)" }}>{cvr}%</b> · Leads saved: <b>{leadCount}</b></span>
              </div>
              {stepCounts.map((row) => {
                const pct = top ? Math.round((row.n / top) * 100) : 0;
                const dropFromTop = top ? 100 - pct : 0;
                return (
                  <div className="funnel-row" key={row.k}>
                    <div className="funnel-label">{row.label}</div>
                    <div className="funnel-bar-wrap"><div className="funnel-bar" style={{ width: pct + "%" }} /></div>
                    <div className="funnel-num">{row.n}<span className="funnel-pct">{pct}%</span></div>
                  </div>
                );
              })}
            </div>
          );
        })
      )}
    </div>
  );
}

/* ===================== SHARED FIELD HELPERS ===================== */
function Field({ label, value, onChange, textarea }) {
  return (
    <div>
      <label className="admin-label">{label}</label>
      {textarea
        ? <textarea className="admin-textarea" value={value || ""} onChange={(e) => onChange(e.target.value)} />
        : <input className="admin-input" value={value || ""} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}

function ListEditor({ label, items, onChange, addLabel }) {
  return (
    <div>
      <label className="admin-label">{label}</label>
      {items.map((item, i) => (
        <div className="admin-list-item" key={i}>
          <input className="admin-input" value={item} onChange={(e) => { const next = [...items]; next[i] = e.target.value; onChange(next); }} />
          <button className="admin-btn danger small" onClick={() => onChange(items.filter((_, j) => j !== i))}>Remove</button>
        </div>
      ))}
      <button className="admin-btn secondary small" onClick={() => onChange([...items, ""])}>＋ {addLabel || "Add"}</button>
    </div>
  );
}

function SaveBar({ onSave }) {
  return (
    <div className="save-bar">
      <button className="admin-btn" onClick={onSave}>Save changes</button>
      <span className="hint" style={{ margin: 0 }}>Changes go live after you save.</span>
    </div>
  );
}

/* ===================== CONTENT EDITOR ===================== */
function ContentEditor({ content, setContent, onSave }) {
  const s = content.screens;
  const setScreen = (key, patch) => setContent({ ...content, screens: { ...s, [key]: { ...s[key], ...patch } } });
  return (
    <>
      <div className="admin-card">
        <h2>Brand (shown on this form)</h2>
        <Field label="Business / form name" value={content.brand.name} onChange={(v) => setContent({ ...content, brand: { ...content.brand, name: v } })} />
        <Field label="Sub line (doctor / location)" value={content.brand.doctor} onChange={(v) => setContent({ ...content, brand: { ...content.brand, doctor: v } })} />
        <div className="admin-row">
          <div style={{ flex: 1 }}><Field label="Logo word 1" value={content.brand.wordmarkA} onChange={(v) => setContent({ ...content, brand: { ...content.brand, wordmarkA: v } })} /></div>
          <div style={{ flex: 1 }}><Field label="Logo word 2 (accent)" value={content.brand.wordmarkB} onChange={(v) => setContent({ ...content, brand: { ...content.brand, wordmarkB: v } })} /></div>
          <div style={{ flex: 1 }}><Field label="Initials" value={content.brand.initials} onChange={(v) => setContent({ ...content, brand: { ...content.brand, initials: v } })} /></div>
        </div>
        <Field label="Logo tagline" value={content.brand.tagline} onChange={(v) => setContent({ ...content, brand: { ...content.brand, tagline: v } })} />
      </div>

      <div className="admin-card">
        <h2>Page 1 · Intro</h2>
        <Field label="Eyebrow" value={s.intro.eyebrow} onChange={(v) => setScreen("intro", { eyebrow: v })} />
        <Field label="Headline" value={s.intro.title} onChange={(v) => setScreen("intro", { title: v })} textarea />
        <Field label="Subheadline" value={s.intro.subtitle} onChange={(v) => setScreen("intro", { subtitle: v })} textarea />
        <ListEditor label="Checklist items (add as many as you like)" items={s.intro.checklist} onChange={(items) => setScreen("intro", { checklist: items })} addLabel="Add checklist item" />
        <div className="admin-row">
          <div style={{ flex: 1 }}><Field label="Price ($)" value={s.intro.price} onChange={(v) => setScreen("intro", { price: v })} /></div>
          <div style={{ flex: 2 }}><Field label="Price note" value={s.intro.priceNote} onChange={(v) => setScreen("intro", { priceNote: v })} /></div>
        </div>
        <Field label="Button text" value={s.intro.button} onChange={(v) => setScreen("intro", { button: v })} />
        <Field label="Disclaimer" value={s.intro.disclaimer} onChange={(v) => setScreen("intro", { disclaimer: v })} textarea />
        <Field label="HIPAA badge text" value={s.intro.hipaaText} onChange={(v) => setScreen("intro", { hipaaText: v })} />
      </div>

      <div className="admin-card">
        <h2>Page 2 · Question 1</h2>
        <Field label="Progress label" value={s.q1.progressLabel} onChange={(v) => setScreen("q1", { progressLabel: v })} />
        <Field label="Question" value={s.q1.title} onChange={(v) => setScreen("q1", { title: v })} textarea />
        <Field label="Sub text" value={s.q1.subtitle} onChange={(v) => setScreen("q1", { subtitle: v })} />
        <ListEditor label="Answer choices" items={s.q1.options} onChange={(items) => setScreen("q1", { options: items })} addLabel="Add choice" />
        <Field label="Button text" value={s.q1.button} onChange={(v) => setScreen("q1", { button: v })} />
      </div>

      <div className="admin-card">
        <h2>Page 3 · Question 2</h2>
        <Field label="Progress label" value={s.q2.progressLabel} onChange={(v) => setScreen("q2", { progressLabel: v })} />
        <Field label="Question" value={s.q2.title} onChange={(v) => setScreen("q2", { title: v })} textarea />
        <Field label="Sub text" value={s.q2.subtitle} onChange={(v) => setScreen("q2", { subtitle: v })} />
        <ListEditor label="Answer choices" items={s.q2.options} onChange={(items) => setScreen("q2", { options: items })} addLabel="Add choice" />
        <Field label="Button text" value={s.q2.button} onChange={(v) => setScreen("q2", { button: v })} />
      </div>

      <div className="admin-card">
        <h2>Page 4 · Question 3 (Notes)</h2>
        <Field label="Eyebrow" value={s.q3.eyebrow} onChange={(v) => setScreen("q3", { eyebrow: v })} />
        <Field label="Question" value={s.q3.title} onChange={(v) => setScreen("q3", { title: v })} textarea />
        <Field label="Sub text" value={s.q3.subtitle} onChange={(v) => setScreen("q3", { subtitle: v })} />
        <Field label="Textarea placeholder" value={s.q3.placeholder} onChange={(v) => setScreen("q3", { placeholder: v })} />
        <div className="admin-row">
          <div style={{ flex: 1 }}><Field label="Button text" value={s.q3.button} onChange={(v) => setScreen("q3", { button: v })} /></div>
          <div style={{ flex: 1 }}><Field label="Skip link text" value={s.q3.skip} onChange={(v) => setScreen("q3", { skip: v })} /></div>
        </div>
      </div>

      <div className="admin-card">
        <h2>Page 5 · Contact</h2>
        <Field label="Eyebrow" value={s.contact.eyebrow} onChange={(v) => setScreen("contact", { eyebrow: v })} />
        <Field label="Headline" value={s.contact.title} onChange={(v) => setScreen("contact", { title: v })} textarea />
        <Field label="Sub text" value={s.contact.subtitle} onChange={(v) => setScreen("contact", { subtitle: v })} />
        <div className="admin-row">
          <div style={{ flex: 1 }}><Field label="Name label" value={s.contact.nameLabel} onChange={(v) => setScreen("contact", { nameLabel: v })} /></div>
          <div style={{ flex: 1 }}><Field label="Phone label" value={s.contact.phoneLabel} onChange={(v) => setScreen("contact", { phoneLabel: v })} /></div>
          <div style={{ flex: 1 }}><Field label="Email label" value={s.contact.emailLabel} onChange={(v) => setScreen("contact", { emailLabel: v })} /></div>
        </div>
        <Field label="Button text" value={s.contact.button} onChange={(v) => setScreen("contact", { button: v })} />
      </div>

      <div className="admin-card">
        <h2>Page 6 · Privacy</h2>
        <Field label="Eyebrow" value={s.privacy.eyebrow} onChange={(v) => setScreen("privacy", { eyebrow: v })} />
        <Field label="Headline" value={s.privacy.title} onChange={(v) => setScreen("privacy", { title: v })} />
        <Field label="Card label" value={s.privacy.cardLabel} onChange={(v) => setScreen("privacy", { cardLabel: v })} />
        <Field label="Privacy paragraph" value={s.privacy.cardText} onChange={(v) => setScreen("privacy", { cardText: v })} textarea />
        <Field label="Facebook link text" value={s.privacy.fbLinkText} onChange={(v) => setScreen("privacy", { fbLinkText: v })} />
        <Field label="Privacy policy link text" value={s.privacy.privacyLinkText} onChange={(v) => setScreen("privacy", { privacyLinkText: v })} />
        <Field label="Button text" value={s.privacy.button} onChange={(v) => setScreen("privacy", { button: v })} />
      </div>

      <div className="admin-card">
        <h2>Page 7 · Confirmation</h2>
        <Field label="Headline" value={s.confirm.title} onChange={(v) => setScreen("confirm", { title: v })} />
        <Field label="Sub text" value={s.confirm.subtitle} onChange={(v) => setScreen("confirm", { subtitle: v })} textarea />
        <ListEditor label="Numbered steps (add as many as you like)" items={s.confirm.steps} onChange={(items) => setScreen("confirm", { steps: items })} addLabel="Add step" />
        <Field label="Schedule button text" value={s.confirm.button} onChange={(v) => setScreen("confirm", { button: v })} />
        <Field label="HIPAA badge text" value={s.confirm.hipaaText} onChange={(v) => setScreen("confirm", { hipaaText: v })} />
        <Field label="Address line" value={s.confirm.addressText} onChange={(v) => setScreen("confirm", { addressText: v })} />
      </div>

      <SaveBar onSave={onSave} />
    </>
  );
}

/* ===================== LINKS / THEME / PHOTO ===================== */
function LinksEditor({ content, setContent, onSave }) {
  const setLink = (key, v) => setContent({ ...content, links: { ...content.links, [key]: v } });
  return (
    <>
      <div className="admin-card">
        <h2>Clickable Links</h2>
        <p className="hint">Paste the destination web address for each clickable item on the form.</p>
        <Field label="HIPAA page URL (footer HIPAA badge opens this)" value={content.links.hipaaUrl} onChange={(v) => setLink("hipaaUrl", v)} />
        <Field label="Address text (shown on the form)" value={content.links.addressText} onChange={(v) => setLink("addressText", v)} />
        <Field label="Google Maps URL (address opens this)" value={content.links.mapsUrl} onChange={(v) => setLink("mapsUrl", v)} />
        <Field label="Schedule My Appointment URL (your real booking page)" value={content.links.scheduleUrl} onChange={(v) => setLink("scheduleUrl", v)} />
        <Field label="Facebook Data Policy URL" value={content.links.fbPolicyUrl} onChange={(v) => setLink("fbPolicyUrl", v)} />
        <Field label="Your Privacy Policy URL" value={content.links.privacyPolicyUrl} onChange={(v) => setLink("privacyPolicyUrl", v)} />
      </div>
      <SaveBar onSave={onSave} />
    </>
  );
}

function ThemeEditor({ content, setContent, onSave }) {
  const setTheme = (patch) => { const next = { ...content, theme: { ...content.theme, ...patch } }; setContent(next); applyTheme(next.theme); };
  const t = content.theme;
  return (
    <>
      <div className="admin-card">
        <h2>Theme Colors</h2>
        <p className="hint">Changes preview instantly. Click Save to keep them.</p>
        <div className="admin-row">
          <ColorField label="Accent" value={t.gold} onChange={(v) => setTheme({ gold: v })} />
          <ColorField label="Background" value={t.bg} onChange={(v) => setTheme({ bg: v })} />
          <ColorField label="Card background" value={t.card} onChange={(v) => setTheme({ card: v })} />
        </div>
      </div>
      <div className="admin-card">
        <h2>Fonts</h2>
        <FontField label="Body font" value={t.bodyFont} onChange={(v) => setTheme({ bodyFont: v })} />
        <FontField label="Headline font (display)" value={t.displayFont} onChange={(v) => setTheme({ displayFont: v })} />
        <FontField label="Accent serif font" value={t.serifFont} onChange={(v) => setTheme({ serifFont: v })} />
      </div>
      <SaveBar onSave={onSave} />
    </>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div style={{ flex: 1 }}>
      <label className="admin-label">{label}</label>
      <div className="admin-row">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 44, height: 40, border: "none", background: "none", cursor: "pointer" }} />
        <input className="admin-input" value={value} onChange={(e) => onChange(e.target.value)} style={{ flex: 1 }} />
      </div>
    </div>
  );
}

function FontField({ label, value, onChange }) {
  return (
    <div>
      <label className="admin-label">{label}</label>
      <select className="admin-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {FONT_CHOICES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>
    </div>
  );
}

function PhotoEditor({ content, setContent, onSave }) {
  function onFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setContent({ ...content, photo: ev.target.result });
    reader.readAsDataURL(file);
  }
  return (
    <>
      <div className="admin-card">
        <h2>Profile / Header Photo</h2>
        <p className="hint">Appears in the header on every page and as the big circle on the final page. Leave empty to use the default logo.</p>
        <div className="admin-row" style={{ alignItems: "center" }}>
          <div style={{ width: 96, height: 96, borderRadius: "50%", overflow: "hidden", border: "2px solid var(--gold)", background: "#0f1115", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {content.photo ? <img src={content.photo} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#8b93a4", fontSize: 12 }}>No photo</span>}
          </div>
          <div>
            <input type="file" accept="image/*" onChange={onFile} />
            {content.photo && <button className="admin-btn danger small" style={{ marginLeft: 10 }} onClick={() => setContent({ ...content, photo: "" })}>Remove photo</button>}
          </div>
        </div>
      </div>
      <SaveBar onSave={onSave} />
    </>
  );
}
