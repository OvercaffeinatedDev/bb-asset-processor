# Patterns & Architecture Analysis

Reviewed: 2026-06-10

---

## The Core Problem: Where Does Logic Live?

The codebase has three places doing the same kinds of jobs, inconsistently:

| Layer | Current reality | Should be |
|---|---|---|
| `(api)` route handlers | Login + Launch only | All outbound HTTP to Blackboard, all data mutations |
| `(ui)` server actions | Calling external APIs + reading DB | Only reading DB to build UI, or triggering API routes |
| `(ui)` page components | Signing JWTs + querying DB directly | Rendering only — receive data as props |

---

## Issue 1: Duplicate Deep Linking Response Implementation

**The problem:** Two separate places build and send the `LtiDeepLinkingResponse` JWT, with diverging logic.

`config/page.tsx:17-58` — `generateJWTToken()` signs a JWT inline using `jwt.sign` directly, embeds it in a hidden form field, and lets the browser POST it. This is **correct** — the browser submits a form to Blackboard's `deep_link_return_url`.

`config/actions.ts:10-51` — `enableConfig()` does the same thing but server-side via `fetch`, with several bugs (no await on signJWT, wrong timestamps, wrong data field, wrong content-type).

**Recommendation:** Delete `config/actions.ts` entirely. The page's form approach is the right one per the LTI spec. `enableConfig` is dead code that will never work correctly.

The page implementation also avoids the bug surface of the server action: timestamps are correct, `deepLinkingData` (not `jwtData`) is used, and JWT signing is not async there (uses `jwt.sign` synchronously).

---

## Issue 2: JWT Signing Logic Is Duplicated and Split

**The problem:** `signJWT` in `jwt.ts` is an async wrapper around `jwt.sign`, but `config/page.tsx` bypasses it and calls `jwt.sign` directly. Two code paths for the same operation, each with their own imports of `pem-jwk` and `keys.json`.

```
jwt.ts          → async signJWT()           used in: config/actions.ts, ltiAuth.ts
config/page.tsx → inline jwt.sign()         used in: itself only
```

**Recommendation:** Make `signJWT` synchronous (since `jwt.sign` is not async) and use it everywhere. Or keep the async wrapper but ensure it's the single sign path.

```ts
// jwt.ts — synchronous is fine
export const signJWT = (payload: object): string | null => {
  const [privateKey] = keys.privateKeys.keys;
  try {
    return jwt.sign(payload, jwk2pem(privateKey), {
      keyid: env.JWT_KEYID,
      algorithm: 'RS256',
    });
  } catch (error) {
    console.error('Error signing JWT:', error);
    return null;
  }
};
```

---

## Issue 3: Server Actions Calling External Services

**The problem:** `eulaActions.ts:submitAcceptMessage` is a Next.js server action that POSTs directly to Blackboard's EULA endpoint. This mixes UI concerns (triggered by a button click) with external API calls.

Server actions are best suited for DB mutations and form submissions. Outbound HTTP calls to third-party services belong in `(api)` route handlers where you control the request lifecycle, can add retries, and keep secrets fully server-side.

**Recommendation:** Create `src/app/(api)/lti/eula/route.ts` as a POST handler. The client component calls your own API route; that route calls Blackboard.

```
EulaViewer (client) 
  → POST /lti/eula  (your API route)
    → POST {returnUrl}/user  (Blackboard)
```

This also decouples the EULA acceptance from the React rendering lifecycle, making it independently testable.

---

## Issue 4: Direct DB Queries in Page Components

**The problem:** `config/page.tsx` calls `db.select()` directly inside the page component function. Pages should receive data, not fetch it.

Every file imports `db` directly:
- `login/route.ts` — session insert
- `launch/route.ts` — session update
- `config/page.tsx` — session read
- `config/actions.ts` — session read
- `eulaActions.ts` — session read
- `ltiAuth.ts` — token read/write

**Recommendation:** Create a thin session service module that centralizes all DB access for sessions:

```
src/lib/services/
├── sessionService.ts    — getSession(state), createSession(...), updateSession(state, data)
└── tokenService.ts      — getToken(site), upsertToken(site, token, expiry)
```

Pages and routes import from services, not from `db` directly. This makes the DB schema a single-point concern and makes testing straightforward.

---

## Issue 5: No Guard on Session Array Access

**The problem:** Every DB select result is accessed as `result[0]` with no check. If `state` doesn't match any session row (expired, tampered, wrong env), the next line throws `TypeError: Cannot read properties of undefined`.

This affects: `config/page.tsx:21`, `config/actions.ts:17`, `eulaActions.ts:13`, `ltiAuth.ts:74`.

**Recommendation:** Add a guard in the session service, or at call sites:

```ts
const sessions = await db.select().from(ltiSessions).where(eq(ltiSessions.state, state));
if (sessions.length === 0) return redirect('/lti/assetprocessor/reports?error=sessionNotFound');
const session = sessions[0];
```

---

## Issue 6: postMessage Uses Wildcard Origin

**File:** `src/app/(ui)/lti/assetprocessor/eula/eulaViewer.tsx:16`

```ts
// Current — sends to any origin
(window.opener || window.parent).postMessage({ subject: 'lti.close' }, '*');
```

Sending `postMessage` to `'*'` means any page that opened this window can receive the message. The LTI platform origin should be passed down from the session's `siteUrl` and used as the target origin.

```ts
// Better — restrict to the known platform origin
(window.opener || window.parent).postMessage({ subject: 'lti.close' }, platformOrigin);
```

---

## Issue 7: Unused Imports and Dead Code

| File | Dead code |
|---|---|
| `reports/page.tsx:1` | `import { validateJWT } from '@/lib/utils/jwt'` — never used |
| `config/actions.ts` | Entire file is superseded by the page's form approach |
| `env/server.ts:29` | `JWT_PRIVKEY` validated but never read (key comes from `config/keys.json`) |
| `consts.ts` | `LTIAUTHTYPES` exported but nothing imports it |

---

## Issue 8: JWKS Route Uses Deep Relative Import

**File:** `src/app/(api)/.well-known/jwks/route.ts:3`

```ts
// Current — fragile relative path 5 levels up
import keys from '../../../../../config/keys.json';

// Better — use the path alias
import keys from '@/../config/keys.json';
```

---

## Issue 9: Missing Loading/Error States in EULA Client Component

`eulaViewer.tsx:19-24` — `acceptAndClose` is async but the button has no disabled/loading state. If the Blackboard call takes time or fails, the user sees nothing and may double-click.

**Recommendation:** Track a `pending` state with `useState`, disable both buttons while the request is in flight, and handle errors from `submitAcceptMessage`.

---

## Issue 10: Debug Console Logs in Production Paths

`console.log` with debug emoji left in production code:
- `ltiAuth.ts:50,53` — token generation logs
- `eulaActions.ts:17,33` — session and response logs
- `eula/page.tsx:29` — request state log
- `eulaViewer.tsx:28` — call state log

**Recommendation:** Remove or gate behind `NODE_ENV === 'development'`.

---

## Proposed Folder Structure

```
src/
├── app/
│   ├── (api)/
│   │   └── lti/
│   │       ├── login/route.ts        ← OIDC initiation (keep)
│   │       ├── launch/route.ts       ← JWT validation + routing (keep)
│   │       ├── eula/route.ts         ← NEW: POST accept to Blackboard
│   │       └── .well-known/jwks/route.ts
│   └── (ui)/
│       └── lti/assetprocessor/
│           ├── config/
│           │   └── page.tsx          ← keep form approach, remove actions.ts
│           └── eula/
│               ├── page.tsx
│               └── eulaViewer.tsx    ← calls /api/lti/eula instead of server action
├── lib/
│   ├── db/
│   ├── env/
│   ├── services/                     ← NEW
│   │   ├── sessionService.ts
│   │   └── tokenService.ts
│   ├── types/
│   └── utils/
│       ├── jwt.ts                    ← single sign/verify path
│       └── ltiAuth.ts
```

---

## Summary: Priority Order

| Priority | Change | Effort |
|---|---|---|
| High | Delete `config/actions.ts` (dead + buggy) | Trivial |
| High | Add `result[0]` guards everywhere | Low |
| High | Fix `postMessage` wildcard origin | Low |
| Medium | Extract `sessionService.ts` + `tokenService.ts` | Medium |
| Medium | Move EULA external call to `(api)/lti/eula/route.ts` | Medium |
| Medium | Remove debug console.logs | Trivial |
| Medium | Fix JWKS import path | Trivial |
| Low | Make `signJWT` synchronous, single implementation | Low |
| Low | Add loading/error states to EulaViewer | Low |
