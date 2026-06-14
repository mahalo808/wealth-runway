import React, { useState } from "react";
import { listScenarios, saveScenario, deleteScenario, compareRow, accountsToCsv, downloadFile } from "../lib/scenarios.js";
import { buildShareUrl } from "../lib/share.js";
import { formatCurrency } from "../lib/format.js";
import { Stat, Section, Button, TextField } from "../components/ui.jsx";

export default function Scenarios({ state, setState, onLoadState }) {
  const [scenarios, setScenarios] = useState(() => listScenarios());
  const [name, setName] = useState("");
  const [shareMsg, setShareMsg] = useState("");

  const refresh = () => setScenarios(listScenarios());

  const save = () => {
    setScenarios(saveScenario(name || `Scenario ${scenarios.length + 1}`, state));
    setName("");
  };
  const load = (sc) => onLoadState(sc.state);
  const duplicate = (sc) => {
    setScenarios(saveScenario(`${sc.name} (copy)`, sc.state));
  };
  const remove = (id) => setScenarios(deleteScenario(id));

  const copyShare = async () => {
    const url = buildShareUrl(state);
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg("Share link copied to clipboard.");
    } catch {
      setShareMsg(url);
    }
  };

  const exportJson = () => downloadFile("wealth-runway-plan.json", JSON.stringify(state, null, 2));
  const exportCsv = () => downloadFile("wealth-runway-accounts.csv", accountsToCsv(state.accounts), "text/csv");

  const importJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onLoadState(JSON.parse(reader.result));
      } catch {
        alert("That file isn't a valid Wealth Runway plan.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const rows = scenarios.map(compareRow);

  return (
    <div className="stack">
      <Section title="Save & compare scenarios" subtitle="Save snapshots of your plan and compare them side by side. Saved plans stay in this browser only.">
        <div className="save-row">
          <TextField value={name} onChange={setName} placeholder="Name this scenario (e.g. Retire at 55)" />
          <Button variant="primary" onClick={save}>Save current</Button>
        </div>

        {rows.length ? (
          <div className="table-scroll" style={{ marginTop: 14 }}>
            <table className="cmp">
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Net worth</th>
                  <th>Investable</th>
                  <th>Spending</th>
                  <th>Retire age</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{formatCurrency(r.netWorth)}</td>
                    <td>{formatCurrency(r.investable)}</td>
                    <td>{formatCurrency(r.annualSpending)}</td>
                    <td>{r.retireAge || "—"}</td>
                    <td className="cmp__actions">
                      <button className="link" onClick={() => load(scenarios.find((s) => s.id === r.id))}>Load</button>
                      <button className="link" onClick={() => duplicate(scenarios.find((s) => s.id === r.id))}>Duplicate</button>
                      <button className="link link--danger" onClick={() => remove(r.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="note">No saved scenarios yet. Build a plan and click “Save current”.</p>
        )}
      </Section>

      <Section title="Share, import & export" subtitle="Everything is encoded client-side — no account needed.">
        <div className="row-actions">
          <Button variant="ghost" onClick={copyShare}>🔗 Copy share link</Button>
          <Button variant="ghost" onClick={exportJson}>⭳ Export JSON</Button>
          <Button variant="ghost" onClick={exportCsv}>⭳ Export accounts CSV</Button>
          <label className="btn btn--ghost file-btn">
            ⭱ Import JSON
            <input type="file" accept="application/json" onChange={importJson} hidden />
          </label>
        </div>
        {shareMsg && <p className="note" style={{ wordBreak: "break-all" }}>{shareMsg}</p>}
        <p className="note">
          A share link packs your whole plan into the URL. Anyone with the link sees the numbers, so only share with people you trust.
        </p>
      </Section>
    </div>
  );
}
