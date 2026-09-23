# Project Overview

## Purpose

Implements the **1EdTech LTI Asset Processor specification** to integrate with Blackboard Learn Ultra. Handles the full LTI 1.3 OIDC launch flow, deep linking setup, EULA acceptance, and asset submission notices.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.6 (App Router), React 19 |
| Database | PostgreSQL via Drizzle ORM 0.45.1 + `postgres` driver |
| Auth | LTI 1.3 / OAuth2 JWT bearer, RS256 signed JWTs |
| UI | HeroUI + Tailwind CSS 4 + Framer Motion |
| Tunnel | Cloudflare Tunnel → localhost:3000 (dev) |
| Package manager | pnpm with workspace config |

## Key Entry Points

| Path | Purpose |
|------|---------|
| `src/app/(api)/lti/login/route.ts` | OIDC login initiation — creates session, redirects to Blackboard OIDC |
| `src/app/(api)/lti/launch/route.ts` | POST — receives `id_token` form-post from Blackboard after auth |
| `src/app/(api)/.well-known/jwks/route.ts` | Exposes our public JWK so Blackboard can verify our signed JWTs |
| `src/app/(ui)/lti/assetprocessor/config/page.tsx` | Deep linking config UI |
| `src/app/(ui)/lti/assetprocessor/config/actions.ts` | `enableConfig` server action — signs and POSTs deep linking response |
| `src/app/(ui)/lti/assetprocessor/eula/page.tsx` | EULA viewer UI |
| `src/app/(ui)/lti/assetprocessor/eula/eulaActions.ts` | `submitAcceptMessage` — posts EULA acceptance to Blackboard |
| `src/lib/utils/jwt.ts` | `validateJWT` (inbound) + `signJWT` (outbound) |
| `src/lib/utils/ltiAuth.ts` | OAuth2 token generation and DB caching |
| `src/lib/utils/consts.ts` | `LTIAUTHTYPES` constants (EULA, REPORT) |

## Environment Variables

```
# Database
DATABASE_URL        (postgres connection URL)
DATABASE_HOST
DATABASE_USER
DATABASE_PASSWORD
DATABASE_NAME
DATABASE_PORT       (default: 5432)

# LTI / App Identity
APP_KEY             (UUID — our client_id registered on Blackboard dev portal)
APP_DOMAIN          (URL — must match the registered redirect_uri on dev portal)

# JWT Signing
JWT_KEYID           (UUID — key ID used in JWK header)
JWT_PRIVKEY         (defined but unused — private key actually loaded from config/keys.json)

# Blackboard Dev Portal Endpoints
DEVPORTAL_OIDC_URL        (OIDC authorization endpoint)
DEVPORTAL_JWKS_URL        (JWK Set endpoint to verify Blackboard-signed JWTs)
DEVPORTAL_LTI_AUTH_URL    (OAuth2 token endpoint for LTI service calls)

# Runtime
NODE_ENV
DB_MIGRATING        (set to "true" only when running migrations)
```

## Private Key / JWKS

RSA key pair stored in `config/keys.json` with shape:
```json
{
  "privateKeys": { "keys": [ { ...JWK... } ] },
  "publicKeys":  { "keys": [ { ...JWK... } ] }
}
```

- `signJWT` loads `privateKeys.keys[0]` directly from this file
- `.well-known/jwks` route exposes `publicKeys` from this file
- `JWT_PRIVKEY` env var is **not used** despite being validated

## npm Scripts

```bash
pnpm dev          # docker compose up + next dev
pnpm build        # next build
pnpm db:migrate   # run drizzle migrations (needs DB_MIGRATING=true)
pnpm db:recreate  # drop + recreate schema + migrate
```
