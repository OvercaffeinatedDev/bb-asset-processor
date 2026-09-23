# Database Schema

## `lti_sessions` (`src/lib/db/schema/ltiSession.ts`)

| JS Field | DB Column | Type | Notes |
|---|---|---|---|
| `state` | `id` | UUID PK | JS name is "state" but DB column is named "id" |
| `deploymentId` | `deployment_id` | UUID NOT NULL | LTI deployment ID from login params |
| `nonce` | `email` | UUID NOT NULL | **Naming bug** — DB column named "email" but stores the nonce UUID |
| `sub` | `sub` | VARCHAR(255) | LTI subject claim (user identifier) |
| `aud` | `aud` | UUID | LTI audience (= our client_id / APP_KEY); used as `site` key for token lookup |
| `deepLinkingReturnURL` | `dl_return_url` | VARCHAR(2048) | Where to POST the deep linking response JWT |
| `deepLinkingData` | `dl_data` | VARCHAR(255) | Opaque `data` field from deep_linking_settings — **255 may be too short** |
| `oneTimeSessionToken` | `one_time_session_token` | VARCHAR(50) | Blackboard one-time token (stored but not used in any current logic) |
| `siteUrl` | `site_url` | VARCHAR(2048) | Platform URL from `tool_platform.url` claim |
| `jwtData` | `jwt_data` | JSONB | Full decoded JWT stored as `JSON.stringify(decodedJWT)` — a string inside JSONB, not a proper object |

## `auth_tokens` (`src/lib/db/schema/authTokens.ts`)

| JS Field | DB Column | Type | Notes |
|---|---|---|---|
| `id` | `id` | SERIAL PK | Auto-increment |
| `site` | `site` | VARCHAR(2048) NOT NULL | Platform identifier — currently set to `session.aud` (a UUID) |
| `token` | `token` | VARCHAR(2048) NOT NULL | OAuth2 access token from Blackboard |
| `expirationDate` | `expiration_date` | VARCHAR(50) NOT NULL | `(Date.now() + expires_in * 1000).toString()` — epoch ms as string |

**Expiry check:** `+token[0].expirationDate < +Date.now()` coerces both to numbers. Works, but brittle — a numeric/timestamp column would be safer.

## Migration

Active migration file: `src/lib/db/migrations/0000_strange_sally_floyd.sql`

Creates both tables from scratch. The previous file `0000_pretty_rocket_racer.sql` was deleted and replaced.

```bash
# Run migrations
pnpm db:migrate

# Full reset + migrate
pnpm db:recreate
```

Migration requires `DB_MIGRATING=true` in env. The `migrate.ts` script enforces this and sets `max: 1` on the DB connection during migration.

## Drizzle Config (`drizzle.config.ts`)

- Schema: `./src/lib/db/schema/index.ts`
- Dialect: PostgreSQL
- Output: `./src/lib/db/migrations`
- SSL: verify-full
