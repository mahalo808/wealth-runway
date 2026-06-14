import React, { useMemo } from "react";
import {
  fireNumber,
  baristaFireNumber,
  expatFireNumber,
  coastFireNumber,
  MILESTONES,
  BOGLEHEAD_PRESET,
  STANDARD_PRESET,
} from "../lib/fire.js";
import { summarizeNetWorth } from "../lib/networth.js";
import { CURRENCIES, findCurrency } from "../lib/currency.js";
import { formatCurrency, formatPercent } from "../lib/format.js";
import { NumberField, SelectField, Stat, Section } from "../components/ui.jsx";

const MODES = [
  { id: "standard", label: "Standard FIRE", blurb: "Portfolio fully funds your spending." },
  { id: "barista", label: "Barista FIRE", blurb: "Part-time income covers part of the bills." },
  { id: "expat", label: "Expat FIRE", blurb: "Retire where your money goes further." },
];

const EXPAT_COUNTRIES = [
  { name: "Portugal", factor: 0.55 },
  { name: "Mexico", factor: 0.5 },
  { name: "Thailand", factor: 0.4 },
  { name: "Spain", factor: 0.6 },
  { name: "Vietnam", factor: 0.38 },
  { name: "Costa Rica", factor: 0.6 },
  { name: "Greece", factor: 0.58 },
  { name: "Custom", factor: null },
];

export default function FirePlan({ state, setState, derived }) {
  const { fire, profile } = state;
  const setFire = (key, value) => setState((s) => ({ ...s, fire: { ...s.fire, [key]: value } }));
  const setProfile = (key, value) =>
    setState((s) => ({ ...s, profile: { ...s.profile, [key]: value } }));

  const preset = fire.boglehead ? BOGLEHEAD_PRESET : STANDARD_PRESET;
  const annualReturn = fire.returnOverride ?? preset.realReturn;
  const swr = preset.swr;

  const colFactor = useMemo(() => {
    const found = EXPAT_COUNTRIES.find((c) => c.name === fire.country);
    if (!found) return 1;
    return found.factor === null ? fire.customFactor : found.factor;
  }, [fire.country, fire.customFactor]);

  const target = useMemo(() => {
    if (fire.mode === "barista") return baristaFireNumber(fire.annualSpending, fire.baristaIncome, swr);
    if (fire.mode === "expat") return expatFireNumber(fire.annualSpending, colFactor, swr);
    return fireNumber(fire.annualSpending, swr);
  }, [fire.mode, fire.annualSpending, fire.baristaIncome, colFactor, swr]);

  const nw = summarizeNetWorth(state.accounts);
  const currency = findCurrency(fire.currency);
  const localTarget = target * currency.perUsd;
  const progress = target ? Math.min(100, (nw.investable / target) * 100) : 0;

  const coast = coastFireNumber({
    fullTarget: target,
    currentAge: profile.currentAge,
    retireAge: profile.retireAge || profile.currentAge,
    annualReturn,
  });

  return (
    <div className="stack">
      <div className="stats stats--4">
        <Stat label="FIRE number" value={formatCurrency(target)} hint={`${formatPercent(swr)} withdrawal`} accent />
        <Stat label="Investable today" value={formatCurrency(nw.investable)} hint="From Net Worth tab" />
        <Stat label="Progress" value={`${progress.toFixed(0)}%`} hint="Of FIRE number" />
        <Stat
          label="Coast FIRE"
          value={formatCurrency(coast)}
          hint="Saved today, no more contributions"
        />
      </div>

      <Section title="Mode">
        <div className="modes">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={`mode ${fire.mode === m.id ? "mode--active" : ""}`}
              onClick={() => setFire("mode", m.id)}
            >
              <strong>{m.label}</strong>
              <span>{m.blurb}</span>
            </button>
          ))}
        </div>

        <label className="toggle">
          <input
            type="checkbox"
            checked={fire.boglehead}
            onChange={(e) => {
              setFire("boglehead", e.target.checked);
              setFire("returnOverride", null);
            }}
          />
          <span className="toggle__track" aria-hidden="true">
            <span className="toggle__thumb" />
          </span>
          <span className="toggle__text">
            <strong>Boglehead mode</strong>
            <small>
              Low-cost index assumptions: {Math.round(BOGLEHEAD_PRESET.realReturn * 100)}% real
              return, {(BOGLEHEAD_PRESET.swr * 100).toFixed(1)}% withdrawal rate.
            </small>
          </span>
        </label>
      </Section>

      <Section title="Your numbers">
        <div className="grid">
          <NumberField label="Current age" value={profile.currentAge} onChange={(v) => setProfile("currentAge", v)} step={1} suffix="yrs" />
          <NumberField label="Target retirement age" value={profile.retireAge} onChange={(v) => setProfile("retireAge", v)} step={1} suffix="yrs" />
          <NumberField label="Annual spending" value={fire.annualSpending} onChange={(v) => setFire("annualSpending", v)} prefix="$" step={1000} />
          <NumberField label="Annual contribution" value={fire.annualContribution} onChange={(v) => setFire("annualContribution", v)} prefix="$" step={1000} />
        </div>

        {fire.mode === "barista" && (
          <div className="grid">
            <NumberField label="Part-time / barista income" value={fire.baristaIncome} onChange={(v) => setFire("baristaIncome", v)} prefix="$" step={1000} />
          </div>
        )}

        {fire.mode === "expat" && (
          <div className="grid">
            <SelectField
              label="Destination"
              value={fire.country}
              onChange={(v) => setFire("country", v)}
              options={EXPAT_COUNTRIES.map((c) => ({
                value: c.name,
                label: c.factor !== null ? `${c.name} (${Math.round(c.factor * 100)}% of US)` : "Custom",
              }))}
            />
            {fire.country === "Custom" && (
              <NumberField label="Cost-of-living factor" value={fire.customFactor} onChange={(v) => setFire("customFactor", v)} step={0.05} suffix="× US" />
            )}
            <SelectField
              label="Show target in"
              value={fire.currency}
              onChange={(v) => setFire("currency", v)}
              options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.label}` }))}
            />
          </div>
        )}

        <label className="field">
          <span className="field__label">Expected real return: {formatPercent(annualReturn)}</span>
          <input
            className="slider"
            type="range"
            min="2"
            max="10"
            step="0.5"
            value={annualReturn * 100}
            onChange={(e) => setFire("returnOverride", Number(e.target.value) / 100)}
          />
        </label>

        {fire.mode === "expat" && currency.code !== "USD" && (
          <p className="note">
            FIRE number in {currency.code}: <strong>{formatCurrency(localTarget, currency.code)}</strong>{" "}
            (static reference rate).
          </p>
        )}
      </Section>

      <Section title="Milestones" subtitle="Lean / FIRE / Fat targets and your progress toward each.">
        <div className="fmiles">
          {MILESTONES.map((m) => {
            const mTarget = (fire.annualSpending / swr) * m.factor;
            const pct = mTarget ? Math.min(100, (nw.investable / mTarget) * 100) : 0;
            return (
              <div key={m.key} className="fmile">
                <div className="fmile__top">
                  <span className="fmile__dot" style={{ background: m.color }} />
                  <strong>{m.label}</strong>
                  <span className="fmile__amt">{formatCurrency(mTarget)}</span>
                </div>
                <div className="fmile__bar">
                  <span style={{ width: `${pct}%`, background: m.color }} />
                </div>
                <span className="fmile__pct">{pct.toFixed(0)}% funded</span>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
