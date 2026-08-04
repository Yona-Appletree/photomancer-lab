import { md, post, ts } from "../../src/ts-post";

post({
  title: "Each Test Declares Its World",
  date: "2026-08-04",
  description:
    "Tests that declare their entire world inline — type-checked, no mocking, no shared fixtures — powered by twenty lines of plain TypeScript instead of a DI framework.",
  tested: true,
  tags: ["architecture", "typescript"],
});

md`
Here is a test from a TypeScript app. Before reading on, notice what it does not need.
`;

test(
  "greets a known user and records the log",
  Providers(
    provideConfig,
    provideRecordingLogger,
    provideUsers([["u7", "Radia"]]),
    provideGreetingService,
  ),
  (ctx) => {
    expect(ctx.greetings.greet("u7")).toBe("Hello, Radia!");
    expect(ctx.messages).toEqual(["greeted Radia"]);
  },
);

md`
There is no \`vi.mock\` and no module interception. There is no \`beforeEach\`, no shared fixture
state, no container, no decorators. The test's second argument declares its entire world — real
greeting service, a recording logger, a user store with exactly one user — and the body receives
that world, fully typed. A different world is a different chain. If the world is missing something
the service needs, the test does not fail at runtime; it fails to compile.

That test is not pseudocode. Like every example in this post, it compiled and ran before this page
was built.

This post is for the TypeScript engineer — often with a Next.js app — who has no dependency
injection and a growing sense that tests are harder than they should be. The usual advice at that
point is to adopt a DI framework: decorators, containers, tokens, module scanning. The price here is
different: about twenty lines of plain TypeScript, shown in full by the end. I have been running
this pattern in a production monorepo for a while now, and the extracted core lives in
[ts-provide](https://github.com/PhotomancerArt/ts-provide). By the end of the post you will be able
to read — and own — every line behind the opening example.

## Why you can't write this test today

Most apps without DI share a shape. Each piece of infrastructure is a module-level singleton, and
everything imports it directly:
`;

ts`
// lib/db.ts
export const db = new Database(process.env.DATABASE_URL!);

// lib/mailer.ts
import { db } from "./db";

export async function sendWelcomeEmail(userId: string) {
  const user = await db.users.find(userId);
  // ...
}
`;

md`
This is fine right up until it isn't:

1. Construction happens at import time. Importing a module boots infrastructure, and initialization
   order becomes an emergent property of the import graph.
2. Configuration is read wherever \`process.env\` happens to be handy, so there is no one place to
   see what the app actually needs.
3. Tests have to intercept module loading. \`vi.mock("./db")\` works, but it is stringly-typed,
   hoisted by magic, and coupled to file paths.
4. There is no seam for running two configurations in the same process: one test with a fake clock
   and one without, two tenants, a preview environment.

The opening test needs the opposite of all four: construction on demand, config as a value, fakes
swapped in by ordinary code, and as many independent worlds per process as there are tests.

## The core idea

A provider is just a function that receives the context built so far and returns more context.
`;

interface Logger {
  info(message: string): void;
}

function provideConfig() {
  return {
    config: {
      appName: "shipping-dashboard",
      greetingPrefix: "Hello",
    },
  };
}
type ConfigCtx = ReturnType<typeof provideConfig>;

function provideLogger({ config }: ConfigCtx): { logger: Logger } {
  return {
    logger: {
      info: (message) => console.log(`[${config.appName}] ${message}`),
    },
  };
}
type LoggerCtx = ReturnType<typeof provideLogger>;

md`
That is the whole trick. Dependencies are function parameters. Output is a plain object. The context
type is derived with \`ReturnType\`, so there is no schema to maintain by hand.

If you know React, this is the same mental model as context and props, applied to the server side of
your app: context flows down, and each piece declares what it consumes.

Composition does not even need a helper. It is object spread:
`;

const configCtx = provideConfig();
const loggerCtx = provideLogger(configCtx);
const manualContext = { ...configCtx, ...loggerCtx };

test("manual composition is just object spread", () => {
  expect(manualContext.config.appName).toBe("shipping-dashboard");
  expect(typeof manualContext.logger.info).toBe("function");
});

md`
## Composing chains

Spreading by hand gets repetitive, so the first piece of machinery is a \`Providers\` helper that
folds a list of providers into a single context-building function. The full implementation is at the
end of the post; it is about twenty lines of runtime code.

Two more providers make the example honest — a user store and the greeting service from the opening
test, which depends on three earlier pieces of context:
`;

interface UserStore {
  findName(id: string): string | undefined;
}

function provideUserStore(): { users: UserStore } {
  const names = new Map([
    ["u1", "Ada"],
    ["u2", "Grace"],
  ]);

  return {
    users: {
      findName: (id) => names.get(id),
    },
  };
}
type UserStoreCtx = ReturnType<typeof provideUserStore>;

function provideGreetingService({ config, users, logger }: ConfigCtx & UserStoreCtx & LoggerCtx) {
  return {
    greetings: {
      greet(userId: string): string {
        const name = users.findName(userId) ?? "stranger";
        logger.info(`greeted ${name}`);
        return `${config.greetingPrefix}, ${name}!`;
      },
    },
  };
}

md`
The application context is the chain of all four:
`;

const appProvider = Providers(
  provideConfig,
  provideLogger,
  provideUserStore,
  provideGreetingService,
);
export type AppContext = ReturnType<typeof appProvider>;

test("the app chain wires everything", () => {
  const ctx = appProvider();

  expect(ctx.greetings.greet("u1")).toBe("Hello, Ada!");
  expect(ctx.greetings.greet("u404")).toBe("Hello, stranger!");
});

md`
Chains are providers too, so a base context can be extended instead of repeated:
`;

const baseProvider = Providers(provideConfig, provideLogger);
const fullProvider = Providers(baseProvider, provideUserStore, provideGreetingService);

test("provider chains compose", () => {
  expect(fullProvider().greetings.greet("u2")).toBe("Hello, Grace!");
});

md`
## What the types enforce

The wiring is checked. Each provider can only depend on keys produced earlier in the chain, and
TypeScript enforces the order. These are the mistakes the pattern is meant to catch, written as
expected type failures in this post's checked source:
`;

// @ts-expect-error A provider cannot run before its dependencies exist.
Providers(provideLogger);

// @ts-expect-error Order matters: the logger needs config before it runs.
Providers(provideLogger, provideConfig);

// @ts-expect-error The greeting service needs the user store and logger, not just config.
Providers(provideConfig, provideGreetingService);

md`
There is no container to misconfigure and no token to forget to register. A wiring mistake is a
compile error at the call site, pointing at the provider that is missing its inputs.

## Assembling the opening test

Everything needed to reconstruct the test at the top of this post is now in reach. Three pieces
remain: two fakes and the \`test()\` function itself.

Fakes are providers too, and they can hand their inspection handles back through the context. The
recording logger from the opening example returns the logger _and_ the list it records into:
`;

function provideRecordingLogger(): { logger: Logger; messages: string[] } {
  const messages: string[] = [];

  return {
    logger: { info: (message) => void messages.push(message) },
    messages,
  };
}

md`
And because providers are plain functions, a parameterized fake is a function that returns a
provider:
`;

function provideUsers(entries: Array<[id: string, name: string]>) {
  const names = new Map(entries);

  return (): { users: UserStore } => ({
    users: { findName: (id) => names.get(id) },
  });
}

md`
### A \`test()\` that takes a world

Vitest's \`test\` takes a name and a function. Ours also accepts a provider between them — it builds
the context and hands it to the test body:
`;

import { test as vitestTest } from "vitest";

type AnyProvider = () => object;

export function test(name: string, fn: () => void | Promise<void>): void;
export function test<TProvider extends AnyProvider>(
  name: string,
  provider: TProvider,
  fn: (ctx: ReturnType<TProvider>) => void | Promise<void>,
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
    await fn((providerOrFn as AnyProvider)());
  });
}

md`
The two-argument form passes through untouched, so this is a drop-in replacement for the framework's
\`test\` — every test in this post, including the plain ones above, runs through it.

That is the whole apparatus. Scroll back to the opening example: the chain, the fakes, the typed
context — every line of it is now code you have read. Swapping an implementation is editing the
world, not reaching into module internals. And shared setup is not a \`beforeEach\` mutating outer
variables — it is a base chain that tests extend:
`;

const quietWorld = Providers(provideConfig, provideRecordingLogger);

test(
  "worlds compose like any other chain",
  Providers(quietWorld, provideUsers([]), provideGreetingService),
  (ctx) => {
    expect(ctx.greetings.greet("nobody")).toBe("Hello, stranger!");
    expect(ctx.messages).toEqual(["greeted stranger"]);
  },
);

md`
A test with a broken world does not fail at runtime somewhere inside the body — the chain itself
refuses to compile:
`;

// @ts-expect-error A test world that forgets the user store does not compile.
Providers(provideConfig, provideRecordingLogger, provideGreetingService);

md`
Notice what quietly disappeared. There is no module mocking and nothing keyed by file paths. There
is no shared mutable fixture state, so tests stay independent and safe to parallelize. And there is
no setup split across \`beforeAll\` and \`beforeEach\` hooks — the world a test runs in is named,
whole, at the top of the test.

The production version of this helper is about forty lines. It adds \`.skip\` and \`.only\`, options
passthrough, and one trick that earns its keep: it can run the same test body once per configured
database backend, each pass building the chain with a different database provider. A migration test
that works on every supported backend is a loop over worlds, not a copied file. Scoped fakes — fake
timers, transactions rolled back after each test — become wrappers, which are covered below.

## Where it grows

The twenty-line helper below is deliberately minimal: synchronous providers, explicit context
passing. The production version of this pattern, extracted as
[ts-provide](https://github.com/PhotomancerArt/ts-provide), adds the pieces a real app ends up
wanting:

**Async providers and ambient context.** Providers can be async, and \`runWithProvider\` runs a
function inside a context scope backed by \`AsyncLocalStorage\`, so deep call stacks can reach the
current context without threading a parameter through every layer:
`;

ts`
await runWithProvider(
  appProvider,
  async () => {
    await handleRequest();
  },
  undefined,
);

function handleRequest(ctx: AppContext = providerCtx<AppContext>()) {
  ctx.logger.info("handling request");
}
`;

md`
The default-parameter idiom keeps functions honest: callers may inject a context explicitly (tests
often do), and everything else picks up the ambient one.

**Wrappers.** Some dependencies are not values but scopes — a database transaction, middleware, fake
timers. A \`Wrapper\` is a provider that controls the execution scope around the rest of the chain:
`;

ts`
const TransactionWrapper = Wrapper<DbCtx, TransactionCtx>(async (fn, { db }) => {
  await db.transaction(async (tx) => {
    await fn({ tx });
  });
});
`;

md`
**Disposal.** Providers can return \`Symbol.dispose\` or \`Symbol.asyncDispose\`, and the chain
collects them and runs them in reverse order when the scope exits. Cleanup lives next to creation:
`;

ts`
function provideConnection() {
  const connection = openConnection();

  return {
    connection,
    [Symbol.asyncDispose]: async () => {
      await connection.close();
    },
  };
}
`;

md`
## A note on Next.js

On the server side — route handlers, server actions, RSC — this all works today, because that code
runs in Node where \`AsyncLocalStorage\` is real. Build the app chain once per process, or per
request when you want request-scoped values, and run handlers inside it.

In the browser there is no equivalent primitive, so I treat this as a composition pattern first:
client components already have React context, and the provider pattern covers what module singletons
cover today — services, clients, config. The
[ts-provide](https://github.com/PhotomancerArt/ts-provide) README is honest about the limits of its
browser shim.

## Provenance

This is not a hypothetical pattern. It is extracted from a production SaaS monorepo where a few
hundred files build or consume provider contexts. Every database migration there ships with a test
that runs in its own provider chain against its own context; test suites compose fakes the same way
the app composes services. The ceremony has stayed flat as the app has grown, which is the property
I care about most.

If you like the pattern, read the source of
[ts-provide](https://github.com/PhotomancerArt/ts-provide) — \`src/providers.ts\`,
\`src/provider-context.ts\`, \`src/wrapper.ts\`, and the \`examples/hextime\` app — and copy the
ideas that fit. The pattern is small enough that owning the code is often the better move than
installing it.

## The helper

Here is the minimal \`Providers\` used by this post. The overloads carry the chain's accumulated
context type from one provider to the next; the runtime is a fold over object spread.
`;

type Ctx = object;

export function Providers<A extends Ctx>(a: () => A): () => A;
export function Providers<A extends Ctx, B extends Ctx>(a: () => A, b: (ctx: A) => B): () => A & B;
export function Providers<A extends Ctx, B extends Ctx, C extends Ctx>(
  a: () => A,
  b: (ctx: A) => B,
  c: (ctx: A & B) => C,
): () => A & B & C;
export function Providers<A extends Ctx, B extends Ctx, C extends Ctx, D extends Ctx>(
  a: () => A,
  b: (ctx: A) => B,
  c: (ctx: A & B) => C,
  d: (ctx: A & B & C) => D,
): () => A & B & C & D;
export function Providers(...providers: Array<(ctx: object) => object>): () => object {
  return () => {
    let context: object = {};

    for (const provider of providers) {
      context = { ...context, ...provider(context) };
    }

    return context;
  };
}

md`
Add overloads as your chains grow, or generate them; the production version supports async
providers, wrappers, and disposal with the same shape.

Dependency injection is a good idea that got buried under frameworks. In TypeScript, the good idea
is available on its own — a provider is just a function, and each test declares its world.
`;
