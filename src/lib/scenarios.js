// Scenario save / load / compare (feature 1) + CSV export (feature 7).
// Named scenarios persist in localStorage. The *working draft* is intentionally
// NOT auto-restored, so the app always opens as a clean slate.
import { summarizeNetWorth } from "./networth.js";
import { formatCurrency } from "./format.js";

const KEY = "wealthrunway.scenarios.v1";

export function listScenarios() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

export function saveScenario(name, state) {
  const list = listScenarios();
  const clean = name.trim() || `Scenario ${list.length + 1}`;
  const entry = { id: `sc_${Date.now()}`, name: clean, savedAt: new Date().toISOString(), state };
  const existingIdx = list.findIndex((s) => s.name === clean);
  if (existingIdx >= 0) list[existingIdx] = entry;
  else list.push(entry);
  persist(list);
  return list;
}

export function deleteScenario(id) {
  const list = listScenarios().filter((s) => s.id !== id);
  persist(list);
  return list;
}

// Build a compact comparison row for a saved scenario.
export function compareRow(scenario) {
  const s = scenario.state;
  const nw = summarizeNetWorth(s.accounts || []);
  return {
    id: scenario.id,
    name: scenario.name,
    netWorth: nw.netWorth,
    investable: nw.investable,
    annualSpending: s.fire?.annualSpending || 0,
    retireAge: s.profile?.retireAge || 0,
  };
}

// CSV export of the account list.
export function accountsToCsv(accounts = []) {
  const header = ["Group", "Name", "Value", "Ticker", "Shares", "TaxType"];
  const rows = accounts.map((a) =>
    [a.group, a.name, a.value, a.ticker, a.shares, a.taxType]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

export function downloadFile(filename, content, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export { formatCurrency };
