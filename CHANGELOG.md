# Changelog

All notable changes to this project are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning follows [Semantic Versioning](https://semver.org/) where practical.

## [Unreleased]

### Added

- Pagos de terreno: adjunto de comprobante (imagen/PDF) y descuento opcional
- Docker Compose para desarrollo local
- Credenciales API cifradas, sync Binance, reconciliación, FIRE y umbral 720/721
- Precios CoinGecko/Yahoo y FX USD/EUR en vivo (BOB paralelo sigue manual)
- Cuentas bancarias en patrimonio, backup JSON, PWA, TOTP opcional
- Sync: trades Binance, cliente IBKR Flex XML, Kraken, aceptar API como verdad
- Alerta de cuota de lote (14 días), FIRE editable, imprimir 720
- Modo noche (Ajustes)
- Project documentation set: Architecture, Agent handoff, Environment, Deployment, Contributing, Security

### Changed

- Patrimonio total incluye lo pagado en lotes al costo (el saldo pendiente sigue en comprometido)
- UI más fina: tipografía tabular, toggle de moneda, cards y distribución sin recorte
- Formulario de nueva transacción alineado al resto de la app (card, tipos en español)

## [0.1.0] — 2026-09-05

### Added

- Next.js App Router portfolio tracker (TypeScript end-to-end)
- Auth.js credentials (single-user) with server-action login
- Drizzle + LibSQL/SQLite schema (assets, transactions, land, FX, snapshots)
- Seed: BTC/ETH/SOL/USDC/VUAA, FX, Berchatti lots M-176-15 / M-176-16
- Dashboard KPIs, allocation chart, currency toggle (USD/EUR/BOB)
- Transactions CRUD
- Land detail tabs: Estado / Contrato / Pagos / Cronograma
- Manual monthly snapshots
- Settings: assets catalog + FX viewer
- Apple HIG–inspired mobile UI (app shell, grouped lists, blur tab bar)
- Defensive import layer: typed contracts, dedupe, Binance Spot parser + stubs (Auto-Invest, IBKR Flex)
- `vercel.json` for Vercel deployment
- Smoke script for Binance Spot parser

### Notes

- Default branch for handoff: `main`
- Remote: https://github.com/Renevc14/FinancesTracker
