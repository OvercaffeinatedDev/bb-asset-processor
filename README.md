# Asset Processor for Blackboard Learn

A Next.js implementation of the [1EdTech LTI 1.3 Asset Processor](https://www.imsglobal.org/spec/lti-ap/v1p0) specification, built to integrate a similarity/originality-checking tool with **Blackboard Learn (Ultra)**. It implements the full LTI 1.3 OIDC launch flow, deep linking setup, per-assignment settings, EULA acceptance, asset submission processing, and an instructor-facing report viewer.

> **Status:** proof of concept / integration test tool. Several pieces are placeholders by design — see [Known limitations](#known-limitations) below.

## What it does

When an instructor adds this tool to a Blackboard course as an Asset Processor, and a student submits a file to an assignment it's attached to, this app:

1. Downloads the submitted asset from Blackboard using an LTI Advantage access token.
2. Stores it locally (`./fileDownloads`) and records it in Postgres.
3. Assigns it a similarity score (currently a **random placeholder** — see below) and posts an originality report back to Blackboard so it shows up in the gradebook.
4. Lets an instructor browse all submissions for a course and drill into an individual report (document preview + score) from inside Blackboard.

It also handles the surrounding LTI plumbing: OIDC login, deep-linking setup (adding the tool to an assignment), the per-assignment settings screen, and the student EULA flow.

## How it works

Every LTI request — the initial login redirect aside — lands on a single endpoint, `POST /lti/launch`, and is routed by the `message_type` claim in the signed launch JWT:

| `message_type` | What happens | UI it lands on |
|---|---|---|
| `LtiDeepLinkingRequest` | Instructor is adding the tool to an assignment for the first time | `/lti/assetprocessor/config` |
| `LtiAssetProcessorSettingsRequest` | Instructor is editing settings on an already-configured assignment | `/lti/assetprocessor/updateConfig` |
| `LtiEulaRequest` | Student needs to accept the tool's terms before submitting | `/lti/assetprocessor/eula` |
| `LtiSubmissionNotice` | **Server-to-server**, fired when a student submits — no browser involved | Downloads the asset, scores it, saves it, reports the score back to Blackboard |
| `LtiReportReviewRequest` | A specific report is opened from within Blackboard (e.g. from the gradebook) | `/lti/assetprocessor/reports/[id]` |
| `LtiResourceLinkRequest` + custom `reportManager: "true"` | The teacher-facing "Report Manager" placement is opened | `/lti/assetprocessor/reports` (list, scoped to that course) |

The flow for anything browser-driven is: Blackboard redirects to `GET /lti/login` (OIDC third-party login init) → we generate a `state`/`nonce` pair and store a session row → redirect to Blackboard's authorization endpoint → Blackboard redirects back to `POST /lti/launch` with a signed `id_token` → we verify it, look up the session by `state`, check the `nonce` matches, and route by `message_type` as above.

```
Blackboard                          This app
    │  GET /lti/login (iss, login_hint, …)
    ├────────────────────────────────────▶  create session (state, nonce)
    │                                        redirect to Blackboard OIDC endpoint
    │◀────────────────────────────────────
    │  (user authenticates on Blackboard)
    │  POST /lti/launch (id_token, state)
    ├────────────────────────────────────▶  verify JWT, check state + nonce
    │                                        route by message_type
    │◀────────────────────────────────────  redirect to the right UI page
```

## Project structure

```
src/
  app/
    (api)/lti/
      login/route.ts          OIDC login initiation
      launch/route.ts         the single endpoint everything above routes through
      eula/route.ts           EULA acceptance → POSTed to Blackboard
      reports/[id]/file/route.ts   streams a downloaded asset back out (PDF/image preview)
      .well-known/jwks/route.ts    this tool's public signing key
    (ui)/
      lti/assetprocessor/
        config/                deep-linking setup screen
        updateConfig/          per-assignment settings screen
        eula/                  student EULA (multi-step)
        reports/               instructor report list + report detail (reports/[id])
      admin/eula/              internal tool to revoke a student's EULA consent
  lib/
    db/schema/                 Drizzle schema (lti_sessions, auth_tokens, asset_submissions)
    db/migrations/             generated SQL migrations
    services/                  DB access (session, token, asset submission lookups)
    utils/
      jwt.ts                   sign/verify LTI JWTs (RS256)
      ltiAuth.ts                client-credentials token exchange + caching
      assetReport.ts           builds + sends the originality-report payload
      consts.ts
    types/appTypes.d.ts        LTI claim shapes used across the app
config/keys.json               RS256 keypair used to sign/verify LTI JWTs (test keys)
```

## Known limitations

This is a test/integration tool, not a real plagiarism detector — some things are intentionally stubbed:

- **Similarity scores are random** (`Math.random() * 100`), assigned when an asset finishes downloading. There's no actual content analysis.
- **Report status** (Under Review / Posted) is also assigned randomly on save — nothing currently transitions a report from one to the other.
- The **config/settings panels'** individual fields (display name, thresholds, notification toggles, etc.) are interactive in the UI but **not persisted anywhere** — there's no table backing them yet. "Save" on the initial config screen only completes the LTI deep-linking handshake (what actually registers the tool on the assignment).
- `config/keys.json` contains a **test RS256 keypair** committed to this repo for local development. Do not reuse it, and don't treat it as safe for anything beyond local testing.

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/)
- Docker (for the bundled local Postgres), or your own Postgres instance
- A registered LTI 1.3 tool on a Blackboard Learn developer/test instance (needed to actually exercise the LTI flows — the app runs without one, but nothing will launch into it)
- A way to expose `localhost` to the internet for Blackboard to reach it — a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) or `ngrok` both work. (`cftunnel/` is gitignored — if you use `cloudflared`, put your own tunnel config there.)

## Local setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Start Postgres**

   ```bash
   docker compose up -d
   ```

   This starts a local Postgres on `127.0.0.1:9100` (see `docker-compose.yml`).

3. **Configure environment variables**

   Copy the sample and fill in real values:

   ```bash
   cp .env.sample .env
   ```

   | Variable | Purpose |
   |---|---|
   | `DATABASE_HOST` / `DATABASE_USER` / `DATABASE_PASSWORD` / `DATABASE_NAME` / `DATABASE_PORT` | Postgres connection — match `docker-compose.yml` for local dev |
   | `DATABASE_URL` | Full connection string, built from the above |
   | `APP_KEY` | A UUID this tool uses as its own `iss`/`sub` when signing JWTs (e.g. for LTI Advantage service calls) |
   | `APP_DOMAIN` | The public URL Blackboard can reach this app at (your tunnel URL in dev) |
   | `JWT_KEYID` | Must match the `kid` of the keypair in `config/keys.json` |
   | `DEVPORTAL_OIDC_URL` | Blackboard's OIDC authorization endpoint |
   | `DEVPORTAL_JWKS_URL` | Blackboard's JWKS endpoint (used to verify incoming launch JWTs) |
   | `DEVPORTAL_LTI_AUTH_URL` | Blackboard's OAuth2 token endpoint (client-credentials grant for LTI Advantage services) |

4. **Run database migrations**

   ```bash
   pnpm db:migrate
   ```

   (`pnpm db:recreate` wipes the local DB and regenerates migrations from scratch — only for local dev, never point it at anything real.)

5. **Expose your local server and register the tool**

   Start a tunnel (e.g. `cloudflared tunnel run` using the config under `cftunnel/`, or `ngrok http 3000`) so `APP_DOMAIN` is actually reachable, then register this tool on your Blackboard developer/test instance with:
   - Login initiation URL: `<APP_DOMAIN>/lti/login`
   - Launch/redirect URL: `<APP_DOMAIN>/lti/launch`
   - JWKS URL: `<APP_DOMAIN>/.well-known/jwks`

6. **Run the dev server**

   ```bash
   pnpm dev
   ```

   The app runs on `http://localhost:3000`. LTI launches need to come from Blackboard through your tunnel; visiting the app directly in a browser will mostly show "session not found" style errors, since every UI page expects a `state` from a real launch (`/admin/eula` is the exception — see below).

## Admin tools

`/admin/eula` — outside the LTI launch flow, reachable directly. Lets you revoke a student's EULA acceptance on Blackboard's side (`DELETE` to Blackboard's EULA endpoint) for any deployment this app has seen a launch from — either for one student or for everyone under that deployment. **Unauthenticated** — don't expose it publicly.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run a production build |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier, writes to `src/` |
| `pnpm db:migrate` | Apply pending Drizzle migrations |
| `pnpm db:recreate` | **Destructive** — drops the local DB, regenerates migrations from the schema, and re-applies them |
