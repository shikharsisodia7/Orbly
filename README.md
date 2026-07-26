# Orbly

Understand your Instagram circle — who follows you, who doesn't follow back, and who quietly
disappeared between two exports. Everything is analyzed locally, in your browser.

## What it does

Orbly reads an official Instagram "Followers and Following" export (ZIP, JSON or legacy HTML
format) and computes:

- **Mutuals** — accounts that follow you and that you follow back
- **Doesn't follow you back** — accounts you follow that don't follow you
- **You don't follow back** — accounts that follow you that you don't follow
- **Snapshot comparisons** — new followers, lost followers, and who you started/stopped following
  between two imports over time
- A manual **Unfollow Queue** that opens Instagram profiles for you to review — Orbly never
  performs the unfollow action itself

## Local-first privacy architecture

This is the core design constraint of the app, not a feature bullet point:

```
Instagram export (ZIP)
        │
        ▼
  browser File API
        │
        ▼
     JSZip (in-memory, client-side)
        │
        ▼
  src/lib/instagram parser
        │
        ▼
  src/lib/instagram comparisons
        │
        ▼
     IndexedDB (Dexie)
```

There is no `/api/upload` or `/api/analyze` route. The export file is never sent to a server —
parsing, hashing, and every relationship calculation happen in the browser with plain JavaScript.
Persistence is local IndexedDB via Dexie. The only thing that could reasonably be called a
"backend" is static asset hosting.

## Technology

- Next.js App Router + TypeScript, React 19
- Tailwind CSS v4 (CSS-based theme in `src/app/globals.css`)
- Framer Motion for animation
- Dexie + `dexie-react-hooks` for IndexedDB persistence and reactive queries
- JSZip for in-browser ZIP parsing
- Zod for backup-file validation
- Recharts for the follower history chart
- Vitest + Testing Library for unit tests

No Supabase, Firebase, external database, auth provider, or paid API is used anywhere.

## Development setup

```bash
npm install
npm run dev
```

Open http://localhost:3000. If port 3000 is occupied, Next.js will pick the next free port and
print it in the terminal.

## Production build

```bash
npm run build
npm run start
```

## Testing

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest run
```

Unit tests cover username normalization, relationship set math (mutuals / non-followers),
snapshot-to-snapshot change detection, canonical dataset hashing, and full ZIP parsing against
synthetic fixtures in `tests/fixtures/instagram-export/` — including multiple followers files,
nested directory layouts, decoy files that must never be misclassified (close friends, blocked
accounts, follow requests, recently-unfollowed lists), missing timestamps, and href-derived
usernames.

## Instagram export parsing

Code lives in `src/lib/instagram/`:

- `types.ts` — shared types (`Relationship`, `ParsedExport`, diagnostics)
- `normalize.ts` — username normalization (`@Alex ` → `alex`) and validation
- `detect-files.ts` — classifies each file in the archive as followers / following / ignored,
  using filename patterns first and JSON shape as a secondary signal; explicitly excludes
  close friends, blocked accounts, follow requests, and recently-unfollowed lists even though
  their filenames contain "follow"
- `html-extract.ts` — a regex-based extractor for Meta's legacy HTML export format (still
  produced for some accounts/regions); the JSON parser and this one feed the same pipeline
- `parser.ts` — opens the ZIP with JSZip, walks every file, classifies it, and recursively
  extracts relationship records regardless of how Meta nests `string_list_data`
- `comparisons.ts` — pure set operations: current relationships (mutuals / one-way) and
  snapshot-to-snapshot changes (new/lost followers, started/stopped following)
- `hash.ts` — canonical SHA-256 hash of the sorted follower/following username lists, used to
  detect duplicate imports regardless of the underlying ZIP's binary contents

The parser never fabricates precision it doesn't have: a lost follower is only ever described as
"detected between snapshot A and snapshot B," never as an exact timestamped event.

## IndexedDB structure

Database name: `orbly-local` (see `src/lib/db/schema.ts` and `index.ts`).

| Table | Purpose |
|---|---|
| `snapshots` | One row per import: counts, dataset hash, label, timestamps |
| `snapshotFollowers` | Follower rows for a given snapshot (`snapshotId` indexed) |
| `snapshotFollowing` | Following rows for a given snapshot |
| `queueItems` | Manual unfollow queue: username, source, status |
| `settings` | Single-row app settings (onboarding state, motion preference) |

## Snapshot comparison logic

Given followers/following sets `F` and `G` for the current snapshot:

- Mutuals = `F ∩ G`
- Doesn't follow you back = `G - F`
- You don't follow back = `F - G`

Given two snapshots in time:

- New followers = `currentFollowers - previousFollowers`
- Lost followers = `previousFollowers - currentFollowers`
- Started following = `currentFollowing - previousFollowing`
- Stopped following = `previousFollowing - currentFollowing`

The Recent Unfollowers page (`src/hooks/useLostFollowerEvents.ts`) walks every consecutive pair of
snapshots — not just the two most recent — so "All history" filtering reflects the full timeline.

## Backup system

`src/lib/backup/` defines a Zod schema for a full local backup (all snapshots, relationship rows,
queue items, and settings) and exposes `buildBackup`/`downloadBackup` and
`parseBackupFile`/`restoreBackup`. Restoring validates the file against the schema before writing
anything — a malformed or unrelated JSON file is rejected with a clear error rather than partially
imported.

## Deploying on Vercel

This app has no server-side state to worry about — every route is statically generated
(`npm run build` prerenders all pages) and all persistence is client-side IndexedDB, so there's
nothing Vercel-specific to configure beyond a standard Next.js deployment.

```bash
npx vercel        # preview deployment
npx vercel --prod # production deployment
```

## Known limitations

- Orbly can only see what's in the exports you upload — it cannot retroactively know about
  followers who came and went before your first snapshot.
- Change detection knows the *interval* between two snapshots, never the exact moment a change
  happened.
- IndexedDB is per-browser, per-device storage. Clearing site data removes it; use the backup
  export in Settings before doing so.
- Very large exports (tens of thousands of accounts) are parsed in a single pass on the main
  thread. The parser is structured to make a Web Worker migration straightforward
  (`parseInstagramExport` takes a file and returns a promise with no DOM dependencies), but that
  migration hasn't been done yet.
