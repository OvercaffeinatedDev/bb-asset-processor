# Known Bugs & Issues

Identified during initial code review on 2026-06-10.

---

## CRITICAL — Will Break Functionality

### 1. Missing `await` on `signJWT`

**File:** `src/app/(ui)/lti/assetprocessor/config/actions.ts:42`

`signJWT` is `async` but is called without `await`. The variable holds a `Promise`, not a string. Blackboard receives a stringified Promise object instead of a signed JWT.

```ts
// BUG
const signedJWT = signJWT(deepLinkingObject);

// FIX
const signedJWT = await signJWT(deepLinkingObject);
```

---

### 2. JWT `iat`/`exp` use milliseconds instead of seconds

**File:** `src/app/(ui)/lti/assetprocessor/config/actions.ts:26-27`

JWT spec requires Unix timestamps in **seconds**. `Date.now()` returns milliseconds, making the token appear to be created and expiring far in the future (~year 58000).

```ts
// BUG
iat: Date.now(),
exp: Date.now() + 5 * 60 * 1000,

// FIX — same pattern ltiAuth.ts already uses correctly
iat: Math.trunc(Date.now() / 1000),
exp: Math.trunc(Date.now() / 1000) + 300,
```

---

### 3. Wrong field for `lti-dl/claim/data` in deep linking response

**File:** `src/app/(ui)/lti/assetprocessor/config/actions.ts:33-34`

The `data` claim must echo back the **opaque data string from the original deep linking request** (`deep_linking_settings.data`). Instead, it sends `jwtData` which is the entire serialized JWT payload.

```ts
// BUG
'https://purl.imsglobal.org/spec/lti-dl/claim/data': savedSession[0].jwtData,

// FIX
'https://purl.imsglobal.org/spec/lti-dl/claim/data': savedSession[0].deepLinkingData,
```

---

### 4. Deep linking response uses wrong HTTP format

**File:** `src/app/(ui)/lti/assetprocessor/config/actions.ts:44-50`

LTI spec requires the deep linking response be a **form POST** with `Content-Type: application/x-www-form-urlencoded` and field name `JWT`. Currently sends JSON with field name `jwt`.

```ts
// BUG
await fetch(savedSession[0].deepLinkingReturnURL as string, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jwt: signedJWT }),
});

// FIX (using qs or URLSearchParams)
await fetch(savedSession[0].deepLinkingReturnURL as string, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ JWT: signedJWT as string }).toString(),
});
```

---

### 5. Empty array check never fires on JWK lookup failure

**File:** `src/lib/utils/jwt.ts:28`

`obtainKeyFromDevPortal` returns `Array.filter()` — always an array, always truthy. When the `kid` isn't found, `key` is `[]`, the check passes, and `jwk2pem(undefined)` throws an unhandled error instead of a clean message.

```ts
// BUG
if (!key) throw new Error(`No key found for the kid ${header.kid}`);

// FIX
if (!key || key.length === 0) throw new Error(`No key found for the kid ${header.kid}`);
```

---

## MODERATE — Incorrect Behavior

### 6. Typo in JWT expired error check

**File:** `src/lib/utils/jwt.ts:33`

```ts
// BUG — typo, this condition never matches
if (e.message === 'jtw expired')

// FIX
if (e.message === 'jwt expired')
```

---

### 7. Nonce never validated on launch

**File:** `src/app/(api)/lti/launch/route.ts`

The `nonce` is generated at login and stored in `lti_sessions`. The launch handler reads `state` from the form but never fetches the session to compare the stored nonce against the `nonce` claim in the JWT. This is required by LTI 1.3 spec to prevent replay attacks.

---

### 8. `retrieveLTIToken` returns inconsistent types

**File:** `src/lib/utils/ltiAuth.ts:63-81`

- When a cached token is found: returns the full **array** from `db.select()` (never accesses `token[0].token`)
- When a new token is generated: returns a **string**

`eulaActions.ts` passes the result directly into `Authorization: Bearer ${ltiToken}` — when an array is returned the header value is `Bearer [object Object]`.

```ts
// FIX: end of retrieveLTIToken, when token found and valid
return token[0].token;  // return the string, not the array
```

---

### 9. `generateLTIToken` accumulates duplicate rows per site

**File:** `src/lib/utils/ltiAuth.ts:54-58`

Always does `db.insert()` without checking for an existing unexpired row. Concurrent calls or a failed delete leave stale rows. The next `select()` returns whichever row comes first, which may be expired.

Fix: use an upsert on `site`, or wrap delete+insert in a transaction.

---

### 10. Hardcoded `jti` in LTI OAuth2 assertion

**File:** `src/lib/utils/ltiAuth.ts:17`

```ts
// BUG — jti must be unique per request
jti: 'eulatest',

// FIX
jti: uuidv4(),
```

---

## LOW — Code Quality / Minor

| # | File | Issue |
|---|------|-------|
| 11 | `eulaActions.ts:24` | `Content-Type: application/vnd.ims.lis.v2.lineitem+json` is a line-item type, not an EULA type. Likely should be `application/json`. Verify against 1EdTech EULA service spec. |
| 12 | `ltiSession.ts:10` | `dl_data` column is `VARCHAR(255)`. The opaque `data` field from Blackboard could be longer. Consider `length: 2048`. |
| 13 | `config/actions.ts` | `enableConfig` has no return value — calling UI cannot detect success or failure. |
| 14 | `launch/route.ts:23` | `LtiSubmissionNotice` handler is a TODO stub — just logs and returns 200. Core feature unimplemented. |
| 15 | `ltiSession.ts:4,6` | `state` JS field maps to DB column `id`; `nonce` field maps to DB column `email`. Confusing naming from an earlier schema iteration. |
| 16 | `env/server.ts:29` | `JWT_PRIVKEY` is validated as a required env var but is never read anywhere — private key is loaded from `config/keys.json` instead. |
