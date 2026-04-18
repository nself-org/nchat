# nChat Bundle

The **nChat bundle** is the pro plugin bundle that activates the full chat feature surface on a self-hosted nSelf backend. It is included in the **Basic** membership tier ($0.99/mo or $9.99/yr) and in every higher tier.

## What the bundle includes

| Plugin | Role |
|--------|------|
| `chat` | Core message store hooks, retention policy, archiving |
| `livekit` | WebRTC voice + video calls |
| `recording` | Call + screen-share recording egress |
| `moderation` | Automated content filtering, manual review queue |
| `bots` | Programmable bots + slash command framework |
| `realtime` | Presence, typing indicators, live cursors over WS |
| `auth` | SSO, LDAP, SAML, MFA enforcement (pro auth extension) |

## Installing the bundle

```bash
cd nchat/backend

# 1. Set your membership key (obtain at https://nself.org/pricing)
nself license set nself_pro_xxxxx...

# 2. Install all 7 plugins in one call
nself plugin install chat livekit recording moderation bots realtime auth

# 3. Rebuild and start the stack
nself build && nself start
```

After `nself build`, `docker-compose.yml` regenerates to include the bundle containers and the matching `NEXT_PUBLIC_*` env vars propagate to the frontend.

## Frontend feature detection

The frontend never assumes a bundle plugin is available. It checks public env vars at runtime and hides the corresponding UI surface if the env var is absent or empty:

| Plugin | Env var | Feature |
|--------|---------|---------|
| livekit | `NEXT_PUBLIC_LIVEKIT_URL` | Voice / video call buttons |
| recording | `NEXT_PUBLIC_RECORDING_ENABLED` | Record call button |
| moderation | `NEXT_PUBLIC_MODERATION_ENABLED` | Auto-filter, review queue |
| bots | `NEXT_PUBLIC_BOTS_ENABLED` | Bot accounts, slash commands |
| realtime | `NEXT_PUBLIC_REALTIME_URL` | Presence, typing indicators |
| auth | `NEXT_PUBLIC_AUTH_SSO_ENABLED` | SSO login flow |
| chat | `NEXT_PUBLIC_CHAT_ENABLED` | Core chat hooks |

Use `@/lib/features/bundle-detect` to query bundle state in React:

```tsx
import { nchatBundle, isFullBundleInstalled, missingPlugins } from '@/lib/features'

if (nchatBundle.livekit) {
  // Show video call button
}

if (!isFullBundleInstalled()) {
  console.info('Missing plugins:', missingPlugins())
}
```

## Env var reference

The canonical env-var reference lives in `nchat/backend/.env.example` under the **nChat Bundle** section. It documents every variable each plugin contributes. Copy the variables you need into `.env` (or set them via `nself env`) rather than editing `.env.example`.

## Without a license

Without a license key, the `chat` core runs on the 25 free plugins (auth, storage, search, mail, etc.) and the app degrades gracefully:

- Call buttons hide
- Moderation review queue hides
- Bot management UI hides
- SSO settings redirect to built-in email auth

No hard crashes. Set `NSELF_PLUGIN_LICENSE_KEY` to a valid key and rerun `nself build && nself start` to unlock the bundle at any time.

## Related docs

- `nchat/backend/.env.example` — nChat Bundle section with every env var
- `chat/frontend/src/lib/features/bundle-detect.ts` — runtime detection helpers
- https://nself.org/pricing — Basic, Pro, Elite, Business, and Enterprise tiers
- https://docs.nself.org/plugins — plugin registry and install guide
