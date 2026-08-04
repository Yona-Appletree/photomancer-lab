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

## Decisions (2026-08-04)

1. Title: **"Providers: Dependency Injection for Test-Driven TypeScript"** (revised after first
   publish; names the mechanism up front while the description and lede keep the payoff).
   "Each test declares its world" remains the ring line inside the post, and "a provider is just
   a function" stays as the closing kicker. Slug is `2026-08-04-providers` with a Hugo alias
   redirecting the briefly-published `each-test-declares-its-world` URL.
2. Cold open: **compiled via hoisted `function` declarations** — the lede test is real and runs.
3. Domain pre-explanation before the cold open: none; trust the reader.
