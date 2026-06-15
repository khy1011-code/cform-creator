// Pushes the saved theme into CSS variables so the whole UI restyles.
export function applyTheme(theme) {
  if (typeof document === "undefined" || !theme) return;
  const root = document.documentElement;
  const set = (k, v) => v && root.style.setProperty(k, v);
  set("--gold", theme.gold);
  set("--gold-light", lighten(theme.gold, 12));
  set("--gold-btn-start", theme.gold);
  set("--gold-btn-end", darken(theme.gold, 28));
  set("--bg", theme.bg);
  set("--card", theme.card);
  set("--font-sans", theme.bodyFont);
  set("--font-display", theme.displayFont);
  set("--font-serif", theme.serifFont);
}

function clamp(n) { return Math.max(0, Math.min(255, n)); }
function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}
function toHex([r, g, b]) {
  return "#" + [r, g, b].map((x) => clamp(Math.round(x)).toString(16).padStart(2, "0")).join("");
}
function lighten(hex, pct) {
  const rgb = hexToRgb(hex); if (!rgb) return hex;
  return toHex(rgb.map((c) => c + (255 - c) * (pct / 100)));
}
function darken(hex, pct) {
  const rgb = hexToRgb(hex); if (!rgb) return hex;
  return toHex(rgb.map((c) => c * (1 - pct / 100)));
}
