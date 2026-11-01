# AI Buddy

A personal AI companion that turns an older Windows (later Android) tablet into a dedicated Buddy device.
AI Buddy runs as a lightweight full-screen app on top of the existing operating system. It does not
replace Windows or change how Windows boots.

**Phase 1 status:** foundation complete. It includes the welcome screen, an animated 2D avatar, accounts
(registration, email verification, sign-in, password reset, persistent sessions), Buddy creation and
restoration, six personality presets, customisation with automatic cloud saving, launch at startup,
and full-screen controls. Conversations, voice input, camera, memory and 3D avatars are planned for
later phases.

## Repository layout

```
apps/desktop/          Tauri v2 + React + TypeScript desktop app
  src/avatar/          2D avatar renderer + renderer-agnostic AvatarController
  src/personality/     Personality system (identity / customisation / context layers)
  src/lib/             Supabase client, auth, Buddy repository, secure storage, desktop integration
  src/screens/         Welcome, sign-up, verify, sign-in, reset, create Buddy, home, customise, settings
  src-tauri/           Rust shell: DPAPI token storage, autostart, single instance, Wi-Fi shortcut
  tests/integration/   Real Supabase tests (auth, profiles, RLS, restore, password reset, deletion)
presets/               Versioned personality presets, avatars and voice profiles (JSON, source of truth)
supabase/              Config, migrations (schema + RLS + catalogue seed) and OTP email templates
services/api/          FastAPI service (token verification; home for Phase 2 server features)
scripts/               generate-catalogue-migration.mjs (presets JSON to SQL migration)
```

## Framework choice and hardware requirements

**Tauri v2** was chosen over Electron because it uses the system's WebView2 runtime instead of bundling
Chromium. That makes the installer about 5–10 MB (Electron is about 150 MB) and keeps idle memory to
roughly 30–80 MB, which matters on low-RAM tablets. Tauri v2 can also build Android apps from the same
React code.

| | Supported |
|---|---|
| Windows | Windows 10 (1803+) and Windows 11 |
| CPU | x64, ARM64, x86 (32-bit) |
| RAM | 2 GB minimum practical, 4 GB recommended |
| Rendering | WebView2 (the installer embeds the bootstrapper; it is preinstalled on current Windows 10/11) |

Windows 7/8/8.1 are **not** supported. WebView2 and current Electron both dropped them in 2023, so no
maintained web-based framework runs there. The avatar uses CSS-animated SVG with no WebGL or 3D, so it
runs on very weak GPUs, and it respects "reduce motion".

## Prerequisites

- Node.js 22+ and pnpm 9 (`corepack enable`)
- Rust (stable) and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS
- Docker + [Supabase CLI](https://supabase.com/docs/guides/cli) for local development
- Python 3.10+ (only for `services/api`)

## Running locally

```bash
pnpm install
supabase start                # local Postgres, Auth, Mailpit (emails at http://127.0.0.1:54324)
supabase db reset             # apply migrations
pnpm dev                      # desktop app (Tauri)
# or: pnpm dev:web            # same UI in a browser at http://localhost:1420
```

`apps/desktop/.env.development` already points at local Supabase with the CLI's public demo anon key.
Verification and password-reset codes appear in Mailpit.

## Connecting a Supabase cloud project

1. Create a project, then link it and push the migrations:
   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```
2. **Auth → Providers → Email:** enable "Confirm email". Set the minimum password length to 8 and
   require lower/upper case letters and digits.
3. **Auth → Email Templates:** paste `supabase/templates/confirmation.html`, `recovery.html` and
   `reauthentication.html` into the Confirm signup, Reset password and Reauthentication templates. The
   app uses 6-digit codes (`{{ .Token }}`) instead of links, so no deep-link handling is needed on tablets.
4. Configure custom SMTP for production (Supabase's built-in mailer is heavily rate limited).
5. Create `apps/desktop/.env.production.local` from `.env.example` with the project URL and the
   **anon/publishable** key. Never use the service-role key in the app.

## Building the Windows installer

On Windows:

```bash
pnpm build:windows
# -> apps/desktop/src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/AI Buddy_0.1.0_x64-setup.exe
```

From Linux (cross-compile, unsigned): install `nsis`, `lld`, `llvm` and `cargo install cargo-xwin`, then
`pnpm --filter ai-buddy-desktop tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc`.

CI (`.github/workflows/ci.yml`) builds the installer on `windows-latest` and uploads it as an artifact.
Set repository variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` so it targets your project.

The installer is per-user (no admin rights needed). "Launch AI Buddy when Windows starts" adds a standard
per-user startup entry. It does not change the Windows shell or boot configuration.

## Tests

```bash
pnpm typecheck
pnpm test                                     # unit: presets, personality layers, avatar controller, validation, welcome screen
SUPABASE_TEST_URL=http://127.0.0.1:54321 \
SUPABASE_TEST_ANON_KEY=<anon key from `supabase status`> \
pnpm test:integration                         # real Supabase: auth, verification, restore, RLS, reset, deletion
cd services/api && pip install -r requirements-dev.txt && pytest
```

## Design notes

- **Personality layers.** Presets (permanent identity) are immutable, versioned JSON stored in
  `personality_presets`. User customisation is stored separately in `buddy_personality_settings`, as
  differences from the preset only. Runtime context (time of day, mood shifts) is computed in
  `resolvePersonality()` and never persisted. Personality, avatar and voice are configured independently.
- **One Buddy per account.** `buddies.owner_id` is unique. Creating a Buddy when one exists returns the
  existing one, so restoring on another device never duplicates.
- **Security.** Credentials exist only in Supabase Auth. Every table has RLS, catalogue tables are
  read-only for clients, and ownership can't be transferred. Account deletion goes through a
  `security definer` RPC that cascades. Tokens on Windows are encrypted with DPAPI, tied to the Windows
  user. Sensitive actions (password change, deletion) re-check the current password.
- **Offline.** Avatars are local assets. The last-loaded Buddy is cached locally, and edits made offline
  are queued and synced when the connection returns.
- **Privacy.** No camera or microphone APIs are used. Voice preview uses the OS text-to-speech output only.
- **Updating presets.** Edit `presets/`, bump `version` for behavioural changes, then run
  `pnpm presets:sync` to regenerate the catalogue migration (a unit test fails if you forget).

## Known limitations (Phase 1)

- Installers are unsigned, so Windows SmartScreen will warn until a code-signing certificate is added.
- On non-Windows development machines, the auth token file is protected by file permissions only (no DPAPI).
- The Wi-Fi shortcut opens Windows Settings. There is no in-app network picker.
- Voice preview depends on the voices installed in Windows. Each voice profile is a pitch/rate
  preference rather than a dedicated voice.
- An account has exactly one Buddy (by design for Phase 1, enforced in the database).
- Avatars are 2D SVG. The `AvatarController` interface is ready for a future 3D renderer.
- A preset version that changes later is not auto-migrated for existing Buddies. They keep the version
  they selected.

## Recommended next steps (Phase 2)

1. Conversation service in `services/api`: a streaming LLM endpoint that builds the system prompt from
   `resolvePersonality()`, with rate limiting and moderation.
2. Push-to-talk voice: on-device or cloud speech recognition behind an explicit microphone permission,
   plus neural TTS voices mapped to voice profiles, with avatar lip-sync from TTS events.
3. Long-term memory with per-item user approval (`memories` table + RLS), and a memory review screen.
4. Kiosk polish: optional auto-start into full screen, an idle/attract mode, and a screen-dimming schedule.
5. Code signing + auto-update (Tauri updater) and crash reporting.
6. Android build from the same codebase (`tauri android`), reusing the backend and accounts.
