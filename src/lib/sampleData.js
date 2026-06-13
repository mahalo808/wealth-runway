// Default scenario shown on first load. Realistic but generic U.S. numbers.

let _id = 0;
const uid = () => `id_${Date.now().toString(36)}_${_id++}`;

export function defaultState() {
  return {
    currentAge: 32,
    retirementAge: 65,
    endAge: 95,
    inflationRate: 2.5,

    comp: {
      baseSalary: 145000,
      annualBonus: 20000,
      raiseRate: 3.5,
      savingsRate: 18,
      investReturn: 7,
    },

    retirement: {
      annualSpending: 80000,
      returnRate: 5,
    },

    socialSecurity: {
      monthlyBenefit: 2800,
      claimAge: 67,
      colaRate: 2,
    },

    assets: [
      { id: uid(), name: "401(k) / IRA", value: 120000, growthRate: 7, monthlyContribution: 1500 },
      { id: uid(), name: "Brokerage", value: 65000, growthRate: 7, monthlyContribution: 800 },
      { id: uid(), name: "Home equity", value: 110000, growthRate: 3.5, monthlyContribution: 0 },
      { id: uid(), name: "Cash / HYSA", value: 30000, growthRate: 4, monthlyContribution: 200 },
    ],

    grants: [
      { id: uid(), name: "RSU grant", totalValue: 160000, startYearOffset: 0, vestYears: 4, growthRate: 8 },
    ],
  };
}

export { uid };
