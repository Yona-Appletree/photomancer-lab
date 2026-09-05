# Outline: the world-building post

Working artifact for the structure of the third post in the testing
trilogy, after
[Providers](https://lab.photomancer.art/post/2026-08-04-providers/) and
[Fixture Builders](https://lab.photomancer.art/post/2026-08-04-fixture-builders/).
This describes the *architecture* of the piece; prose changes happen in
the post itself.

## The story

**Thesis (one sentence):** A test's world is not just services and data
— it includes *who is acting* — so declare a low-privilege actor in the
world and give builders a system principal that tests cannot reach, and
authorization stops being a test category you have to remember and
becomes a property every test exercises for free.

The payoff is **authz testing for free**: every ordinary behavior test
runs its calls through the real authorize path as a realistic,
minimally-privileged actor, so a permission regression fails tests that
were never "about" permissions. The price is one provider (`ActingAs`),
one helper on handles (`withAuth`), and one invariant about who builders
run as — maybe thirty lines.

**The invariant (the post's core):** there is no "auth off" flag
anywhere. There is a *system principal*, and the only place it ever
appears is inside a builder's own scope — builders shadow to system for
the duration of their work, then the test's actor is back. Tests have no
expression whose value is the system principal; builders never inherit
the test's actor. Neither side can accidentally hold the other's
privileges.

**Reader:** an engineer who already won the fakes-over-mocks argument
and already has fixture builders (or "fakes that know how to create a
thing"). Their suite runs every test as a user with global permissions
unless the test says otherwise — it works, authz has its own dedicated
test files, and they have never had a reason to question the default.
Modeled directly on a real conversation (see Grounding). They skim; the
code blocks must carry the argument alone.

**The move:** Demo-first cold open, consistent with both siblings —
then the *conversation* is the nut graf's framing device: a friend's
"our tests all run as a user who has global perms unless the test
specifies a different subject" against "run with minimal permissions by
default so you get auth testing for free — it's part of the world."
Ring composition closes around the whole trilogy: the cold open's chain
is the providers post's `test(name, world, fn)`, its rows come from the
fixture post's `testData`, and the one new element — the actor — is
this post's subject. The close names the trilogy: environment, data,
actor; the world is all three.

## Grounding

**The conversation (2026-08, chat with a friend doing PR review at a
storage-infrastructure company).** Beats the post must answer:

1. "You build the fixtures via your production code path, yeah?" — and
   the honest answer given: "you can, but it doesn't really matter so
   long as they're set up right. whatever you do you want auth
   disabled… I cheated where the prod path was awkward."
2. "We already have fakes that know how to create a thing so why not
   use them" — yes: the invariant is *scoping and reachable states*,
   not prod-path purism.
3. "Our tests all run as a user who has global perms, unless the test
   specifies a different subject" vs. "my instinct is run the test with
   minimal (or explicit) permissions by default so you get auth testing
   for free, its part of the world" — the thesis, stated by contrast
   between two experienced people.

**The production monorepo (SBS, surveyed 2026-08-24).** The
design-in-public material — the codebase behind the first two posts
implements the doctrine only in embryo:

- Every AppOp validates → **authorizes** → executes → validates output;
  principals are a typed union (`Anonymous | Root | User | Client`);
  ops with no ambient auth run as *anonymous* (fail closed).
- Builders create through real ops as root: `CreateUserOp.runAsRoot`.
  So the two-scopes rule half-exists: builders do run as system.
- But the canonical test chain ends in `provideTenantAdminAuth` — the
  ambient default is **admin**, the friend's model, not the doctrine.
- And **57 of 322 test files call `runAsRoot` directly in test
  bodies** — the system principal leaked out of the builder scope,
  because there is no per-call actor-switch idiom, so tests that need
  a second actor reach for root instead. The erosion is the argument:
  a convention without an idiom (or a lint rule) decays even in the
  codebase of the person who invented it.
- `runAsRoot` is documented "use this for testing" but is also called
  inside production ops (`UpdateTenantOp` → `DeleteOriginOp.runAsRoot`)
  — the test escape hatch and the internal-privilege-escalation
  mechanism share a name. Naming them apart is part of the fix.

**The lightplayer suite (lp2025, `lpa-cloud-client/tests/README.md`,
Rust).** The pattern's second life, and where the "world" name comes
from: `TestWorld::new()`, and its *nouns include actors* — `td.user()`
(signed in), `td.visitor()` (followed a link without signing in),
`td.invitee()` (an email with no account behind it yet). "No scenario
can assert about a state the application could not reach." Determinism
by counters; refusals have their own verbs so scenarios never unwrap.

**Prior art.** Cucumber's per-scenario context object has been named
`World` since 2008 (actors were never in it — it's a bag; the name
survived, the idea here is what belongs in the bag). Postgres RLS:
seed as a `BYPASSRLS` role, test as the constrained role. Firebase:
admin SDK seeds the emulator, client SDK exercises the rules. The
factory_bot lineage dodges the question by writing raw rows — the
two-scopes rule is what builders need once they refuse to bypass the
app.

## Beat sheet

1. **Cold open — the artifact.** Compiled test on the task-tracker
   domain from the fixture post, now with an authorize step. Chain:
   `Providers(TestWorld, provideBaseData, ActingAs(({ member }) => member))`.
   Body: `projectApi.get(project.id)` succeeds as the ambient member;
   `outsider.withAuth(() => projectApi.get(project.id))` is refused.
   No auth ceremony beyond the chain line and the one `withAuth`. Two
   sentences of preamble at most.
2. **Nut graf — the conversation.** The friend's global-perms default
   vs. minimal-by-default, quoted/paraphrased per the decision below.
   Name the trilogy's arc: the providers post declared the
   environment, the fixture post declared the data, and both posts
   quietly ignored the third axis every request in production has —
   *who is asking*. World = environment + data + actor.
3. **The global-perms default, examined.** Its two failure modes:
   authorization is only tested where someone remembered to write a
   dedicated authz test (permission regressions pass everything else);
   and the naive fix — sprinkling explicit auth setup into every test
   — is the inline-setup disease from the fixture post wearing a new
   coat. The negative image of the cold open.
4. **Who do builders run as?** The question the fixture post never
   asked. Walk into it concretely: with a minimal ambient actor, half
   the cold open's setup calls would be *forbidden*. The two-scopes
   invariant, stated plainly: no auth-off flag, only a system
   principal; builders shadow to it inside their own scope
   (`asSystem(fn)` internally, try/finally); tests cannot name it —
   it is not in their context, not exported, not a parameter. Show a
   builder's internals. Show a mid-test builder call succeeding while
   the ambient actor is an outsider.
5. **The actor is provided.** `ActingAs(pick)` is one more chain link
   — the actor is part of the world, declared where the store and the
   builders are declared. With no `ActingAs` in the chain the ambient
   actor is anonymous and the api refuses loudly — fail closed, and
   the failure message says what is missing.
6. **Switching actors.** `handle.withAuth(fn)` on user handles — the
   per-call shadow for multi-actor tests, same mechanism as the
   builder's system scope pointed at a named user. This is the idiom
   whose absence caused the production erosion (beat 8). Include the
   403-vs-404 precision point: the outsider's refusal is a deliberate
   choice between "forbidden" and "not found", and the test states
   which.
7. **What you get for free.** Re-run the fixture post's ordinary tests
   under the new world: they now traverse the authorize path without
   changing a line. A permission bug fails behavior tests. The
   quieter payoff mirrors "defaults are declarations": the ambient
   actor is a declaration too — a test that never mentions auth is on
   record as expecting *ordinary member privileges* to suffice.
8. **Confession — the production numbers.** The monorepo behind this
   trilogy defaults its canonical chain to tenant-admin, and 57 test
   files call `runAsRoot` in their bodies. Why: no `withAuth` idiom
   existed, so the system principal was the path of least resistance.
   The doctrine in this post is the repair, not the origin story —
   written down because the erosion proved conventions decay without
   an idiom and a lint rule. (Also: rename the production escape
   hatch apart from the internal-escalation mechanism.)
9. **Lineage and prior art.** lp2025's `TestWorld` nouns — `user()`,
   `visitor()`, `invitee()` — an unauthenticated actor as a fixture
   noun; Cucumber's `World`; `BYPASSRLS` seeding roles; Firebase
   admin-vs-client SDK. One paragraph each, links out.
10. **Ring.** Reopen the cold open; every line now read. Close the
    trilogy: a test declares a world — environment, data, actor — and
    the world answers for everything the test does not say. Kicker
    candidate: "Auth is not a thing you turn off for tests. It is a
    thing you scope — and the scope is part of the world."
11. **Appendix — the world.** Full compiled source: store, services
    with the authorize step, the auth cell, builders (now
    system-scoped), `ActingAs`, `withAuth`, and the
    `Providers`/`test` machinery re-declared.

## Title and slug candidates

- **"World Building: Test Actors for Test-Driven TypeScript"** —
  completes the sibling set (Providers: Dependency Injection…; Fixture
  Builders: Test Data…). Names the new axis; description carries the
  payoff.
- "World Building: Who Is Running Your Tests?" — question form,
  payoff-adjacent, less sibling-consistent.
- "The Actor Is Part of the World" — payoff-first, no mechanism.

Slug: `2026-08-24-world-building` (rename cheap until publish,
expensive after).

## Mechanical constraints

- Same compiled format: everything except the `src/ts-post` import
  renders; machinery re-declared in the appendix (decision 3 of the
  fixture post carries over — posts stay self-contained).
- No AsyncLocalStorage in the blog machinery (consistent with both
  siblings). The ambient actor is a mutable cell in context
  (`auth.current`), and both `withAuth` and the builders' internal
  `asSystem` are try/finally swaps of that cell. Honest for a
  single-threaded test body; the difference from the production
  ambient-context version is named in beat 8/9 territory, as the
  fixture post did for module-level `testStr`.
- The system principal must be structurally unreachable from tests in
  the compiled example: defined in the appendix, closed over by
  builders and services, never placed in context. A
  `@ts-expect-error`-style negative beat if the format allows one
  (e.g. `ctx.system` does not typecheck).
- `const` doesn't hoist: the cold open references `TestWorld`,
  `provideBaseData`, and `ActingAs` — all must be hoisted `function`
  declarations (`ActingAs` is a function returning a provider, so
  that's natural).
- The fixture post's services throw (`No such project`); this post
  keeps throw-based refusals (`AccessDenied` / `NotFound` classes) —
  the production Result system is out of scope for the trilogy.

## Open decisions

1. **The friend.** Quote the conversation with his name/company (needs
   his okay), anonymize ("a friend who reviews PRs at a storage
   company"), or paraphrase without the chat framing. Recommend:
   anonymize now, upgrade to named if he agrees — publishing doesn't
   block on him.
2. **Title** (recommend the sibling-style "World Building: Test Actors
   for Test-Driven TypeScript").
3. **Cold open** (recommend demo-first with the conversation as the
   nut graf, consistent with siblings; alternative: open on the
   conversation itself — warmer, but breaks the trilogy's
   code-first signature).
4. **The confession's specificity** (recommend real numbers — "57 of
   322 test files" — matching the trilogy's habit of grounded
   provenance claims; alternative: soften to "dozens").
5. `withAuth` as the handle-method name (your coinage from the
   conversation; alternatives: `as`, `actingAs`). Default `withAuth`
   unless you object.

## Decisions (2026-09-04)

1. **The friend: anonymized.** "A friend who reviews PRs at a storage
   infrastructure company"; the exchange is paraphrased. Upgrade to
   named only if he agrees; publishing does not wait on him.
2. **Title: "World Building: Test Actors for Test-Driven TypeScript".**
   Dated and slugged for the writing day, `2026-09-04-world-building`,
   matching the siblings' publish-date convention (rename is cheap until
   publish).
3. **Cold open: demo-first**, the conversation as the nut graf.
4. **Confession: real numbers.** Re-surveyed 2026-09-04 against the
   monorepo at its 2026-08-01 head: 57 of 322 backend-library test
   files call `runAsRoot` in their bodies (69 of 454 monorepo-wide);
   48 test files chain `provideTenantAdminAuth`. Nuance recorded: a
   per-user chain link (`provideUserAuth`) does exist there; what is
   missing is the per-call, handle-level idiom.
5. **Handle method: `withAuth`.**
6. **Mechanics settled while building the example:** the ambient actor
   is a mutable cell in context (`auth.current`); `ActingAs` sets it,
   `withAuth` and the builders' `asSystem` are try/finally swaps of the
   same cell. Handles read as system too (`get()` is the test's eyes,
   not the actor's). Every public door takes a user *handle*, never a
   principal, so there is no expression where a test can spell
   "system"; the single-file caveat (the appendix's `system` constant
   is a name in scope) is stated in the post.
