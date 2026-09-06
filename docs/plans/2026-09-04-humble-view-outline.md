# Outline: the humble-view post

Working artifact for the structure of a post on the three-layer frontend
architecture (Service / Ux / View) and its two proofs (tests for the Ux
layer, stories for the View layer, both running on fake services). Third in
the series after
[Providers](https://lab.photomancer.art/post/2026-08-04-providers/) and the
fixture-builders post. This describes the *architecture* of the piece and
the *design* of the demo app that is its leading example; prose changes
happen in the post itself, code changes in the demo repo.

## The story

**Thesis (one sentence):** If the UI logic of a feature lives in a plain
TypeScript object that owns its services and emits a data-only view state,
then that logic gets ordinary unit tests with no DOM, the components get
stories with no backend, and both proofs run on the same fake services —
and the price is one naming convention and a thin adapter per framework,
not a state-management library.

The payoff is **two proofs, one set of fakes**: a Ux test that drives a whole
feature flow in a few lines with no DOM and no mocks, and a full-page story
that boots the same feature on the same fakes and renders it for real. The
price is the discipline of keeping the View humble (renders state, dispatches
actions, decides nothing) and the Ux framework-free. The story of the post is
how small that price is, and what it buys beyond tests: agents and humans get
one obvious place to put each kind of code.

**Reader:** A working TypeScript engineer with a React app where logic lives
in hooks and components, data loading happens in effects, and "testing the
UI" means React Testing Library plus `msw` handlers duplicated in every story.
They have heard of MVVM, MVP, and "humble object" and think of them as Java-era
ceremony. They skim; the code blocks must carry the argument alone. The
imagined specific reader is still Charlie: senior backend engineer, allergic
to frontend indirection, will respect the tests before the diagram.

**Secondary reader (blurb only):** a coding agent that has been pointed at
this post from a project's instructions. The post opens with a short italic
blurb: written by a bot with Yona's help to explain the idea to a human; if
you are an agent, start at the demo repo's `AGENTS.md`. The post itself is
not rewritten for agents; the repo is the artifact for them.

**The move:** Demo-first, then ring composition, and the demo is *two*
artifacts side by side inside the first screen: a compiled Ux test of the
full flow, then an embedded full-page story of the same flow on the same
fakes. The middle builds the three layers bottom-up (Service, Ux, View) and
the two proofs, then returns to the opening pair once every line is readable.
Compiled format for everything that does not need a DOM: services, fakes,
contract tests, the Ux layer, its tests. Render-only for React and Storybook,
with the real thing embedded from the demo repo's published Storybook.

## Grounding (LightPlayer and Skybridge, 2026-09-04)

Neither project has the whole pattern; each has a different half, and the
demo is the union. The post says so.

- **LightPlayer** (`lp-app/lpa-studio-core`, `lpa-studio-web`; public):
  the Ux layer is explicit and named. ADR 2026-06-21 "Studio UX Layer"
  defines resource-owning surfaces (`StudioUx`, `DeviceUx`, `ProjectUx`)
  that own `lpa-link` / `lpa-client` and expose UI-independent view DTOs
  (`UiStudioView`, `UiPaneView`) and typed `UiAction`s; ADR 2026-07-25 calls
  the result "the humble-view architecture". `studio_device_e2e_tests.rs`
  drives the real effects layer over a scripted fake device's actual bytes
  (30 tests; ~1150 tests in the crate). Stories (`*_stories.rs`, native
  Dioxus storybook, CI baselines in a companion repo) render *hand-built DTO
  fixtures* — no story boots a Ux on fakes. That is the gap.
- **Skybridge** (`sbs/`; private, excerpt only): full-page route stories
  boot the app via `Providers(provideStoryTestApp, provideStoryRootData, …)`
  with the memory database, run the real `+page.server` load inside
  `runInContext`, then render the real page (`AppForStory`; 49 page stories,
  439 total). `AppQuery` is dual-implementation (memory / Postgres) and the
  same tests run against both. There is no Ux layer: page logic lives in
  load functions and components, and `UiAction` is a presentation DTO with
  callbacks. That is the other gap.
- **Prior art in the blog:** the providers post supplies the DI and the
  three-argument `test(name, world, fn)`; this post reuses both without
  re-explaining them. The abandoned August "Action model" branch's doctrine
  (action reports semantic state; surface decides presentation; no metadata
  field without a renderer and a story that honors it) becomes one beat here.

## The demo app (leading example)

Built before any prose. Public repo, its own CI, its own published
Storybook. Proposed name: **`PhotomancerArt/humble-view`**, app name
**Dispatch** — a small shipping dashboard, continuing the `shipping-dashboard`
config from the providers post.

**Domain: Dispatch.** Two feature modules that must talk to each other.

- `orders`: list orders; **cancel** (destructive, needs confirmation);
  **refund** (permission-gated: forbidden unless the current user is an
  admin). Shows all four semantic action states: available, disabled (order
  already shipped), forbidden (no permission), unavailable (not applicable).
- `shipments`: list shipments; **dispatch** (async, shows progress, can fail
  — the fake carrier has scripted failures); **mark delivered**.
- Cross-feature: a delivered shipment changes its order's status. The
  features never import each other; `shipments` publishes a domain event on
  the shared bus and `orders` subscribes.

**Layout (pnpm workspace + turbo):**

```text
packages/
  core/            the pattern, app-agnostic: providers + test(), UxStore,
                   Action/Affordance, useUx, EventBus, FakeClock
  core-ui/         shared React components: shadcn/ui primitives plus the
                   pieces built on them (ActionButton, ActionBar, ConfirmDialog,
                   StatusBadge) with their own component stories
  app-core/        Dispatch-wide services: AuthService, HttpClient, Clock,
                   DispatchEvent union, AppContext type
  feat-orders/     service/ (OrderService, Http + Fake impls, contract suite,
                   in-memory routes), ux/ (OrdersState, OrdersOp, OrdersUx,
                   tests), view/ (OrdersView, OrdersPage, stories), testing/
  feat-shipments/  same shape
apps/
  api/             node HTTP server mounting each feature's routes
  dashboard/       Vite + React shell composing both features on real services
  storybook/       config, globs feat-*/src/**/*.stories.tsx, full-app story;
                   published to GitHub Pages
```

Dependency rule enforced by the package graph: `feat-* → app-core → core`
and `feat-* → core-ui → core`. Features never depend on each other or on
`apps/`. Each package's tests run alone. Each feature owns its own service
(interface, real, fake, contract suite) and its own in-memory route module
so the HTTP contract test runs in-process without depending on `apps/api`;
the api app only mounts the routes.

**Naming (one feature, `orders`):**

| Name | Layer | What it is |
|---|---|---|
| `OrderService` | Service | interface; `HttpOrderService`, `FakeOrderService` implement it; `provideOrderService` / `provideFakeOrders` |
| `OrdersOp` | Ux | typed command union the Ux accepts, plain data |
| `Affordance` | core | semantic availability of an op as data: available / disabled / forbidden / unavailable, plus reason, confirm, progress |
| `OrdersAction` | Ux → View | an op paired with its affordance and label; carried by the state |
| `OrdersState` | Ux → View | data-only, serializable read model the Ux emits |
| `OrdersUx` | Ux | factory function; owns services from ctx; `state`, `subscribe`, `dispatch(op)`; re-validates affordance on dispatch |
| `OrdersView` | View | React component of `{ state, dispatch }`: renders, dispatches, decides nothing |
| `OrdersPage` | View | the one place React meets the Ux: `useUx(ux)` feeding `OrdersView` |
| `OrdersView.stories` | proof | component stories on hand-built state |
| `OrdersPage.stories` | proof | full-page stories: `Providers(fakes…, provideOrdersUx)` + play tests |
| `OrdersUx.test` | proof | Ux tests: `test(name, Providers(fakes…, provideOrdersUx), ctx => …)` |

Op and Action are separate words on purpose: LightPlayer's `ControllerOp` /
`UiAction` split proved useful; Skybridge's single `UiAction` with callbacks
did not. Page is its own word so View stays pure and the two kinds of story
never blur.

**Ux mechanics:** framework-free. A `UxStore<State>` primitive gives
`getState` / `subscribe`; React consumes it with `useSyncExternalStore` in a
ten-line `useUx` adapter. Async work is driven by injected services and an
injected clock so tests are deterministic; fakes expose `settle()` and
scripted failure injection (modeled on LightPlayer's `FakeDeviceScript` and
Skybridge's `FetchMockProvider`).

**Contract tests:** `describeOrderService(name, provide)` exported from
`service-core`, run once against `FakeOrderService` and once against
`HttpOrderService` pointed at `apps/api` started in-process. The fake is
proven equivalent, not assumed.

**Stories:** component stories take hand-built `OrdersState` (as LightPlayer
does). Full-page stories boot the Ux on fake services (as Skybridge does) and
carry play tests for the flows, including a scripted-failure story. Storybook
static build published to Pages and embedded in the post via iframe
(precedent: the contiguous-popup post's `static/examples`).

**`AGENTS.md`:** the doctrine as a checklist an agent can follow: where each
kind of code goes, the naming table, the dependency rule, the "no action
field without a renderer and a story" rule, how to add a feature, how to add
a service with its fake and contract test.

## Beat sheet

1. **Agent blurb.** Two italic sentences above the fold: written by a bot with
   Yona's help for a human who wants to use the idea; agents start at the
   repo's `AGENTS.md`. Link.
2. **Cold open, part one — the Ux test.** A compiled test: fake order service
   with two orders, fake auth as admin, `provideOrdersUx`; dispatch cancel,
   confirm, assert the state. No DOM, no mocks, nothing rendered. Two
   sentences of setup at most.
3. **Cold open, part two — the same flow, rendered.** The embedded full-page
   story of `OrdersView` booted on the same fakes, with a "runs here" link to
   the published Storybook. One sentence: same providers, same fakes, real
   components.
4. **Nut graf.** Name what is absent from both: `msw`, `vi.mock`, React
   Testing Library in the logic test, a backend in the story. Name the three
   layers and the two proofs. State the price (a naming convention, a
   ten-line adapter, the discipline of a humble view). Name the reader.
   Provenance in one line: union of two production codebases, demo repo
   linked.
5. **Why you can't write these today.** The usual React feature: fetch in an
   effect, logic in a hook, decisions in JSX. Numbered failure modes: logic
   is only reachable through the DOM; every story needs its own network
   mocks; the same "is this button enabled" rule lives in three components;
   nothing is reusable by a CLI, an agent, or a second framework. Reframed
   as the negative image of the cold open.
6. **The Service layer, briefly.** Interface + real + fake, provided through
   the providers pattern (link back; do not re-derive). The contract suite
   run twice is the new idea: the fake is *proven* equivalent. Compiled.
7. **The Ux layer.** `OrdersUx` in full: owns services from ctx, holds
   `OrdersState`, exposes `dispatch`, notifies subscribers. Compiled. Then
   its tests: the cold-open test re-read, plus an async flow with injected
   clock and a scripted failure. "Every rule about what the user may do
   lives here, once."
8. **Actions are data.** `OrdersAction` carries semantic availability
   (available / disabled / forbidden / unavailable) and the Ux re-validates
   on invoke; the View decides whether forbidden means hidden or greyed.
   Confirmation and progress as data. The rule: no action field without a
   renderer and a story that honors it. Compiled types; the LightPlayer and
   Skybridge lesson (declared-but-unrendered metadata) named in one line.
9. **The View layer.** `useUx` adapter (render-only), `OrdersView`
   (render-only, short), component stories on hand-built state. The view has
   no imports from services and no conditionals about permissions.
10. **Full-page stories.** How the story file boots `Providers(fakes…,
    provideOrdersUx)` and renders the real view; play tests drive the same
    flow the Ux test drove. Ring closes: re-show the cold-open pair; "you now
    know every line, and both proofs share one world."
11. **Features and boundaries.** `feat-orders`, `feat-shipments`,
    `service-core`, the event bus, the turbo graph, tests that run per
    package. One paragraph and one diagram; details live in the repo.
12. **Provenance and the two gaps.** LightPlayer has the layer and the tests
    but its stories render fixtures; Skybridge has stories on fakes but no Ux
    layer. The demo is the union. Honest, and a to-do for LightPlayer.
13. **Coda for agents and teams.** What to put in an `AGENTS.md`; the
    checklist; link. Closing kicker candidate: "the view is humble so that
    everything else can be tested."

## Title and slug candidates

- **"The Humble View: Tests for the Logic, Stories for the Screen"** —
  payoff-first, names the pattern by its established name (Feathers /
  Fowler), matches the thesis. Recommended.
- "Service, Ux, View" — terse, mechanism-first; better as a section title.
- "Two Proofs, One Set of Fakes" — the ring line inside the post rather than
  the title.

Slug: `2026-09-humble-view` (date to be set at publish; keep the slug free of
the day so a slipped date needs no redirect). Description candidate: "A
three-layer frontend architecture — Service, Ux, View — where the logic gets
plain unit tests, the components get stories, and both run on the same fake
services."

## Mechanical constraints

- The post compiles top-to-bottom under vitest with no DOM, so the cold-open
  test must reference only hoisted `function` declarations (`Providers`,
  `test`, providers, the Ux factory), as the providers post does.
- The post's compiled code is a **self-contained miniature** of one feature
  (`orders`), not an import from the demo repo; the repo is the full-scale
  reference. The post says this in one sentence. Drift risk is accepted in
  exchange for keeping the blog build independent of the demo repo.
- React and Storybook code is render-only (`ts` template). The published
  Storybook is embedded from the demo repo's Pages URL; a fallback link opens
  it in its own tab.
- The `AsyncLocalStorage` ambient-context mechanism from the providers post
  is server-only; the demo's Ux takes its services from an explicit ctx and
  the post says why in one line.

## Open decisions

1. **Demo domain.** Dispatch (orders + shipments) as above. Alternatives: team
   invites (members + invites), library loans (catalog + loans). Dispatch
   recommended for continuity with the providers post and because "cancel an
   order" and "refund" make the four action states obvious.
2. **Repo name and app name.** `PhotomancerArt/humble-view`, app "Dispatch".
   Alternatives: `ts-humble-view` (matches `ts-provide`), `humble-view-demo`.
3. **DTO name.** `OrdersState` for the emitted read model (recommended:
   "state" reads as *what to show*, and "View" is then unambiguously the
   component). Alternative: `OrdersViewModel`, or LightPlayer's convention
   where `*View` is the DTO and the component is `*Pane`.
4. **Real backend.** A tiny in-process HTTP API (`apps/api`) so the contract
   suite genuinely runs against an HTTP implementation. Alternative: skip the
   HTTP layer and make "real" a local-storage implementation, which is
   simpler but makes the real/fake distinction less convincing.
5. **Where the demo's implementation plan lives.** In the demo repo itself
   (`docs/plans/`), created by the planning workflow there; this brief owns
   only the post and the demo's shape.

## Decisions (2026-09-04)

1. Domain: **Dispatch** (orders + shipments).
2. View framework: **React**, because it is the norm, not because it is loved.
3. Reader: humans primary; two-sentence agent blurb at the top pointing at the
   repo's `AGENTS.md`.
4. Repo: `PhotomancerArt/humble-view`, app name Dispatch (proposed, accepted
   by default).
5. Read model is `OrdersState`; component is `OrdersView`; connector is
   `OrdersPage`; `Op` and `Action` are distinct.
6. Features own their services and in-memory routes; `app-core` holds only
   cross-cutting services; `core-ui` (shadcn/ui plus shared action
   components) added at Yona's request.
7. Real backend: in-process HTTP via each feature's route module, mounted by
   `apps/api`.


## Decisions (2026-09-04, demo-repo planning)

Superseding the layout above where they differ; the demo repo's plan is the
source of truth for the repo:
`~/.photomancer/planning/humble-view/2026-09-04-1547-dispatch-demo/plan.md`.

1. The pattern package is `ux-core` (not `core`); UI has four layer packages
   matching Yona's model: `ui-design` (tokens), `ui-core` (shadcn
   primitives, never imports `ux-core`), `ui-app` (Dispatch's common
   language, renders affordances), and the page layer inside each feature's
   `view/`. Features may keep local components at any layer.
2. A simulated backend package, `backend`, owns the domain model, the
   in-memory store, the business rules (including delivered-shipment ⇒
   delivered-order and refund-requires-admin), the Hono routes, fixture
   builders (`TestOrder`, `TestShipment`) and world providers. Feature fakes
   call it directly plus a script; `Http*` services call the routes via a
   fetch-shaped function; the contract suite proves Fake ≡ Http.
3. Worlds are shared: Ux tests and page stories start from the same chain,
   e.g. `Providers(provideFakeClock, provideFakeBackend(), provideAdmin,
   provideOrders([...]), provideFakeOrderService, provideOrdersUx)`. This is
   the continuity with the providers and fixture-builders posts and belongs
   in the nut graf.
4. Deployed to GitHub Pages: dashboard at `/` running the real HTTP services
   against the Hono routes in-browser (no server), Storybook at
   `/storybook/`. The post embeds story deep links from there.
5. The repo carries an ADR (`docs/adr/0001-service-ux-view-layers.md`) and a
   README that sells each idea with its cost and payoff; the post links both
   and does not duplicate the README's justification section.
6. Toolchain: TS 5.9, React 19, Vite 8, vitest 5, Storybook 10 with
   addon-vitest play tests, Tailwind 4, shadcn copied in, Hono, turbo.

## Decisions (2026-09-04, drafting)

The demo PR (PhotomancerArt/humble-view#1) merged and Pages is live: the
dashboard, `/storybook/`, and story deep links all return 200, so the post
embeds them directly with no placeholder.

1. File: `content/post/2026-09-humble-view.post.ts` (slug as planned; the
   demo README already links `/post/2026-09-humble-view/`). Date 2026-09-04
   for the draft; set at publish.
2. Title: "The Humble View: Tests for the Logic, Stories for the Screen".
3. Embeds (Storybook `iframe.html?viewMode=story&id=…`): `orders-orderspage--as-admin`
   at the cold open (interactive, the reader can click Cancel);
   `app-actionbutton--all-states` in the actions beat;
   `orders-orderspage--test-cancel-pending-order` at the ring close (the play
   test runs on load); `dispatch-dispatch--default` in the features beat.
   Each has an "open in Storybook" link and a source link.
4. Miniature scope: orders only; no event bus and no `dispose` (one sentence
   says the repo's Ux adds both); `Http` service and in-process routes are
   included so the contract suite genuinely runs twice; a small `FakeClock`
   and `FakeScript` so the in-flight and scripted-failure tests are real.
   `provideFakeBackend` is a plain provider (no options), unlike the repo's
   `provideFakeBackend()`.
5. Provenance names LightPlayer (public) and keeps the SaaS monorepo unnamed,
   as the earlier posts do.
6. Beat 8 shows the `Affordance`/`Action` types inside beat 7 (the Ux emits
   them, so they read better before `OrdersUx`) and keeps the doctrine, the
   `ActionButton` excerpt, and the `AllStates` story for beat 8.
