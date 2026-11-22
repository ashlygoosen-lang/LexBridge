# Call My Lawyer — South African Legal Marketplace

A full-stack rebuild of the Figma Make "South African Legal Marketplace" export as a standalone
**React (Vite) frontend** and **Node/Express backend**. It runs as a single service: Express serves the
API under `/api` and the built React app for every other route.

## What's included

**Legal marketplace (Call My Lawyer)**
- Landing page, lawyer directory with filters, public practitioner profiles
- Post a matter (anonymised): 3-step modal, drafts survive sign-up
- Lawyer matter feed with match scores, filters, saved matters and availability toggle
- Lawyer offers with staged fee breakdowns. Clients compare offers side by side and accept one
- Checkout: consultation payment → book a time slot (no double-booking) → sign the electronic mandate (SHA-256 audit hash)
- Case workspace: live messages, secure document vault, lawyer updates, hearings and deadlines (.ics export), invoices, timeline, signed mandate
- Payments page with invoices, disputes and lawyer earnings
- Practitioner onboarding: LPC, practising certificate and Fidelity Fund details submitted for verification
- Admin: verification queue with per-credential checks, post moderation, payments and disputes, users and roles, identity reviews, justice case assignment, police station directory editing and import

**Police report & case tracker**
- 4-step police report with consent capture
- Append-only statement history: every amendment is a new numbered version with a SHA-256 fingerprint, re-verified on read. The database refuses edits and deletes (SQLite triggers)
- Record a SAPS CAS reference and investigating officer, court dates and status
- Evidence inventory with file fingerprints
- Open a digital justice intake from a report
- Western Cape SAPS directory: 151 stations from the Dept. of Police Oversight & Community Safety directory (Feb 2022)

**Digital justice workspace ("Justice Flow")**
- Role-based tools for client, SAPS, prosecutor, court clerk, magistrate/judge, lawyer and Legal Aid
- Official reference registration, immutable docket entries, prosecution decisions, court roll scheduling and status, sealed decisions, e-filing with clerk accept/reject/seal, secure participant messaging, Legal Aid screening queue, time records, detention and procedural deadlines
- Immutable audit trail and in-app notifications to every case participant
- SA ID validation (date and Luhn check). Only the last 4 digits are stored

**Reference directories** (static): superior courts with registrar contacts, and 1,800 Western Cape magisterial areas.

## Project layout

```
backend/    Express API, SQLite (better-sqlite3), uploads, seed data
frontend/   React 19 + React Router + Tailwind v4 (Figma export styles preserved)
railway.json, package.json (root build/start scripts)
```

## Run locally

```bash
npm run install:all
npm run dev:api        # API on http://localhost:4000 (seeds demo data on first run)
npm run dev:web        # Vite on http://localhost:5173 (proxies /api)
```

Or build and run as production:

```bash
npm run build && npm start   # http://localhost:4000
```

### Demo accounts
While `SEED_DEMO` is not `false`, an empty database is seeded with demo data. Every account uses the
password `Demo@2025!` (override with `DEMO_PASSWORD`). The login page has a "Demo accounts" picker.

| Email (`@demo.callmylawyer.co.za`) | Role |
|---|---|
| naledi | Client (open matter with 3 offers, active matter, police report, justice case) |
| sipho, anele | Clients |
| thabo, nomsa, leanne, karabo | Verified lawyers |
| lerato | Lawyer awaiting verification |
| admin | Platform admin |
| saps, prosecutor, clerk, magistrate, legalaid | Justice officials |

## Deploy on Railway (single service)

1. Push this folder to a GitHub repo and create a Railway service from it. `railway.json` sets the build (`npm run build`), start (`npm start`) and health check (`/api/health`).
2. **Add a volume** mounted at `/data` and set `DATA_DIR=/data`. Without a volume, the database and uploads are wiped on every redeploy.
3. Set the variables in `.env.example`, at minimum `NODE_ENV=production`, `JWT_SECRET`, `DATA_DIR`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `PUBLIC_URL`.
4. Before launch, set `SEED_DEMO=false` and start on a fresh volume, so no demo practitioners or accounts exist.

## Payments
Without PayFast credentials the platform runs in **test mode**: payments are marked paid immediately and
the UI says no money was charged. Set `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY` and
`PAYFAST_PASSPHRASE` (with `PAYFAST_SANDBOX=true` first) to redirect to PayFast. Payments are confirmed
by the signed ITN callback at `/api/payments/payfast/notify`. Card details never touch this server.

## Security notes
- Sessions: httpOnly, SameSite=Lax JWT cookie (secure in production). bcrypt password hashing. Rate-limited auth
- Same-origin check on all state-changing API calls. Helmet security headers and CSP
- Roles cannot be self-assigned: sign-up allows client or lawyer only. Officials are created by an admin
- Uploads: 15 MB limit, PDF/Word/image/text only, stored outside the web root, served only to authorised parties
- Lawyers see anonymised matters. Client contact details are revealed only after the mandate is signed

## Before going live
- Have a South African attorney review the Terms, Privacy (POPIA) notice and the mandate template (`mandateText` in `backend/src/routes/marketplace.js`).
- Police station commanders and numbers come from the Feb 2022 provincial directory. Refresh them from the admin "Police stations" tab when a newer directory is published.
- Email/SMS delivery isn't connected. Notifications are in-app.
