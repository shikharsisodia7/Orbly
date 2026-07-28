# Building Orbly with Claude Code: a case study

**Project:** [Orbly](https://orbly-drab.vercel.app) — an AI chat that reads your Instagram data
export locally in your browser and answers questions about your follower/following graph.
**Repo:** https://github.com/shikharsisodia7/Orbly
**Agent:** Claude Code (Sonnet 5)

This document is a retrospective on a single extended Claude Code session that took Orbly from a
reported data-correctness bug through a full product pivot to a polished, publicly-shipped
application. It's written as a case study of how the session actually went, not a transcript.

---

## The starting point

Orbly began as a conventional multi-page dashboard: separate routes for Followers, Following,
Mutuals, Doesn't-Follow-Back, an Unfollow Queue, and Snapshot history, all computing set operations
over a locally-parsed Instagram data export. The session opened with a bug report: after uploading
a real Instagram export, the app reported **Following: 1** instead of several thousand.

## Root-causing a parser bug from real data, not guesses

Rather than patch the symptom, the first move was to get the user's actual export ZIP and inspect
the raw JSON Meta had generated. That surfaced the real cause: Meta's current export format for
`following.json` omits the `value` field entirely and encodes the profile only as an `_u/`-prefixed
redirect link (`https://www.instagram.com/_u/username`) — a shape the existing parser had never
seen, since its regex assumed the classic direct-link format and captured the literal string `"_u"`
as the username for every single record. Every following entry was colliding into one fake account.

The fix was narrow and precise: teach the href parser to skip an optional `_u/` segment, and add
`title` as a fallback source (Meta reliably puts the real username there when `value` is absent).
A regression test was added using the *exact* shape observed in the real file, not a synthetic
guess, and the fix was verified against the original export before being called done — followers
and following counts matched what the export actually contained.

A related, subtler bug surfaced later the same way: Instagram replaces the username of a deleted or
deactivated account with a synthetic placeholder (`__deleted__<hash>`, `deleted<hash>`) instead of
dropping the record — these aren't real, clickable accounts, and profile links for them just
404'd. Found by grepping the real export for the pattern, fixed at the same normalization layer,
and covered by tests built from the two real placeholder shapes actually observed.

## A deliberate product pivot, not a feature bolt-on

Partway through, the user asked for something bigger: fold the AI chat feature (which had just been
added) into being the *entire* product, retiring the multi-page dashboard shell in favor of one
conversational surface. Rather than layering a chatbot on top of the existing app, this meant:

- Collapsing the app shell to a single full-screen chat route
- Moving the import flow (drag-and-drop, animated parsing-stage checklist, the "how do I get my
  export" walkthrough) *into* the conversation itself, so importing and asking questions happen in
  the same place
- Designing the chat's tool-calling architecture so the model only ever receives the specific fact
  a tool call asks for (a count, one page of usernames, a yes/no lookup) — never a bulk dump of the
  user's follower/following lists — by executing every tool **client-side** (`onToolCall`, no
  server `execute` function) against IndexedDB
- Being explicit, in the UI and in a rewritten Privacy page, about the one place data leaves the
  browser: the chat feature itself, which forwards only those minimal tool results to Claude via
  the Vercel AI Gateway

## Turning tool output into an actual interface

An early version of the chat let the model narrate every answer as text — accurate, but it read
like a generic chatbot rather than an application. The fix was architectural: a
`ToolResultCard` component renders each tool's result as its own small UI (animated stat tiles,
an avatar list with real profile links, a spring-in status card for a single-account lookup), and
the system prompt was updated to tell the model its results are already visualized — one short
line of commentary, not a repeated wall of text.

The most involved piece of this was the doesn't-follow-back list: marking a row as "unfollowed"
removes it and pulls in the next account from the full list, so working through the list feels
like one continuous queue. Building this correctly surfaced its own bug: the replacement item was
originally fetched with a numeric offset, but every "mark as unfollowed" shrinks the underlying
filtered list by one — a plain offset would silently drift and skip an account each time. The fix
replaced it with a cursor anchored to the last visible username (`after: <username>`), which stays
correct regardless of how many earlier items disappear, since it's anchored to content, not
position. Both the drift and the fix are captured in the test suite.

## Holding the line on scope

Several requests during the session asked for things the underlying data genuinely can't support:
filtering accounts by verification status or posting activity (not in the Instagram export at all),
and a "live," always-current view of a public Instagram account without re-importing (which would
require scraping Instagram — against its Terms of Service, and a direct contradiction of the app's
own local-first privacy design). Both were declined explicitly, with the reasoning stated plainly
to the user rather than quietly built as a best-effort approximation — the system prompt was
instead updated so the assistant itself gives that same honest answer rather than guessing.

## Shipping discipline

Every change in this session followed the same loop: implement, run the full test suite
(`vitest`), typecheck, lint, `next build`, then a live smoke test in a real browser against the
actual production deployment — including, where relevant, re-uploading the real Instagram export
end-to-end to confirm the corrected numbers, not just that the code compiled. Nothing was reported
finished on the strength of a green build alone.

Before the repository was made public, its entire git history was scanned for committed secrets or
`.env` files — confirmed clean — as a precondition, not an afterthought, to flipping visibility.

## Stack

Next.js App Router + TypeScript, the Vercel AI SDK with Claude via the Vercel AI Gateway using
client-side tool calls, Tailwind v4, Framer Motion, Dexie/IndexedDB, JSZip, Zod, and Vitest. Full
details in the [README](../README.md).
