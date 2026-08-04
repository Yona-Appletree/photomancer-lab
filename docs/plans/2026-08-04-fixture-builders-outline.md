# Outline: the fixture-builders post

Working artifact for the structure of a post on fixture builders (the `Test*`
pattern from the SBS monorepo). Sequel to
[Providers](https://lab.photomancer.art/post/2026-08-04-providers/).
This describes the *architecture* of the piece; prose changes happen in the
post itself.

## The story

**Thesis (one sentence):** Once your tests run against fakes or a real
database instead of mocks, test data becomes your problem — and the answer is
typed fixture builders: one small factory per resource that creates real rows
through the app's own code paths, defaults everything the test doesn't care
about, and returns a live handle, so that a test's setup reads as its
specification.

The payoff is **the setup is the specification**: a four-row object graph in
four lines, where the only fields spelled out are the fields the test is
about. The price is one ~60-line builder per resource, all the same shape, no
framework. (Source note: "fixture builders are butter.")

**Reader:** The same engineer as the providers post, one step later. They
bought the argument — fakes and real infrastructure instead of `vi.mock` —
and immediately hit the consequence: mocks carried their data inside
themselves ("`findUser` returns this literal"); a fake store or a real
database starts *empty*. Their known options are fixture files (seed
JSON/SQL that rots, is untyped, and couples every test to one shared world)
or inline setup (every NOT NULL column and foreign key spelled out in every
test). They skim; the code blocks must carry the argument alone.

**The move:** Demo-first again, then ring composition — and this post's ring
closes around the *previous* post too: the cold open uses the three-argument
`test(name, world, fn)` from Providers, and the fixture-data world is just
another provider chain. Open with the finished test, spend the middle
building the two builders behind it, return to the opening once every line is
readable. Compiled format: every example runs against an in-memory fake store
before the page builds.

## Grounding (from the SBS monorepo, 2026-08-04)

- 18 builder modules / 19 `Test*` data builders, colocated with features.
- **1,179** `Test*.create()` call sites; **137** test files (of 454) use
  builders; **395** child-builder calls (`tenant.space()`, `space.post()`).
- Uniform shape: `Object.assign((id) => instanceHandle, { create, list })` —
  overrides as a single partial spread over defaults; `create()` returns
  `TestThing(id)`, a handle, not a row.
- Three FK strategies in priority order: explicit id override → parent
  builder method injects id (spread *after* overrides, so unoverridable) →
  auto-create the full ancestor chain (`TestUser.create()` with no args
  builds customer + tenant).
- `create()` goes through production ops (`CreateUserOp.runAsRoot`), so
  fixtures cannot produce states the app can't. "No test/prod divergence" is
  the stated philosophy (provider README.test.ts).
- Determinism: no faker anywhere; `testStr(prefix)` per-prefix counters
  (`user-username-0`, `-1`, …), backed by a custom ESLint rule banning
  `Date.now()`/`randomUUID` repo-wide.
- Handles hold only an id; `get()` re-reads the row, so assertions can't go
  stale. Instance factory is public so tests can adopt rows the app created
  (`TestSpaceMember(member.id).get()`).
- Fixture data composes with providers: `provideBasicTestData` is a chain
  link that returns builder *handles* in ctx; `provideTestTransaction` rolls
  back after each test, so builders need no cleanup.
- Same builders drive Storybook: stories use maximal, human-legible
  overrides; tests use minimal ones. Same factory serves both.

## Beat sheet

1. **Cold open — the artifact.** A compiled access-control-style test:
   ~four rows created in ~four lines via builders destructured from the
   world, overriding only the discriminating fields, then the assertion.
   Two sentences of setup at most. (Destructuring builders from ctx also
   sidesteps the hoisting constraint — see below.)
2. **Nut graf.** Name the moment: you took the mocks out, and now the store
   is empty. Mock data lived in the mock; fake and real stores have to be
   *fed*. Name the wrong answers (fixture files rot / untyped / shared
   world; inline inserts repeat every column). State the price: one small
   builder per resource, one uniform shape, shown in full. Link back to
   Providers as the prerequisite worldview.
3. **The status quo.** The two failure modes made concrete, briefly:
   a `fixtures/seed.json` excerpt (render-only `ts` block) plus the test
   that mysteriously depends on `users[3]`; then the inline-insert test
   where 12 lines of setup bury the one field that matters. The negative
   image of the cold open: setup that specifies *nothing*.
4. **The shape.** The two-sided factory: static `create()` (defaults, then
   `...overrides`, returns a handle) and the instance side (id + `get` +
   child methods). Full compiled source of `TestUser` (blog domain) — small
   enough to read whole.
5. **Defaults are declarations.** Every defaulted field is a field the test
   declares it does not care about; `testStr` counters make values unique,
   readable, and stable (no faker). "The setup is the specification" beat.
6. **Relationships.** The three FK strategies in priority order, each one
   line of code: explicit id → parent method injects (spread order makes it
   unoverridable) → `TestTask.create()` with no args builds the whole
   ancestor chain. This is the composability fixture files can't have.
7. **Handles, not rows.** `get()` re-reads from the store — assertions
   can't go stale; mutation helpers (`archive()`); adopting a row the app
   created (`TestTask(idFromApp).get()`), which is how builders assert on
   the system's own writes.
8. **Through the front door.** `create()` calls the same create-operation
   the app's routes call — fixtures can't construct impossible states, and
   schema changes break builders at compile time instead of rotting a JSON
   file. This is where "typesafe" pays off.
9. **Worlds and builders are the same substrate.** Ring to the providers
   post: the fixture world is a provider link; a base-data provider returns
   handles into ctx (`async ({ org, admin }) => ...`); a rollback wrapper
   means no cleanup anywhere. Re-show the cold open: every line now
   readable.
10. **Where it grows.** SBS numbers (19 builders, 1,179 call sites, 137
    test files); child-builder methods; bulk/scenario layers; the same
    builders feeding Storybook with maximal overrides; per-backend test
    runs reusing identical fixtures.
11. **Appendix — the machinery.** The post's fake store + the minimal
    `Providers`/`test` re-declared (or imported), and the closing kicker.

## Title and slug candidates

- **"Fixture Builders: Test Data for Test-Driven TypeScript"** — sibling
  naming to "Providers: Dependency Injection for Test-Driven TypeScript";
  names the mechanism, description carries the payoff.
- "The Setup Is the Specification" — payoff-first.
- "Fixture Builders Are Butter" — the source note's own phrase; playful,
  memorable, less searchable.

Slug: `2026-08-04-fixture-builders` (rename cheap until publish, expensive
after).

## Mechanical constraints

- Everything except the `src/ts-post` import renders in the post — there is
  no hidden helper code. The fake store and `Providers`/`test` machinery
  must either be (a) re-declared in this post's appendix (self-contained,
  ~60 duplicated lines, consistent with "own the code") or (b) imported
  from the providers post file (one visible import line, but re-registers
  that post's tests in this file's run).
- `const` doesn't hoist; the cold open can only reference later definitions
  that are `function` declarations. Destructuring builders from the world
  context solves most of it; `test` is already a hoisted function; the
  world itself needs to be a `function TestWorld()` declaration.
- Builders reach the store via the context they're bound to (a
  `provideBuilders` link returning `{ TestUser, TestOrg, ... }`), not via
  AsyncLocalStorage — simpler than SBS's ambient version; the difference is
  named honestly in beat 10.

## Open decisions

1. Title (recommend the sibling-style "Fixture Builders: Test Data for
   Test-Driven TypeScript").
2. Blog domain for the examples (recommend org → project → task: three
   levels deep so auto-parenting has something to do; self-explanatory
   names).
3. Appendix machinery: re-declare minimal `Providers`/`test` in this post
   vs. import from the providers post file (recommend re-declare; posts
   stay self-contained and the duplication is the point of "own the code").
4. Cold-open shape: access-style test with discriminating overrides
   (recommended) vs. four-rows-moved style vs. fixture-file contrast open.

## Decisions (2026-08-04)

1. Title: **"Fixture Builders: Test Data for Test-Driven TypeScript"** —
   sibling naming to the providers post. Slug `2026-08-04-fixture-builders`.
2. Domain: **org → project → task**, with a visibility rule on projects
   carrying the cold-open assertion.
3. Machinery: **re-declared in the appendix** (minimal `Providers`/`test` +
   fake store); posts stay self-contained.
4. Cold open: **discriminating-fields test** — ~4 rows in ~4 lines, only
   the fields the rule depends on spelled out.
