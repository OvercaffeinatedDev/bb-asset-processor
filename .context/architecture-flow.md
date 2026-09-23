# Architecture & LTI Flow

## LTI 1.3 OIDC Launch Sequence

```
Blackboard Learn
      │
      │ GET /lti/login?iss=&login_hint=&target_link_uri=&lti_message_hint=&lti_deployment_id=&client_id=
      ▼
[login/route.ts]
  - Generate state (UUID) + nonce (UUID)
  - INSERT into lti_sessions (state, deploymentId, nonce)
  - 302 → DEVPORTAL_OIDC_URL?response_type=id_token&scope=openid&...
      │
      │ POST /lti/launch  (form body: id_token=<JWT>, state=<UUID>)
      ▼
[launch/route.ts]
  - Decode JWT header → fetch matching JWK from DEVPORTAL_JWKS_URL by kid
  - Verify JWT signature with jwk2pem
  - Read message_type claim → route:
```

## Message Type Routing

| `message_type` claim | Session update | Redirect |
|---|---|---|
| `LtiDeepLinkingRequest` (+ `accept_types` includes `ltiAssetProcessor`) | sub, aud, deepLinkingReturnURL, deepLinkingData, siteUrl, jwtData | `/config?state=&cmd=newConfig` |
| `LtiAssetProcessorSettingsRequest` | sub, aud, siteUrl, jwtData | `/config?state=&cmd=updateConfig` |
| `LtiEulaRequest` | sub, aud, siteUrl, jwtData | `/eula?state=&returnUrl=<encoded>` |
| `LtiSubmissionNotice` | (none) | Returns `{status:'ok'}` — **TODO: implement** |
| anything else | sub, aud, siteUrl, jwtData | `/reports?state=invalidJWT` |

All redirects use HTTP **303**.

## Config / Deep Linking Flow

```
/lti/assetprocessor/config?state=<UUID>&cmd=newConfig|updateConfig
      │
      │ (server component) SELECT from lti_sessions WHERE state=?
      │ Renders form with state hidden field
      │
      │ [User clicks "Enable"]
      ▼
[enableConfig server action]
  - SELECT session from lti_sessions WHERE state=?
  - Build LtiDeepLinkingResponse JWT payload:
      iss: APP_KEY
      aud: "https://blackboard.com"
      sub: APP_KEY
      iat / exp  (Unix seconds)
      deployment_id: session.deploymentId
      message_type: "LtiDeepLinkingResponse"
      version: "1.3.0"
      dl/claim/data: session.deepLinkingData   ← echo opaque data
      dl/claim/content_items: [{ type: "ltiAssetProcessor" }]
  - signJWT(payload) with config/keys.json privateKey, RS256
  - Form POST to session.deepLinkingReturnURL with field JWT=<signedJWT>
```

## EULA Flow

```
/lti/assetprocessor/eula?state=<UUID>&returnUrl=<encoded>
      │
      │ (server component) validates state + returnUrl
      │ Renders EulaViewer (client component)
      │
      │ [User clicks "Accept"]
      ▼
[submitAcceptMessage server action]
  - SELECT session from lti_sessions WHERE state=?
  - retrieveLTIToken(session.aud) → OAuth2 bearer token
  - POST {returnUrl}/user
      Content-Type: application/json
      Authorization: Bearer <token>
      Body: { userId: session.sub, accepted: true, timestamp: ISO8601 }
```

## OAuth2 Token Management (`ltiAuth.ts`)

```
retrieveLTIToken(site: string)
  └─ SELECT from auth_tokens WHERE site=?
      ├─ Not found → generateLTIToken(site)
      ├─ Found + expired → DELETE + generateLTIToken(site)
      └─ Found + valid → return token[0].token

generateLTIToken(site: string)
  └─ Build JWT assertion:
       iss/sub: APP_KEY
       aud: ["https://developer.blackboard.com/api/v1/gateway/oauth2/jwttoken"]
       exp: now + 300s
       jti: (should be unique UUID per call)
  └─ POST to DEVPORTAL_LTI_AUTH_URL
       grant_type: client_credentials
       client_assertion_type: urn:ietf:params:oauth:client-assertion-type:jwt-bearer
       scope: eula/deployment + eula/user + asset.readonly + report
  └─ INSERT into auth_tokens (site, token, expirationDate as ms timestamp string)
  └─ Return access_token string
```

## Session Data Lifecycle

Sessions are created at login (state + deploymentId + nonce only), then enriched at launch with the full JWT data. Sessions are **never deleted** — they accumulate. There is no session expiry mechanism.

## JWKS Endpoint

`GET /.well-known/jwks` → returns `config/keys.json` publicKeys verbatim. Used by Blackboard to verify JWTs we sign.
