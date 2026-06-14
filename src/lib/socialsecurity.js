// Social Security claim-age optimizer (feature 9).
// Uses the standard SSA reduction/credit rules relative to Full Retirement Age.
import { num } from "./format.js";

// Benefit multiplier vs. the FRA (Full Retirement Age = 67 for those born 1960+).
// - Early claiming (62..67): ~6.67%/yr for first 3 yrs, 5%/yr beyond.
// - Delayed claiming (67..70): 8%/yr delayed retirement credits.
export function benefitMultiplier(claimAge, fra = 67) {
  const age = num(claimAge, fra);
  if (age === fra) return 1;
  if (age < fra) {
    const monthsEarly = (fra - age) * 12;
    const first36 = Math.min(monthsEarly, 36);
    const beyond = Math.max(monthsEarly - 36, 0);
    const reduction = first36 * (5 / 9 / 100) + beyond * (5 / 12 / 100);
    return Math.max(0, 1 - reduction);
  }
  const monthsDelayed = Math.min((age - fra) * 12, 36); // credits stop at 70
  return 1 + monthsDelayed * (8 / 12 / 100);
}

// Build a table across claim ages 62..70 with monthly benefit and cumulative
// lifetime payout to a planning age (life expectancy), to find the optimum.
export function optimizeClaim({ monthlyAtFra, fra = 67, colaRate = 0.02, lifeExpectancy = 90 }) {
  const base = num(monthlyAtFra);
  const cola = num(colaRate);
  const rows = [];

  for (let age = 62; age <= 70; age++) {
    const monthly = base * benefitMultiplier(age, fra);
    let lifetime = 0;
    for (let a = age; a < lifeExpectancy; a++) {
      lifetime += monthly * 12 * Math.pow(1 + cola, a - age);
    }
    rows.push({
      claimAge: age,
      monthly: Math.round(monthly),
      annual: Math.round(monthly * 12),
      lifetime: Math.round(lifetime),
    });
  }

  const best = rows.reduce((a, b) => (b.lifetime > a.lifetime ? b : a), rows[0]);
  return { rows, bestAge: best.claimAge, bestLifetime: best.lifetime };
}
