# Outline: the provider-system post

Working artifact for the structure of `content/post/2026-08-04-providers.post.ts`.
This describes the *architecture* of the piece; prose changes happen in the post itself.

## The story

**Thesis (one sentence):** You can have tests where every test declares its entire world inline —
type-checked, no mocking, no shared fixtures — and the price is about twenty lines of plain
TypeScript you own, not a framework you adopt.

The payoff is the tests. The provider pattern is the *price* of the payoff, and the story of the
post is showing how small the price is. The current draft tells it mechanism-first ("a provider is
just a function, and by the way tests get nice"). The restructure tells it payoff-first ("look at
this test; here is the twenty lines that make it possible").

**Reader:** A working product engineer with a TypeScript app — canonically a Next.js app — and no
DI. Competent, and skeptical of DI frameworks; that skepticism is *why* they have no DI. Their
felt pain is testing: either they avoid tests that need infrastructure, or they fight `vi.mock`.
They will skim before they read; the code blocks have to carry the argument on their own.

**The move:** Demo-first, then ring composition. Open with the finished artifact (the
three-argument `test()` with its world), spend the middle building every piece of it in front of
the reader, then return to the opening example once the reader can read it fluently. The post's
compiled-and-tested format is part of the story's credibility: the test at the top of the post ran
before the reader saw it.

## Beat sheet

1. **Cold open — the artifact.** The `test("...", Providers(...), (ctx) => ...)` example,
   nearly bare. Two sentences of setup at most ("Here is a test from a TypeScript app. Notice
   what it does not need."). Reader should hit code inside the first screen.
2. **Nut graf.** Name what is absent: `vi.mock`, `beforeEach`, containers, decorators. State the
   price: ~20 lines of plain TypeScript, shown in full by the end. Name the reader (app without
   DI). Promise: by the end you can read — and own — every line behind the opening example.
3. **Why you can't write this test today.** The module-singleton status quo and its four failure
   modes (import-time construction, scattered config, module interception, no second
   configuration per process). Reframed as the negative image of the cold open.
4. **The core idea.** A provider is just a function from context-so-far to more context.
   Config + logger, `ReturnType`, manual composition by object spread. React-context analogy
   for the Next.js reader.
5. **Chains.** The `Providers` helper by usage only (implementation deferred to the appendix):
   the four-link app chain, chains-are-providers-too.
6. **The compiler holds the wiring.** The `@ts-expect-error` trio: no missing deps, order
   enforced, wiring mistakes are compile errors at the call site.
7. **Assemble the opening test.** The ring closes. Recording fake that hands its inspection
   handle through context → parameterized fake as a function returning a provider → the custom
   `test()` implementation (drop-in two-arg form noted) → worlds compose (base chain extended
   per test) → a broken world fails to compile. End the beat by literally re-showing or
   re-reading the cold open: "you now know every line."
8. **Coda: where it grows.** Async providers, ambient context via `AsyncLocalStorage`, wrappers
   (transactions, fake timers), disposal. Link out to ts-provide.
9. **Next.js note.** Server side works today; browser is a composition pattern; be honest about
   the shim.
10. **Provenance + call to action.** Extracted from a production monorepo (hundreds of files,
    per-backend migration tests). Copy the code rather than install it.
11. **Appendix — the helper.** The full ~20-line `Providers` implementation and the closing
    kicker.

## Title question

The title should probably follow the thesis to the payoff:

- **"Each Test Declares Its World"** — payoff-first, matches the restructure. The current
  title's line ("a provider is just a function") stays as the post's closing kicker, which
  makes a nice ring: open on the payoff, close on the mechanism.
- "A Provider Is Just a Function" — mechanism-first, matches the current draft.

## Mechanical constraint on the cold open

Posts compile top-to-bottom, and `const` arrow functions do not hoist — so a compiled cold-open
test can only reference things declared later if *everything it touches is a hoisted `function`
declaration* (`Providers` and the custom `test` already are; the providers and fakes would need
to become `function provideConfig() {...}` style). Two options:

- **Compiled cold open via hoisted declarations** (preferred): keeps the "every example in this
  post compiles and runs" claim literally true for the lede, at the cost of switching provider
  definitions from `const` arrows to `function` declarations.
- Render-only `ts` mirror of the later compiled test: zero structural constraint, but the lede
  can silently drift from the real test, which is exactly what this blog format exists to
  prevent.

## Proposed revision (2026-08-04): the ambient-context section

**Gap:** Ambient context / `AsyncLocalStorage` — a load-bearing concept in the production system —
appears only as one paragraph inside the "Where it grows" coda, render-only. The post proves the
pattern for tests but never answers the reader's next question: *how does application code consume
the context without threading a `ctx` parameter through every layer?* And it never cashes two
checks it already wrote:

- Failure mode #4 in beat 3 ("no seam for two configurations per process") is resolved by ALS
  scoping, but the post never says so.
- "Tests stay independent and safe to parallelize" (beat 7 close) is asserted, not demonstrated.
  ALS is *why* many worlds can coexist in one process.

**Grounding (skybridge monorepo):**

- `provider-ctx.ts` — `providerCtx<T>()` proxy over a singleton `AsyncLocalStorage`;
  `runInContext` / `runWithExtraContext` entry points.
- `create-handle-app-context.ts` — the per-request story: app chain built once per process, then
  each request runs inside `runInContext({ ...ctx, authorization, logger: requestLogger, ... })`.
  Auth claim parsed from the session cookie becomes ambient; ~22 files consume it via
  `appAuthorization()` / `isLoggedIn()` with no parameter threading.
- `provider-test.ts` — the test harness wraps every body in `runWithProvider`, i.e. an ALS scope
  per test; ~210 test files use it. Test auth is just providers (`provideTenantAdminAuth`),
  mirroring the middleware.
- `README.test.ts` — house narrative: "React Context/Provider for server code, with
  AsyncLocalStorage instead of a component tree."

**Proposed new beat 7.5 — "Ambient context: one process, many worlds"** (between "Assembling the
opening test" and "Where it grows"):

1. The question: threading `ctx` through every call is honest but invasive; module singletons
   were the ergonomic thing being given up.
2. Compiled mini-implementation: `runWith(ctx, fn)` + `currentCtx()` over
   `node:async_hooks` `AsyncLocalStorage` in ~10 lines — real, compiled, asserted.
3. The request story (render-only sketch modeled on the real SvelteKit handle): boot chain once,
   per request extend with `authorization` + request-scoped logger; deep code calls
   `currentUser()`. React-context analogy completes: request scope shadows app scope like a
   nested provider.
4. Concurrency payoff as a *compiled* test: `Promise.all` two scopes with different worlds, each
   sees its own — the proof behind "safe to parallelize" and the fix for failure mode #4.
5. Default-parameter idiom (`ctx: AppContext = currentCtx()`) moves here from the coda.

"Where it grows" then slims to async providers, wrappers, disposal + ts-provide pointer; the
Next.js note reads stronger because ALS is now explained rather than name-dropped.

**Decisions (2026-08-04, approved):**

1. Placement: **new full section** between "Assembling the opening test" and "Where it grows".
2. Examples: **compiled** mini-ALS (`runWith`/`currentCtx` over `node:async_hooks`, ~10 lines)
   and a **compiled** concurrency test (`Promise.all` of two worlds, each sees its own).
3. Request-middleware sketch: **render-only code + prose**, modeled on the real SvelteKit handle
   (SvelteKit types will not compile inside the post).

## Decisions (2026-08-04)

1. Title: **"Providers: Dependency Injection for Test-Driven TypeScript"** (revised after first
   publish; names the mechanism up front while the description and lede keep the payoff).
   "Each test declares its world" remains the ring line inside the post, and "a provider is just
   a function" stays as the closing kicker. Slug is `2026-08-04-providers` with a Hugo alias
   redirecting the briefly-published `each-test-declares-its-world` URL.
2. Cold open: **compiled via hoisted `function` declarations** — the lede test is real and runs.
3. Domain pre-explanation before the cold open: none; trust the reader.
