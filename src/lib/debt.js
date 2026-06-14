// Debt & mortgage module (feature 5): amortization and payoff-vs-invest.
import { num } from "./format.js";

// Amortize a single debt. Returns months to payoff, total interest, and a
// yearly balance schedule. Guards against payments that never amortize.
export function amortize(debt) {
  const balance0 = num(debt.balance);
  const annualRate = num(debt.rate) / 100;
  const monthlyRate = annualRate / 12;
  const payment = num(debt.payment) + num(debt.extraPayment);

  if (balance0 <= 0) return { months: 0, totalInterest: 0, schedule: [], neverPaysOff: false };

  const minInterest = balance0 * monthlyRate;
  if (payment <= minInterest && monthlyRate > 0) {
    return { months: Infinity, totalInterest: Infinity, schedule: [], neverPaysOff: true };
  }

  let balance = balance0;
  let months = 0;
  let totalInterest = 0;
  const schedule = [{ year: 0, balance: Math.round(balance) }];

  while (balance > 0 && months < 1200) {
    const interest = balance * monthlyRate;
    totalInterest += interest;
    balance = balance + interest - payment;
    months += 1;
    if (balance < 0) balance = 0;
    if (months % 12 === 0) schedule.push({ year: months / 12, balance: Math.round(balance) });
  }
  if (months % 12 !== 0) schedule.push({ year: +(months / 12).toFixed(1), balance: 0 });

  return { months, totalInterest, schedule, neverPaysOff: false };
}

export function summarizeDebts(debts = []) {
  let totalBalance = 0;
  let totalMonthly = 0;
  let totalInterest = 0;
  let maxMonths = 0;
  for (const d of debts) {
    totalBalance += num(d.balance);
    totalMonthly += num(d.payment) + num(d.extraPayment);
    const r = amortize(d);
    if (Number.isFinite(r.totalInterest)) totalInterest += r.totalInterest;
    if (Number.isFinite(r.months)) maxMonths = Math.max(maxMonths, r.months);
  }
  return { totalBalance, totalMonthly, totalInterest, maxMonths };
}

// Payoff vs. invest: compare paying extra on the highest-rate debt against
// investing that same money at an expected return over a horizon.
export function payoffVsInvest({ debtRate, investReturn, extra, years }) {
  const r = num(debtRate) / 100;
  const m = num(investReturn) / 100;
  const monthsTotal = num(years) * 12;
  const e = num(extra);

  // Future value of investing `extra`/yr (as monthly) at investReturn.
  const monthlyContribution = e;
  let invest = 0;
  for (let i = 0; i < monthsTotal; i++) invest = invest * (1 + m / 12) + monthlyContribution;

  // Guaranteed "return" from debt payoff is the avoided interest rate.
  let payoff = 0;
  for (let i = 0; i < monthsTotal; i++) payoff = payoff * (1 + r / 12) + monthlyContribution;

  return {
    investValue: Math.round(invest),
    payoffValue: Math.round(payoff),
    winner: invest > payoff ? "invest" : "payoff",
    edge: Math.round(Math.abs(invest - payoff)),
  };
}
