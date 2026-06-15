import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { DEFAULT_CONTENT, mergeDeep } from "./content";

const LS_KEY = "cform_forms";

// A short, URL-safe, fairly-unique slug, e.g. "k7p2qa".
export function makeSlug(len = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// Normalize a user-typed slug into something safe for a URL.
export function cleanSlug(input) {
  return (input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

// Reserved paths a form slug must never collide with.
export const RESERVED = ["admin", "api", "_next", "favicon.ico", ""];

function blankForm(title) {
  return {
    id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
    slug: makeSlug(),
    title: title || "Untitled form",
    data: JSON.parse(JSON.stringify(DEFAULT_CONTENT)),
    created_at: new Date().toISOString(),
  };
}

/* ----------------------- READ ----------------------- */
export async function listForms() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("forms")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(hydrate);
  }
  return readDemo();
}

export async function getFormBySlug(slug) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("forms")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    return hydrate(data);
  }
  return readDemo().find((f) => f.slug === slug) || null;
}

/* ----------------------- WRITE ---------------------- */
export async function createForm(title) {
  const form = blankForm(title);
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("forms")
      .insert({ slug: form.slug, title: form.title, data: form.data })
      .select()
      .single();
    if (error) throw error;
    return hydrate(data);
  }
  const all = readDemo();
  all.unshift(form);
  writeDemo(all);
  return form;
}

export async function updateForm(form) {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from("forms")
      .update({ slug: form.slug, title: form.title, data: form.data, updated_at: new Date().toISOString() })
      .eq("id", form.id);
    if (error) throw error;
    return { mode: "live" };
  }
  const all = readDemo().map((f) => (f.id === form.id ? form : f));
  writeDemo(all);
  return { mode: "demo" };
}

export async function deleteForm(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from("forms").delete().eq("id", id);
    if (error) throw error;
  } else {
    writeDemo(readDemo().filter((f) => f.id !== id));
  }
}

// Is this slug free? (ignoring the form currently being edited)
export async function isSlugAvailable(slug, ignoreId) {
  if (RESERVED.includes(slug)) return false;
  const all = await listForms();
  return !all.some((f) => f.slug === slug && f.id !== ignoreId);
}

// Seed a sample form on first run so the user has something to see.
export async function ensureSampleForm() {
  const all = await listForms();
  if (all.length > 0) return all;
  const form = blankForm("True You — Hormone Evaluation (sample)");
  form.slug = "trueyou";
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("forms")
      .insert({ slug: form.slug, title: form.title, data: form.data })
      .select()
      .single();
    if (!error && data) return [hydrate(data)];
    return [];
  }
  writeDemo([form]);
  return [form];
}

/* ----------------------- helpers -------------------- */
function hydrate(row) {
  return { ...row, data: mergeDeep(DEFAULT_CONTENT, row.data || {}) };
}
function readDemo() {
  if (typeof window === "undefined") return [];
  try {
    return (JSON.parse(localStorage.getItem(LS_KEY) || "[]")).map((f) => ({
      ...f,
      data: mergeDeep(DEFAULT_CONTENT, f.data || {}),
    }));
  } catch (_) {
    return [];
  }
}
function writeDemo(all) {
  if (typeof window !== "undefined") localStorage.setItem(LS_KEY, JSON.stringify(all));
}
