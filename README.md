# Wealth Runway

A USA-focused **net-worth tracker, compensation modeler, and retirement runway
calculator**. Enter your assets, stock grants, total comp, and Social Security
estimate, and Wealth Runway projects your net worth year by year and shows how
long your money lasts in retirement.

> Planning estimate, **not financial advice**. All data stays in your browser
> (`localStorage`) — nothing is sent to a server.

## Features (v0.1)

- Net worth today + projected nest egg at retirement
- Editable assets/investments, each with its own growth rate and monthly
  contribution
- Stock grant / RSU modeling with vesting schedules
- Total comp with annual raises and savings rate
- Social Security income with claim age and COLA
- Inflation-adjusted retirement spending and a drawdown ("runway") projection
- Interactive net-worth chart

## Tech

- [Vite](https://vitejs.dev/) + [React](https://react.dev/)
- [Recharts](https://recharts.org/) for charting
- Hosted free on **Azure Static Web Apps**, deployed automatically on every push
  to `main` via GitHub Actions

## Develop locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
npm run preview  # preview the production build
```

## Deploy

Every push to `main` triggers
[`.github/workflows/azure-static-web-apps.yml`](.github/workflows/azure-static-web-apps.yml),
which builds the app and uploads `dist/` to Azure Static Web Apps. The
deployment token lives in the `AZURE_STATIC_WEB_APPS_API_TOKEN` GitHub Actions
secret.
