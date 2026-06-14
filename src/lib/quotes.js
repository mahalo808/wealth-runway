// Live price lookup (feature 4). Uses Stooq's no-key CSV endpoint, which is
// offline/CORS-friendly-ish. All failures degrade gracefully to null so the
// app keeps working without network access.
import { num } from "./format.js";

const ENDPOINT = (symbol) =>
  `https://stooq.com/q/l/?s=${encodeURIComponent(symbol.toLowerCase())}.us&f=sd2t2ohlcv&h&e=csv`;

// Fetch a single quote. Returns a number (last price) or null.
export async function fetchQuote(ticker) {
  const symbol = String(ticker || "").trim();
  if (!symbol) return null;
  try {
    const res = await fetch(ENDPOINT(symbol), { mode: "cors" });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) return null;
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const cols = lines[1].split(",");
    const closeIdx = header.indexOf("close");
    const raw = closeIdx >= 0 ? cols[closeIdx] : cols[6];
    const price = num(raw, NaN);
    return Number.isFinite(price) && price > 0 ? price : null;
  } catch {
    return null;
  }
}

// Fetch quotes for many tickers; returns a { TICKER: price } map (only the
// ones that succeed). Runs sequentially to be gentle on the free endpoint.
export async function fetchQuotes(tickers = []) {
  const unique = [...new Set(tickers.map((t) => String(t || "").trim().toUpperCase()).filter(Boolean))];
  const out = {};
  for (const t of unique) {
    const price = await fetchQuote(t);
    if (price != null) out[t] = price;
  }
  return out;
}
