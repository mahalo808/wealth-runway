// Optional AI client. Three providers, all BYO and free:
//  - "ollama":  fully local models via http://localhost:11434 (no data leaves PC)
//  - "openai":  any OpenAI-compatible endpoint (Groq, OpenRouter, LM Studio, etc.)
//  - "manual":  copy a prompt into Copilot/ChatGPT and paste the answer back
// Nothing is sent anywhere unless the user picks a network provider and acts.

const SETTINGS_KEY = "wealthrunway.ai.v1";

export const PROVIDERS = [
  { id: "manual", label: "Manual (copy to Copilot/ChatGPT)" },
  { id: "ollama", label: "Ollama (local, private)" },
  { id: "openai", label: "OpenAI-compatible (Groq, OpenRouter, LM Studio…)" },
];

export const PRESETS = {
  ollama: { baseUrl: "http://localhost:11434", model: "llama3.1" },
  groq: { baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", model: "meta-llama/llama-3.1-8b-instruct:free" },
  lmstudio: { baseUrl: "http://localhost:1234/v1", model: "local-model" },
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { provider: "manual", baseUrl: "http://localhost:11434", model: "llama3.1", apiKey: "", rememberKey: false };
}

export function saveSettings(s) {
  try {
    const toStore = { ...s };
    if (!s.rememberKey) toStore.apiKey = ""; // don't persist secrets by default
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(toStore));
  } catch {
    /* storage may be unavailable */
  }
}

const SYSTEM = "You are a blunt, experienced personal-finance coach. Be specific, current, and honest. Not financial advice.";

export async function askAI(settings, prompt) {
  if (settings.provider === "ollama") return askOllama(settings, prompt);
  if (settings.provider === "openai") return askOpenAI(settings, prompt);
  throw new Error("manual");
}

async function askOllama({ baseUrl, model }, prompt) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || "llama3.1",
      stream: false,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}. Is it running? Start with OLLAMA_ORIGINS=* ollama serve`);
  const data = await res.json();
  return data?.message?.content || "(empty response)";
}

async function askOpenAI({ baseUrl, model, apiKey }, prompt) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${txt.slice(0, 160)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "(empty response)";
}
