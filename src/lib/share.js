// Save/share the full scenario via the URL hash — no backend (feature 7).
// The entire state object is JSON-encoded and base64url-packed into location.hash.

function toBase64Url(str) {
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  return decodeURIComponent(escape(atob(b64 + pad)));
}

export function encodeState(state) {
  try {
    return toBase64Url(JSON.stringify(state));
  } catch {
    return "";
  }
}

export function decodeState(token) {
  try {
    return JSON.parse(fromBase64Url(token));
  } catch {
    return null;
  }
}

// Build a full shareable URL for the current state.
export function buildShareUrl(state) {
  const token = encodeState(state);
  const base = `${location.origin}${location.pathname}`;
  return `${base}#s=${token}`;
}

// Read a shared state from the current URL hash, if present.
export function readStateFromHash() {
  const hash = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
  const params = new URLSearchParams(hash);
  const token = params.get("s");
  return token ? decodeState(token) : null;
}
