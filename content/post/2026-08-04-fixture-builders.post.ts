import { md, post, ts } from "../../src/ts-post";

post({
  title: "Fixture Builders: Test Data for Test-Driven TypeScript",
  date: "2026-08-04",
  description:
    "Typed factories that create real rows through the app's own code paths, so a test's setup reads as its specification. The data half of testing without mocks.",
  tested: true,
  tags: ["architecture", "typescript"],
});

md`
Here is a test of an access rule. Every row it needs, it makes — and the only fields it spells out
are the ones the rule is about.
`;

test(
  "private projects are visible only to users granted access",
  TestWorld,
  async ({ testData, projectService }) => {
    const org = await testData.org();
    const project = await org.project({ visibility: "private" });
    const orgUser = await org.user();
    const otherUser = await testData.user();
    await project.grantAccess(orgUser);

    expect(await projectService.canView(orgUser.id, project.id)).toBe(true);
    expect(await projectService.canView(otherUser.id, project.id)).toBe(false);
  },
);

md`
Five lines of setup, five rows — one of them an org you may not have noticed. No names, no emails,
no ids: defaults cover every field the rule does not read. What remains is exactly the specification
— a \`private\` project, a user in its org with access granted, a user outside it without — and the
rule's answer for each. (\`testData.user()\` near the end quietly created a second org to hold
\`otherUser\`; more on that later.)

[The previous post](/post/2026-08-04-providers/) argued for testing against fakes and real databases
instead of mocks, with each test declaring its world as a provider chain. This post is about the
problem you inherit the moment you win that argument. A mock carries its data inside itself — "when
\`findUser\` runs, return this literal." A fake store or a real database starts _empty_. Something
has to put rows in it, in every test, without burying the point of the test.

The answer that has held up for me is the fixture builder: one small typed factory per resource that
creates real rows through the app's own code paths, defaults every field you don't mention, resolves
relationships — creating ancestors if needed — and returns a live handle instead of a stale row. The
price is about twenty lines per resource, every builder the same shape, no library. Like every
example on this page, the code above compiled and ran before the page was built.

## The usual answers

The first reflex is a fixture file — a seed loaded before the suite runs:
`;

md`
~~~json
{
  "orgs": [{ "id": "org1", "name": "Acme" }],
  "users": [
    { "id": "u1", "orgId": "org1", "name": "Ada", "email": "ada@acme.test" },
    { "id": "u2", "orgId": "org1", "name": "Grace", "email": "grace@acme.test" }
  ],
  "projects": [
    { "id": "p1", "orgId": "org1", "name": "Roadmap", "visibility": "private", "memberIds": ["u1"] }
  ]
}
~~~
`;

md`
Tests against it read like \`expect(await canView("u2", "p1")).toBe(false)\` — correct today, and
rotting on a schedule the file itself sets:

1. **It is shared.** Every test runs against the same world, so nobody can change the file without
   re-auditing every test that reads it. Fixture files only grow.
2. **It is untyped.** Rename a column and the JSON keeps parsing. The failure surfaces at a
   distance, in whichever test happens to read the stale field.
3. **It is invisible.** \`"u2"\` means "a user who is not a member of p1" — but that fact lives in
   another file, encoded as the _absence_ of an id in an array. The test states its inputs nowhere.
4. **It does not compose.** "Same thing, but with the grant" is a new hand-maintained entry, not a
   function call.

The second reflex is inline setup — every test inserts its own rows:
`;

ts`
it("hides private projects from non-members", async () => {
  await db.insert("orgs", { id: "org1", name: "Acme" });
  await db.insert("users", { id: "u1", orgId: "org1", name: "Ada", email: "ada@acme.test" });
  await db.insert("users", { id: "u2", orgId: "org1", name: "Grace", email: "grace@acme.test" });
  await db.insert("projects", {
    id: "p1",
    orgId: "org1",
    name: "Roadmap",
    visibility: "private",
    memberIds: ["u1"],
  });

  expect(await canView("u2", "p1")).toBe(false);
});
`;

md`
This fixes the sharing and the invisibility, then drowns in accidental detail: every required column
and every foreign key, spelled out by hand, in every test. Eleven values to establish one deliberate
fact. Teams bounce between these two answers because each one fixes what the other breaks.

A fixture builder fixes both at once: per-test data (nothing shared), with defaults (nothing
accidental), in TypeScript (nothing stale), built by function calls (everything composable).

## The app under test

The examples run against a small task tracker. Orgs contain users and projects, projects contain
tasks, and a project is either visible to its whole org or \`private\` to explicitly granted
members:
`;

interface OrgRow {
  id: string;
  name: string;
}

interface UserRow {
  id: string;
  orgId: string;
  name: string;
  email: string;
}

interface ProjectRow {
  id: string;
  orgId: string;
  name: string;
  visibility: "org" | "private";
  memberIds: string[];
}

interface TaskRow {
  id: string;
  projectId: string;
  title: string;
  status: "open" | "done";
}

type OrgProps = Omit<OrgRow, "id">;
type UserProps = Omit<UserRow, "id">;
type ProjectProps = Omit<ProjectRow, "id" | "memberIds">;
type TaskProps = Omit<TaskRow, "id" | "status">;

md`
The service layer is ordinary application code — \`orgService.create\`, \`projectService.canView\`,
and so on, backed here by an in-memory store and provided as a chain, exactly as in the previous
post. The full source is in the appendix. The one property that matters now: creates validate their
foreign keys, the way a real database would.

## The shape of a builder

A builder has two sides. Calling it creates a row: \`testData.user({ name: "Radia" })\`. Its
\`.byId\` wraps an already-existing row in the same kind of handle: \`testData.user.byId(id)\`.
\`Object.assign\` fuses the two into one symbol, and creating returns the handle, not the row:
`;

function userBuilder(ctx: AppServicesCtx) {
  const { orgService, userService } = ctx;

  const byId = (id: string) => ({
    id,
    get: () => userService.get(id),
  });

  return Object.assign(
    async (props: Partial<UserProps> = {}) => {
      const orgId = props.orgId ?? (await orgService.create({ name: testStr("org") })).id;
      const name = props.name ?? testStr("user");

      return byId(
        (await userService.create({ email: `${name}@example.com`, ...props, name, orgId })).id,
      );
    },
    { byId },
  );
}

md`
The whole pattern is in the creator's four lines:

- **Every field has a default,** so a test mentions only what it means.
- **Overrides are one spread.** No fluent \`.withName().withOrg().build()\` ceremony — the overrides
  object is typed \`Partial<UserProps>\`, so the compiler already knows the vocabulary.
- **Resolved fields land after the spread.** \`name\` and \`orgId\` are computed before the call, so
  they are spread last; correlated defaults stay correlated (the default email is derived from the
  same \`name\`).
- **A missing parent is created.** No \`orgId\`? A fresh org appears. More on this below.
`;

test(
  "defaults fill what the test does not say; overrides win where it does",
  TestWorld,
  async ({ testData }) => {
    const user = await testData.user({ name: "Radia" });
    const row = await user.get();

    expect(row.name).toBe("Radia");
    expect(row.email).toBe("Radia@example.com");
  },
);

md`
### Defaults are declarations

The entire uniqueness strategy is a per-prefix counter:
`;

const testStrCounters = new Map<string, number>();

function testStr(prefix: string): string {
  const count = testStrCounters.get(prefix) ?? 0;
  testStrCounters.set(prefix, count + 1);
  return `${prefix}-${count}`;
}

md`
Not faker, not \`randomUUID\`. A default like \`user-3\` is unique, readable in a failure message,
and identical across runs — so a changed test output means changed behavior, not changed data. (In
the production version of this pattern the counter lives in a provided fake clock service, scoped
per world; module-level is enough here.)

There is a quieter point underneath. Every defaulted field is a declaration: the cold open never
mentions emails, so it is on record as not depending on them. When a test does override a field,
that field is load-bearing. The defaults are not just convenience — they are what makes the
overrides legible as the specification.

## Relationships are the real problem

Test data is hard because rows point at rows: a task needs a project, which needs an org. This is
exactly what fixture files cannot express and inline setup cannot stop repeating. Builders resolve a
relationship three ways, in priority order — and each is one line:
`;

function projectBuilder(ctx: AppServicesCtx) {
  const { orgService, projectService } = ctx;

  const byId = (id: string) => ({
    id,
    get: () => projectService.get(id),
    grantAccess: (user: { id: string }) => projectService.grantAccess(id, user.id),
  });

  return Object.assign(
    async (props: Partial<ProjectProps> = {}) => {
      const orgId = props.orgId ?? (await orgService.create({ name: testStr("org") })).id;

      return byId(
        (
          await projectService.create({
            name: testStr("project"),
            visibility: "org",
            ...props,
            orgId,
          })
        ).id,
      );
    },
    { byId },
  );
}

function taskBuilder(ctx: AppServicesCtx) {
  const { taskService } = ctx;

  const byId = (id: string) => ({
    id,
    get: () => taskService.get(id),
  });

  return Object.assign(
    async (props: Partial<TaskProps> = {}) => {
      const projectId = props.projectId ?? (await projectBuilder(ctx)()).id;

      return byId((await taskService.create({ title: testStr("task"), ...props, projectId })).id);
    },
    { byId },
  );
}

md`
Strategy one is an explicit id: \`testData.project({ orgId: org.id })\` when you already hold the
parent. Strategy three is the fallback chain visible above: a bare \`testData.task()\` asks the
project builder for a project, which creates an org of its own — this is what happened to
\`otherUser\` in the cold open, whose bare \`testData.user()\` landed it in a fresh org. One call, a
whole ancestry, zero setup lines.

Strategy two is the parent handing out children. The org builder closes the set:
`;

function orgBuilder(ctx: AppServicesCtx) {
  const { orgService } = ctx;

  const byId = (id: string) => ({
    id,
    get: () => orgService.get(id),
    project: (props: Partial<ProjectProps> = {}) => projectBuilder(ctx)({ ...props, orgId: id }),
    user: (props: Partial<UserProps> = {}) => userBuilder(ctx)({ ...props, orgId: id }),
  });

  return Object.assign(
    async (props: Partial<OrgProps> = {}) =>
      byId((await orgService.create({ name: testStr("org"), ...props })).id),
    { byId },
  );
}

md`
\`org.project({ visibility: "private" })\` and \`org.user()\` from the cold open are these two
methods: the caller's overrides spread first, the parent's \`orgId\` spread after them. The order is
deliberate — a child made through a parent cannot be quietly re-parented by an override.
`;

test("a bare task builds its entire ancestry", TestWorld, async (ctx) => {
  const task = await ctx.testData.task();

  const project = await ctx.projectService.get((await task.get()).projectId);
  const org = await ctx.orgService.get(project.orgId);

  expect(org.name).toContain("org-");
});

md`
## Handles, not rows

Creating returns \`byId(id)\` — a handle wrapping nothing but the id. \`get()\` re-reads the store
every time, so a handle can never go stale. When the code under test mutates a row, asserting
through the handle sees the mutation:
`;

test("handles re-read the store, so they see the app's writes", TestWorld, async (ctx) => {
  const task = await ctx.testData.task();

  await ctx.taskService.complete(task.id); // imagine a route handler did this

  expect((await task.get()).status).toBe("done");
});

md`
And because \`.byId\` is public, a handle can adopt a row the _app_ created. Builder ergonomics are
not just for setup — they extend to asserting on the system's own writes:
`;

test("builders adopt rows the app created", TestWorld, async ({ testData, taskService }) => {
  const project = await testData.project();
  const created = await taskService.create({ projectId: project.id, title: "From the app" });

  expect((await testData.task.byId(created.id).get()).title).toBe("From the app");
});

md`
## Through the front door

\`testData.task()\` never touches the store directly. It calls \`taskService.create\` — the same
function a route handler calls, validation included. Fixtures therefore cannot construct states the
application cannot reach:
`;

test("fixtures cannot reference rows that do not exist", TestWorld, async ({ testData }) => {
  await expect(testData.task({ projectId: "p_404" })).rejects.toThrow("No such project");
});

md`
The compiler holds the other half of the door. A fixture file fails silently when the schema moves;
builders are TypeScript, so schema drift breaks the affected tests at compile time. These are
expected type failures in this post's checked source:
`;

test("the compiler checks fixture data", TestWorld, async ({ testData }) => {
  // @ts-expect-error "public" is not a visibility this app has.
  void testData.project({ visibility: "public" });

  // @ts-expect-error Typos in field names do not survive compilation.
  void testData.user({ nam: "Ada" });
});

md`
## Builders live in the world

One question is left over from the cold open: where did \`testData\` come from? It was destructured
from the test's context. Builders are provided, like everything else:
`;

function provideTestData(ctx: AppServicesCtx) {
  return {
    testData: {
      org: orgBuilder(ctx),
      user: userBuilder(ctx),
      project: projectBuilder(ctx),
      task: taskBuilder(ctx),
    },
  };
}
type TestDataCtx = ReturnType<typeof provideTestData>;

function TestWorld() {
  return Providers(provideStore, provideAppServices, provideTestData)();
}

md`
\`TestWorld\` is the previous post's playbook applied to data: store, then services, then builders,
one chain. "Which fixtures does this test have" and "which services does this test have" are now the
same question with the same answer — read the chain.

It also means shared setup is not a \`beforeEach\` mutating outer variables. A pre-populated world
is a longer chain — a data provider that runs builders and hands the handles into context:
`;

async function provideBaseData({ testData }: TestDataCtx) {
  const org = await testData.org();
  const admin = await org.user({ name: "admin" });

  return { org, admin };
}

test(
  "shared setup is a provider, not a beforeEach",
  Providers(TestWorld, provideBaseData),
  async ({ org, admin, projectService }) => {
    const project = await org.project({ visibility: "private" });
    await project.grantAccess(admin);

    expect(await projectService.canView(admin.id, project.id)).toBe(true);
  },
);

md`
Scroll back to the opening test. Every line of it is now code you have read: the world is a provider
chain, the builders come out of the chain, every row goes through the app's own creates, and the
only fields named are the ones the rule under test reads.

## Where it grows

These builders are the minimal shape. The production monorepo behind the previous post has nineteen
of them — one per resource, colocated with the feature they build — and they carry the pattern
further in a few directions worth knowing about before you need them:

- **Module-level statics.** Production builders are named \`TestUser\`, \`TestTenant\`, and so on,
  and tests import them directly instead of pulling \`testData\` from context — the same two-sided
  \`Object.assign\` shape, with \`TestUser(id)\` as the handle side and \`TestUser.create()\` as the
  creator. The current world reaches the builder through \`AsyncLocalStorage\` — the ambient-context
  trick from the previous post. Cross-builder cycles (tenant needs quiz, quiz needs tenant) are
  broken with lazy imports.
- **Rollback instead of cleanup.** The world wraps each test in a database transaction that rolls
  back when the test ends. Builders never delete anything; no builder has cleanup code at all.
- **Two backends, one fixture set.** The custom \`test()\` runs the same body once per configured
  database, so identical builder calls exercise the in-memory store and real Postgres.
- **Richer handles.** Handles grow \`update\`, \`archive()\`, and relationship helpers like
  \`admin.grantRoleTo(tenant, "admin")\` — a builder method that takes another builder's handle.
- **Stories, not just tests.** The same builders drive Storybook. Tests override minimally, so setup
  reads as specification; stories override maximally (\`title: "Badge Summit 2026"\`, real dates,
  real names), so screens read as product. One factory serves both:
`;

ts`
const space = await tenant.space({
  title: "Spring Workshop",
  slug: "spring-workshop",
  summary: "A prior space with people who can be copied into another space.",
});
`;

md`
The scale numbers are the evidence that this holds up: nineteen builders, about 1,200 builder-create
call sites across 137 test files, and no faker anywhere — uniqueness is counters, and a lint rule
bans nondeterministic calls repo-wide. Setup ceremony per test has stayed flat as the schema has
grown, which is the property I care about most.

## Appendix: the world

Everything the examples depend on, in full. First the app itself — the store and the services. Note
that the services validate foreign keys on create; that validation is what the builders inherit by
going through the front door:
`;

function provideStore() {
  return {
    store: {
      orgs: new Map<string, OrgRow>(),
      users: new Map<string, UserRow>(),
      projects: new Map<string, ProjectRow>(),
      tasks: new Map<string, TaskRow>(),
    },
  };
}
type StoreCtx = ReturnType<typeof provideStore>;

function provideAppServices({ store }: StoreCtx) {
  let nextId = 0;
  const newId = (prefix: string) => `${prefix}_${++nextId}`;

  const mustGet = <T>(map: Map<string, T>, id: string, kind: string): T => {
    const row = map.get(id);
    if (!row) throw new Error(`No such ${kind}: ${id}`);
    return row;
  };

  const orgService = {
    create: async (props: OrgProps) => {
      const row: OrgRow = { id: newId("org"), ...props };
      store.orgs.set(row.id, row);
      return row;
    },
    get: async (id: string) => mustGet(store.orgs, id, "org"),
  };

  const userService = {
    create: async (props: UserProps) => {
      mustGet(store.orgs, props.orgId, "org");
      const row: UserRow = { id: newId("user"), ...props };
      store.users.set(row.id, row);
      return row;
    },
    get: async (id: string) => mustGet(store.users, id, "user"),
  };

  const projectService = {
    create: async (props: ProjectProps) => {
      mustGet(store.orgs, props.orgId, "org");
      const row: ProjectRow = { id: newId("project"), memberIds: [], ...props };
      store.projects.set(row.id, row);
      return row;
    },
    get: async (id: string) => mustGet(store.projects, id, "project"),
    grantAccess: async (projectId: string, userId: string) => {
      mustGet(store.users, userId, "user");
      mustGet(store.projects, projectId, "project").memberIds.push(userId);
    },
    canView: async (userId: string, projectId: string) => {
      const user = mustGet(store.users, userId, "user");
      const project = mustGet(store.projects, projectId, "project");

      if (user.orgId !== project.orgId) return false;
      return project.visibility === "org" || project.memberIds.includes(userId);
    },
  };

  const taskService = {
    create: async (props: TaskProps) => {
      mustGet(store.projects, props.projectId, "project");
      const row: TaskRow = { id: newId("task"), status: "open", ...props };
      store.tasks.set(row.id, row);
      return row;
    },
    get: async (id: string) => mustGet(store.tasks, id, "task"),
    complete: async (id: string) => {
      mustGet(store.tasks, id, "task").status = "done";
    },
  };

  return { orgService, userService, projectService, taskService };
}
type AppServicesCtx = ReturnType<typeof provideAppServices>;

md`
And the machinery from [the previous post](/post/2026-08-04-providers/), with one change:
\`Providers\` now awaits each link, so a chain can contain async providers like \`provideBaseData\`:
`;

import { test as vitestTest } from "vitest";

type Ctx = object;
type MaybePromise<T> = T | Promise<T>;

export function Providers<A extends Ctx>(a: () => MaybePromise<A>): () => Promise<A>;
export function Providers<A extends Ctx, B extends Ctx>(
  a: () => MaybePromise<A>,
  b: (ctx: A) => MaybePromise<B>,
): () => Promise<A & B>;
export function Providers<A extends Ctx, B extends Ctx, C extends Ctx>(
  a: () => MaybePromise<A>,
  b: (ctx: A) => MaybePromise<B>,
  c: (ctx: A & B) => MaybePromise<C>,
): () => Promise<A & B & C>;
export function Providers(
  ...providers: Array<(ctx: object) => MaybePromise<object>>
): () => Promise<object> {
  return async () => {
    let context: object = {};

    for (const provider of providers) {
      context = { ...context, ...(await provider(context)) };
    }

    return context;
  };
}

type AnyProvider = () => MaybePromise<object>;

export function test(name: string, fn: () => void | Promise<void>): void;
export function test<TProvider extends AnyProvider>(
  name: string,
  provider: TProvider,
  fn: (ctx: Awaited<ReturnType<TProvider>>) => void | Promise<void>,
): void;
export function test(
  name: string,
  providerOrFn: AnyProvider | (() => void | Promise<void>),
  fn?: (ctx: object) => void | Promise<void>,
): void {
  if (fn === undefined) {
    vitestTest(name, providerOrFn as () => void | Promise<void>);
    return;
  }

  vitestTest(name, async () => {
    await fn(await (providerOrFn as AnyProvider)());
  });
}

md`
A mock answers "what would the database say?" from inside the test. A builder puts the answer in the
database — through the same door the application uses, with the compiler reading the setup over your
shoulder. Fixture files rot; fixture builders are butter.
`;
