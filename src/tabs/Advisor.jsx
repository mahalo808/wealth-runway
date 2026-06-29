import React, { useMemo, useState } from "react";
import { reviewPortfolio, buildAdvicePrompt } from "../lib/advisor.js";
import { PROVIDERS, PRESETS, loadSettings, saveSettings, askAI } from "../lib/ai.js";
import { RH_AGENT_TIPS, parseRobinhood } from "../lib/robinhood.js";
import { Section, SelectField, TextField, Button } from "../components/ui.jsx";

export default function Advisor({ state, setState }) {
  const { period, findings } = useMemo(() => reviewPortfolio(state), [state]);
  const prompt = useMemo(() => buildAdvicePrompt(state), [state]);

  const [cfg, setCfg] = useState(loadSettings);
  const [status, setStatus] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [rhText, setRhText] = useState("");
  const [rhMsg, setRhMsg] = useState("");

  const importRh = () => {
    const parsed = parseRobinhood(rhText);
    if (!parsed.length) {
      setRhMsg("No holdings detected. Paste rows like “AAPL 50 $9,000” or “Brokerage $125,447”.");
      return;
    }
    setState((s) => ({ ...s, accounts: [...s.accounts, ...parsed] }));
    setRhMsg(`Imported ${parsed.length} holding${parsed.length === 1 ? "" : "s"} as investments. See the Net Worth tab.`);
    setRhText("");
  };

  const set = (k, v) => {
    const next = { ...cfg, [k]: v };
    setCfg(next);
    saveSettings(next);
  };
  const applyPreset = (key) => {
    if (!PRESETS[key]) return;
    const next = { ...cfg, ...PRESETS[key], provider: key === "ollama" ? "ollama" : "openai" };
    setCfg(next);
    saveSettings(next);
  };

  const run = async () => {
    setBusy(true);
    setStatus("Thinking…");
    setAnswer("");
    try {
      const text = await askAI(cfg, prompt);
      setAnswer(text);
      setStatus("");
    } catch (e) {
      setStatus(e.message === "manual" ? "" : `Couldn't reach the model: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setStatus("Prompt copied — paste into Copilot/ChatGPT, then paste the reply below.");
    } catch {
      setStatus("Copy failed; select the prompt text manually.");
    }
  };

  return (
    <div className="stack">
      <Section title={`Portfolio review — ${period}`} subtitle="Automatic checks for poor or risky allocations. Heuristics for education, not financial advice.">
        <div className="findings">
          {findings.map((f, i) => (
            <div key={i} className={`finding finding--${f.severity}`}>
              <strong>{f.title}</strong>
              <span>{f.body}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="AI second opinion" subtitle="Bring your own free model. Ollama runs fully local; cloud APIs send your snapshot off-device.">
        <SelectField label="Provider" value={cfg.provider} onChange={(v) => set("provider", v)} options={PROVIDERS.map((p) => ({ value: p.id, label: p.label }))} />

        {cfg.provider !== "manual" && (
          <>
            <div className="grid">
              <TextField label="Base URL" value={cfg.baseUrl} onChange={(v) => set("baseUrl", v)} />
              <TextField label="Model" value={cfg.model} onChange={(v) => set("model", v)} />
            </div>
            {cfg.provider === "openai" && (
              <>
                <TextField label="API key (kept in this browser only)" value={cfg.apiKey} onChange={(v) => set("apiKey", v)} placeholder="sk-… / gsk_…" />
                <label className="toggle toggle--sm">
                  <input type="checkbox" checked={!!cfg.rememberKey} onChange={(e) => set("rememberKey", e.target.checked)} />
                  <span className="toggle__track" aria-hidden="true"><span className="toggle__thumb" /></span>
                  <span className="toggle__text"><strong>Remember API key</strong><small>Off = cleared on reload</small></span>
                </label>
              </>
            )}
            <div className="chip-row">
              <button className="chip" onClick={() => applyPreset("ollama")}>Ollama</button>
              <button className="chip" onClick={() => applyPreset("groq")}>Groq free</button>
              <button className="chip" onClick={() => applyPreset("openrouter")}>OpenRouter free</button>
              <button className="chip" onClick={() => applyPreset("lmstudio")}>LM Studio</button>
            </div>
          </>
        )}

        <div className="row-actions" style={{ marginTop: 12 }}>
          {cfg.provider === "manual" ? (
            <Button variant="primary" onClick={copyPrompt}>Copy prompt for Copilot/ChatGPT</Button>
          ) : (
            <Button variant="primary" onClick={run} disabled={busy}>{busy ? "Analyzing…" : "Generate suggestions"}</Button>
          )}
        </div>
        {status && <p className="note">{status}</p>}

        {cfg.provider === "manual" && (
          <textarea className="ai-box" readOnly value={prompt} onFocus={(e) => e.target.select()} />
        )}
        {answer && <div className="ai-answer">{answer}</div>}

        <p className="note">Cloud providers receive your account totals — use Ollama/LM Studio to keep everything on your machine. Either way, this is educational, not financial advice.</p>
      </Section>

      <Section title="Robinhood AI integration" subtitle="How to get the most from Robinhood Cortex (agentic AI) and the Gold Card AI — plus a quick holdings import.">
        <div className="findings">
          {RH_AGENT_TIPS.map((t, i) => (
            <div key={i} className="finding finding--watch">
              <strong>{t.title}</strong>
              <span>{t.body}</span>
            </div>
          ))}
        </div>
        <p className="note" style={{ marginTop: 12 }}>
          Live account linking needs OAuth + a backend, so it's off by default here. Paste your Robinhood positions (one per line) to import them:
        </p>
        <textarea
          className="ai-box"
          placeholder={"AAPL 50 $9,000\nBrokerage - 6787 $125,447.79\nVTI 320 $96,000"}
          value={rhText}
          onChange={(e) => setRhText(e.target.value)}
        />
        <div className="row-actions" style={{ marginTop: 8 }}>
          <Button variant="primary" onClick={importRh}>Import holdings</Button>
        </div>
        {rhMsg && <p className="note">{rhMsg}</p>}
      </Section>
    </div>
  );
}
