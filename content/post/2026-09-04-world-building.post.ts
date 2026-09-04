import { md, post } from "../../src/ts-post";

post({
  title: "World Building: Test Actors for Test-Driven TypeScript",
  date: "2026-09-04",
  description:
    "Declare who is acting as part of every test's world, give fixture builders a system principal tests cannot name, and authorization becomes a property every ordinary test checks for free. The actor half of testing without mocks.",
  tested: true,
  tags: ["architecture", "typescript"],
});

md`
Here is a test of an access rule, in the task tracker from the previous post. Two things in it are
new.
`;

test(
  "a private project is visible to granted members and invisible to outsiders",
  Providers(
    TestWorld,
    provideBaseData,
    ActingAs(({ member }) => member),
  ),
  async ({ org, member, outsider, projectService }) => {
    const project = await org.project({ visibility: "private" });
    await project.grantAccess(member);

    await expect(projectService.get(project.id)).resolves.toMatchObject({ visibility: "private" });
    await expect(outsider.withAuth(() => projectService.get(project.id))).rejects.toThrow(NotFound);
  },
);

md`
The first new thing is the last link in the chain: \`ActingAs(({ member }) => member)\`. The world
now declares who is running the test, and \`projectService.get\` is checking. The second is
\`outsider.withAuth(...)\`, which runs one call as somebody else. Everything else you have read
before — the chain is from [Providers](/post/2026-08-04-providers/), the rows come from
[Fixture Builders](/post/2026-08-04-fixture-builders/) — and, like every example on this page, it
compiled and ran before the page was built.

Now look at the two setup lines. \`org.project(...)\` and \`project.grantAccess(member)\` are
builder calls, and they ran while the ambient actor was a member who, until that grant, was not
allowed to see the project. The builders did not run as the member. Holding that line — builders
never act as the test's actor, tests can never act as the builders — is most of this post.

## Who is running your tests?

This post exists because of a disagreement. A friend who reviews pull requests at a storage
infrastructure company read the fixture post and asked the obvious question: you build all that test
data through the production code path? Sure, I said, though it matters less than it sounds — what
matters is which states the fixtures can reach — and whatever you do, you want auth disabled while
they run.

Then he described their suite. Every test runs as a user with global permissions, unless the test
says otherwise. It works. Permissions have their own test files.

My instinct went the other way: run every test as the least-privileged actor that could plausibly be
making the call, so that authorization is tested for free. It is part of the world.

That sentence named something the first two posts had skipped. The providers post let a test declare
its _environment_ — services, fakes, config. The fixture post let it declare its _data_. Both posts
quietly ran every test as nobody in particular, and the app under test never noticed, because it
never asked. Every request in production carries a third thing besides an environment and data: who
is asking. A world is all three.

## The global-permissions default, examined

Running tests as an omnipotent user is the fixture file of authorization. It fails the same two
ways.

1. **Authorization is tested only where someone remembered.** A behavior test as an admin exercises
   the behavior and skips the check. A permission regression — a rule that starts returning
   \`true\`, a route that forgets to call it — passes every test that was not written specifically
   about permissions. Those are almost all of the tests.
2. **The fix that occurs first is inline setup again.** Once you notice, the reflex is to sprinkle
   \`loginAs(user)\` into tests as they come up. Now the actor is spelled out in some tests and
   defaulted in others, and the default is the privileged one — the same disease the fixture post
   diagnosed, wearing a new coat: the setup that matters most is the setup nobody wrote down.

The cold open is the negative image of both. The actor is declared once, in the chain, next to the
store and the builders. A test that does not mention permissions is nonetheless running as an
ordinary member, through the real check, every time.

## The app grows an authorize step

The task tracker from the fixture post — orgs contain users and projects, projects contain tasks,
projects are org-visible or \`private\` to granted members — now enforces that rule instead of
merely reporting it. Every service call reads the ambient principal, and refuses in one of two ways:
`;

class NotFound extends Error {}
class AccessDenied extends Error {}

type Actor = { kind: "anonymous" } | { kind: "user"; userId: string };
type Principal = Actor | typeof system;

const anonymous: Actor = { kind: "anonymous" };

function provideAuth() {
  return { auth: { current: anonymous as Principal } };
}
type AuthCtx = ReturnType<typeof provideAuth>;

md`
\`Principal\` has one more member than \`Actor\`: \`system\`, a constant from the appendix at the
end of this post. Nothing in the context is typed \`system\`; the context holds a cell whose default
is \`anonymous\`, and anonymous fails closed.

The check itself is ordinary code. Here is the one the cold open runs into, with the refusals it
chooses between:
`;

function requireUser(store: Store, principal: Principal): UserRow | typeof system {
  if (principal === system) return system;
  if (principal.kind === "anonymous") throw new AccessDenied("Not signed in");
  return mustGet(store.users, principal.userId, "user");
}

function visibleProject(store: Store, principal: Principal, projectId: string): ProjectRow {
  const who = requireUser(store, principal);
  const project = mustGet(store.projects, projectId, "project");

  if (who === system) return project;
  if (who.orgId !== project.orgId) throw new NotFound(`No such project: ${projectId}`);
  if (project.visibility === "private" && !project.memberIds.includes(who.id)) {
    throw new AccessDenied(`${who.name} may not view project ${projectId}`);
  }

  return project;
}

md`
Two refusals, and the difference is deliberate. A user from another org gets \`NotFound\` — the
project's existence is itself private. A user in the right org who was not granted access gets
\`AccessDenied\`. A good authorization test states which one it expects; the cold open's outsider
gets \`NotFound\`, and the test says so.

The full services are in the appendix. They are the fixture post's services with this step in front
of each method, backed by the same in-memory store.

## Who do builders run as?

The fixture post never asked. It did not have to: nothing was checking. Now something is, and half
the cold open's setup would be refused if builders ran as the ambient member — \`org.project()\`
creates a project the member cannot yet see, and \`grantAccess\` is a member-only operation on it.

The wrong answer is an "auth off" flag. A flag is a value; a value ends up in a test, and then in a
hundred tests. The answer I hold to is an invariant instead:

> There is no way to turn authorization off. There is a **system principal**, and the only place it
> ever appears is inside a builder's own scope.

Builders shadow the ambient actor with \`system\` for the duration of their work, then put the
test's actor back. The mechanism is a swap with a \`finally\`:
`;

async function shadow<T>(auth: AuthCtx["auth"], principal: Principal, fn: () => Promise<T>) {
  const previous = auth.current;
  auth.current = principal;
  try {
    return await fn();
  } finally {
    auth.current = previous;
  }
}

function asSystem<T>(auth: AuthCtx["auth"], fn: () => Promise<T>) {
  return shadow(auth, system, fn);
}

md`
\`shadow\` is the only function on this page that takes a principal as a parameter, and it is not in
the context — nothing in a test's \`ctx\` can hand it a value. What tests get are two doors built on
top of it, and neither door has a parameter where a principal goes. The first door is the builders.
Here is the project builder from the fixture post, now system-scoped on both sides:
`;

function projectBuilder(ctx: AppServicesCtx & AuthCtx) {
  const { auth, orgService, projectService } = ctx;

  const byId = (id: string) => ({
    id,
    get: () => asSystem(auth, () => projectService.get(id)),
    grantAccess: (user: { id: string }) =>
      asSystem(auth, () => projectService.grantAccess(id, user.id)),
    task: (props: Partial<TaskProps> = {}) => taskBuilder(ctx)({ ...props, projectId: id }),
  });

  return Object.assign(
    (props: Partial<ProjectProps> = {}) =>
      asSystem(auth, async () => {
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
      }),
    { byId },
  );
}

md`
Creating runs as system. So does the handle's \`get()\` — a handle is the test's eyes, not the
actor's, and a test must be able to look at a row its actor is forbidden to fetch. Everything the
builder does happens inside the scope; the moment it returns, the ambient actor is whoever it was.

A builder call in the middle of a test therefore succeeds even when the actor could not have made
it, and the very next line is refused:
`;

test(
  "builders keep working when the actor cannot",
  Providers(
    TestWorld,
    provideBaseData,
    ActingAs(({ outsider }) => outsider),
  ),
  async ({ org, projectService }) => {
    const project = await org.project({ visibility: "private" });

    expect((await project.get()).visibility).toBe("private");
    await expect(projectService.get(project.id)).rejects.toThrow(NotFound);
  },
);

md`
## The actor is provided

Where did the member come from? From the chain, like everything else. \`ActingAs\` is a provider
that picks a user handle out of the context built so far and sets the cell:
`;

function ActingAs<C extends AuthCtx, U extends { id: string }>(pick: (ctx: C) => U) {
  return (ctx: C) => {
    const actor = pick(ctx);
    ctx.auth.current = { kind: "user", userId: actor.id };

    return { actor };
  };
}

md`
It takes a _handle_, not a principal — the actor must be a row that exists, made by a builder
earlier in the chain. The actor is part of the world in the plainest possible sense: it is declared
in the same list as the store, the services, and the data, and a reader finds it the same way, by
reading the chain.

A world that declares no actor is not a world with auth off. It is anonymous, and the app says so:
`;

test("a world with no actor fails closed", TestWorld, async ({ testData, projectService }) => {
  const project = await testData.project();

  await expect(projectService.get(project.id)).rejects.toThrow("Not signed in");
});

md`
That failure is the one you want on the first day. It reads as a missing chain link, and the fix is
to add the link — not to find the flag.

## Switching actors

Most tests have one actor. Access-control tests have two or three, and the fixture post's rule
applies: the second actor should cost one expression, not six lines. The second door is on the user
handle:
`;

function userBuilder(ctx: AppServicesCtx & AuthCtx) {
  const { auth, orgService, userService } = ctx;

  const byId = (id: string) => ({
    id,
    get: () => asSystem(auth, () => userService.get(id)),
    withAuth: <T>(fn: () => Promise<T>) => shadow(auth, { kind: "user", userId: id }, fn),
  });

  return Object.assign(
    (props: Partial<UserProps> = {}) =>
      asSystem(auth, async () => {
        const orgId = props.orgId ?? (await orgService.create({ name: testStr("org") })).id;
        const name = props.name ?? testStr("user");

        return byId(
          (await userService.create({ email: `${name}@example.com`, ...props, name, orgId })).id,
        );
      }),
    { byId },
  );
}

md`
\`withAuth\` is the same \`shadow\` the builders use, pointed at a named user instead of at
\`system\`. One mechanism, two scopes, and the handle already knows the id, so the call site says
only who and what:
`;

test(
  "refusals are precise: forbidden for colleagues, not found for outsiders",
  Providers(
    TestWorld,
    provideBaseData,
    ActingAs(({ member }) => member),
  ),
  async ({ org, outsider, projectService }) => {
    const project = await org.project({ visibility: "private" });
    const colleague = await org.user();

    await expect(colleague.withAuth(() => projectService.get(project.id))).rejects.toThrow(
      AccessDenied,
    );
    await expect(outsider.withAuth(() => projectService.get(project.id))).rejects.toThrow(NotFound);
  },
);

md`
Neither door accepts a principal, so there is no expression a test can write whose value is the
system principal. The compiler holds that line — an expected type failure in this post's checked
source:
`;

test("there is no place to spell the system principal", TestWorld, async () => {
  // @ts-expect-error ActingAs takes a user handle. There is no way to hand it a principal.
  void ActingAs(() => system);
});

md`
One honest caveat: this post is a single file, so \`system\` and \`shadow\` are names in scope. In a
real codebase they live in the builders' module and are not exported, and the property becomes
structural — the type is the fence, the module boundary is the gate.

## What you get for free

Now re-run the fixture post's tests in the new world. Here is its "handles re-read the store" test,
running as a member:
`;

function AsMember() {
  return Providers(
    TestWorld,
    provideBaseData,
    ActingAs(({ member }) => member),
  )();
}

test("handles re-read the store, so they see the app's writes", AsMember, async (ctx) => {
  const task = await (await ctx.org.project()).task();

  await ctx.taskService.complete(task.id); // as the member, through the authorize step

  expect((await task.get()).status).toBe("done");
});

md`
It is one line different from the original: the task is now made through the member's own org
instead of a bare \`testData.task()\`, because a task in a stranger's org is exactly what the member
is not allowed to complete. The old version of the test would fail in this world, and it would be
right to — it was quietly asserting that anybody can complete anything.

That is the payoff working. Every behavior test now traverses the authorize path, so a permission
regression fails tests that were never about permissions. Delete the org check from
\`visibleProject\` and the cold open fails; make \`complete\` forget to authorize and the test above
still passes, but its sibling — an outsider trying the same call — does not:
`;

test("completing someone else's task is refused, not silently ignored", AsMember, async (ctx) => {
  const task = await (await ctx.org.project()).task();

  await expect(ctx.outsider.withAuth(() => ctx.taskService.complete(task.id))).rejects.toThrow(
    NotFound,
  );
  expect((await task.get()).status).toBe("open");
});

md`
There is a quieter payoff underneath, the same one the fixture post found in defaults. The ambient
actor is a declaration. A test that never mentions authorization is on record as expecting _ordinary
member privileges_ to suffice for everything it does. When a test needs more — an admin, a second
actor — that need is written down, in the chain or in a \`withAuth\`, where the next reader will
find it.

## Confession: the production numbers

The monorepo behind this trilogy does not do this yet. It has the parts. Every operation there
validates its input, authorizes, executes, and validates its output; principals are a typed union of
anonymous, root, user, and client; an operation with no principal in scope is unauthenticated and
fails closed. Builders create through real operations as root — \`CreateUserOp.runAsRoot\` — so
builders do run as system. Half of the invariant has been in place since the builders were written.

The other half is not. The canonical test chain ends in \`provideTenantAdminAuth\`: the default
actor is the tenant admin, which is my friend's model, not the one in this post. And of the 322 test
files in the backend library, 57 call \`runAsRoot\` directly in their test bodies. The system
principal leaked out of the builders' scope.

It leaked for a reason worth naming. A per-user chain link existed, but there was no per-call idiom
— no \`withAuth\` on a handle — so a test that needed a second actor for one line had a choice
between six lines of context plumbing and \`runAsRoot\`. Water finds the low point. A convention
without an idiom decays even in the codebase of the person who invented it, and it decays toward
privilege, because privilege is the thing that never throws.

There is a second leak, smaller and more embarrassing: \`runAsRoot\` is documented "use this for
testing," and it is also what production operations call when they need to escalate internally —
archiving a tenant deletes its origins as root. The test escape hatch and the internal-escalation
mechanism share a name, so nothing distinguishes a test that took a shortcut from an operation that
needs one. Naming them apart is part of the repair.

So read this post as the repair, not the origin story. The doctrine is written down because the
erosion proved that it needs an idiom and a lint rule, not a README.

## Lineage

The name "world" for a test's context is old: Cucumber has called its per-scenario context the
\`World\` since its earliest releases. Actors were never in it — it is a bag — but the name survived
because it is the right one, and the question here is only what belongs in the bag.

The version of this pattern that convinced me the actor belongs there is not TypeScript. The
scenario suite for a Rust project of mine builds every story from \`TestWorld::new()\`, and its
nouns include actors: \`td.user()\` is somebody signed in, \`td.visitor()\` somebody who followed a
link without signing in, \`td.invitee()\` an email address with no account behind it yet. An
unauthenticated actor as a fixture noun, one call. Its README states the front-door rule more
sharply than I did: "no scenario can assert about a state the application could not reach."

Databases and platforms arrived at the two-scopes rule on their own. Postgres row-level security is
tested by seeding as a role with \`BYPASSRLS\` and querying as the constrained role. Firebase's
emulator is seeded through the admin SDK, which ignores security rules, and exercised through the
client SDK, which is subject to them. Both separate the principal that makes the world from the
principal that acts in it — the same invariant, enforced by the platform.

The factory_bot lineage never had to ask, because it writes rows straight to the database. The
question only appears once builders refuse to bypass the application, and then it has one good
answer.

## The world is three things

Scroll back to the opening test. Every line is now code you have read. The chain declares a store,
services that check, builders that run as system, a base of data, and an actor. The body creates two
rows through the builders' door, asks one question as the actor, and one more as somebody else.

Across three posts, a test has learned to declare its world: the environment it runs in, the data it
starts with, and the actor it runs as. The world answers for everything the test does not say — and
what the test does not say about authorization is now a claim it is making, checked on every run.

Auth is not a thing you turn off for tests. It is a thing you scope, and the scope is part of the
world.

## Appendix: the world

Everything the examples depend on, in full. The domain and store are the fixture post's:
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
type Store = StoreCtx["store"];

function mustGet<T>(map: Map<string, T>, id: string, kind: string): T {
  const row = map.get(id);
  if (!row) throw new NotFound(`No such ${kind}: ${id}`);
  return row;
}

md`
The system principal. It is a unique symbol, not a flag: nothing else can have its type, it can be
compared against, \`shadow\` can put it in the cell, and that is all:
`;

const system = Symbol("system");

md`
The services. Each method's first line is its authorization; \`requireOrg\` is the org-scoped
sibling of \`visibleProject\`:
`;

function provideAppServices({ store, auth }: StoreCtx & AuthCtx) {
  let nextId = 0;
  const newId = (prefix: string) => `${prefix}_${++nextId}`;

  const requireOrg = (orgId: string) => {
    const who = requireUser(store, auth.current);
    const org = mustGet(store.orgs, orgId, "org");
    if (who !== system && who.orgId !== orgId) throw new NotFound(`No such org: ${orgId}`);
    return org;
  };

  const orgService = {
    create: async (props: OrgProps) => {
      requireUser(store, auth.current);
      const row: OrgRow = { id: newId("org"), ...props };
      store.orgs.set(row.id, row);
      return row;
    },
    get: async (id: string) => requireOrg(id),
  };

  const userService = {
    create: async (props: UserProps) => {
      requireOrg(props.orgId);
      const row: UserRow = { id: newId("user"), ...props };
      store.users.set(row.id, row);
      return row;
    },
    get: async (id: string) => {
      const row = mustGet(store.users, id, "user");
      requireOrg(row.orgId);
      return row;
    },
  };

  const projectService = {
    create: async (props: ProjectProps) => {
      requireOrg(props.orgId);
      const row: ProjectRow = { id: newId("project"), memberIds: [], ...props };
      store.projects.set(row.id, row);
      return row;
    },
    get: async (id: string) => visibleProject(store, auth.current, id),
    grantAccess: async (projectId: string, userId: string) => {
      const project = visibleProject(store, auth.current, projectId);
      const user = mustGet(store.users, userId, "user");
      if (user.orgId !== project.orgId) throw new NotFound(`No such user: ${userId}`);
      project.memberIds.push(userId);
    },
  };

  const taskService = {
    create: async (props: TaskProps) => {
      visibleProject(store, auth.current, props.projectId);
      const row: TaskRow = { id: newId("task"), status: "open", ...props };
      store.tasks.set(row.id, row);
      return row;
    },
    get: async (id: string) => {
      const row = mustGet(store.tasks, id, "task");
      visibleProject(store, auth.current, row.projectId);
      return row;
    },
    complete: async (id: string) => {
      const row = mustGet(store.tasks, id, "task");
      visibleProject(store, auth.current, row.projectId);
      row.status = "done";
    },
  };

  return { orgService, userService, projectService, taskService };
}
type AppServicesCtx = ReturnType<typeof provideAppServices>;

md`
The remaining builders, the counter that names things, and the world itself. \`TestWorld\` gained
one link, \`provideAuth\`, between the store and the services that read it:
`;

const testStrCounters = new Map<string, number>();

function testStr(prefix: string): string {
  const count = testStrCounters.get(prefix) ?? 0;
  testStrCounters.set(prefix, count + 1);
  return `${prefix}-${count}`;
}

function orgBuilder(ctx: AppServicesCtx & AuthCtx) {
  const { auth, orgService } = ctx;

  const byId = (id: string) => ({
    id,
    get: () => asSystem(auth, () => orgService.get(id)),
    project: (props: Partial<ProjectProps> = {}) => projectBuilder(ctx)({ ...props, orgId: id }),
    user: (props: Partial<UserProps> = {}) => userBuilder(ctx)({ ...props, orgId: id }),
  });

  return Object.assign(
    (props: Partial<OrgProps> = {}) =>
      asSystem(auth, async () =>
        byId((await orgService.create({ name: testStr("org"), ...props })).id),
      ),
    { byId },
  );
}

function taskBuilder(ctx: AppServicesCtx & AuthCtx) {
  const { auth, taskService } = ctx;

  const byId = (id: string) => ({
    id,
    get: () => asSystem(auth, () => taskService.get(id)),
  });

  return Object.assign(
    (props: Partial<TaskProps> = {}) =>
      asSystem(auth, async () => {
        const projectId = props.projectId ?? (await projectBuilder(ctx)()).id;

        return byId((await taskService.create({ title: testStr("task"), ...props, projectId })).id);
      }),
    { byId },
  );
}

function provideTestData(ctx: AppServicesCtx & AuthCtx) {
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
  return Providers(provideStore, provideAuth, provideAppServices, provideTestData)();
}

async function provideBaseData({ testData }: TestDataCtx) {
  const org = await testData.org();
  const member = await org.user({ name: "member" });
  const outsider = await testData.user({ name: "outsider" });

  return { org, member, outsider };
}

md`
\`provideBaseData\` is the fixture post's shared-setup-as-a-provider, with the two actors the
examples need: a member of the org, and an outsider whose bare \`testData.user()\` landed them in an
org of their own.

Finally, the machinery from the previous posts — \`Providers\` with one more overload, and the
\`test()\` that takes a world:
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
export function Providers<A extends Ctx, B extends Ctx, C extends Ctx, D extends Ctx>(
  a: () => MaybePromise<A>,
  b: (ctx: A) => MaybePromise<B>,
  c: (ctx: A & B) => MaybePromise<C>,
  d: (ctx: A & B & C) => MaybePromise<D>,
): () => Promise<A & B & C & D>;
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
The ambient actor here is a mutable cell, swapped with a \`finally\`. That is honest for a
single-threaded test body, and each test has its own world and so its own cell. The production
version keeps the principal in \`AsyncLocalStorage\`, the way the providers post keeps everything
else, so that two actors can be live at once across an \`await\` — the mechanism changes, the two
scopes do not.
`;
