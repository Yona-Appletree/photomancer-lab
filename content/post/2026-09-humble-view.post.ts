import { md, post, ts } from "../../src/ts-post";

post({
  title: "The Humble View: Tests for the Logic, Stories for the Screen",
  date: "2026-09-04",
  description:
    "Service, Ux, View: a three-layer frontend architecture where a feature's logic gets plain unit tests, its components get stories, and both run on the same fake services.",
  tested: true,
  tags: ["architecture", "typescript", "ui"],
});

md`
_This post was written by a bot with my help, for a human who wants to use the idea. If you are an
agent that was sent here by a project's instructions, start at the demo repo's
[AGENTS.md](https://github.com/PhotomancerArt/humble-stack/blob/main/AGENTS.md) instead._

Here is a test of one feature's logic. The feature is the orders screen of a small shipping
dashboard; the flow is cancelling an order. Nothing is rendered and nothing is mocked.
`;

test(
  "cancelling a pending order",
  Providers(
    provideFakeClock,
    provideFakeBackend,
    provideAdmin,
    provideOrders([{ customer: "Radia", status: "pending" }]),
    provideFakeOrderService,
    provideOrdersUx,
  ),
  async ({ ordersUx, orders }) => {
    await ordersUx.dispatch({ kind: "load" });
    const [row] = ordersUx.getState().rows;
    expect(row?.actions.find((a) => a.op.kind === "cancel")?.affordance.status).toBe("available");

    await ordersUx.dispatch({ kind: "cancel", orderId: orders[0]!.id });

    expect(ordersUx.getState().rows[0]?.status).toBe("cancelled");
  },
);

md`
Here is the same flow with the screen attached. This is a Storybook story from the demo repo,
running in your browser right now. It boots the real React page on the same six providers as the
test, and you can click Cancel yourself:

<iframe src="https://photomancerart.github.io/humble-stack/storybook/iframe.html?viewMode=story&id=orders-orderspage--as-admin"
        style="width: 100%; height: 480px; border: 1px solid #8884; border-radius: 8px; background: #fff;"
        loading="lazy"
        title="OrdersPage story: as admin"></iframe>

<p style="text-align: right; font-size: 0.9em;">
  <a href="https://photomancerart.github.io/humble-stack/storybook/?path=/story/orders-orderspage--as-admin" target="_blank">open in Storybook ↗</a>
  · <a href="https://github.com/PhotomancerArt/humble-stack/blob/main/packages/feat-orders/src/view/OrdersPage.stories.tsx" target="_blank">story source</a>
</p>

Look at what is absent. The test has no DOM: no React Testing Library, no \`vi.mock\`, no \`msw\`.
It reads the feature's state off a plain object. The story has no backend: no server, no network
mocks, no fixture JSON. Both run on the same fake services, built by the same provider chain, and
every rule about what the user may do lives in one object that both of them reach.

The arrangement is three layers per feature. A **Service** is the port to the outside: an interface,
a real implementation, a fake, and one contract suite run against both. A **Ux** is a framework-free
object that owns its services, accepts commands, and emits a data-only state. A **View** is a React
component of \`{ state, dispatch }\` that renders, dispatches, and decides nothing. The Ux gets
ordinary unit tests. The View gets stories. This is the humble object from Feathers and Fowler, with
a proof on each side of the seam.

The price is a naming convention, a four-line React adapter, and the discipline of keeping the View
humble. There is no state-management library in it.

This post is for the TypeScript engineer with a React app where logic lives in hooks, data loading
happens in effects, and "testing the UI" means React Testing Library plus \`msw\` handlers copied
into every story. It builds on [Providers](/post/2026-08-04-providers/) and
[Fixture Builders](/post/2026-08-04-fixture-builders/) and reuses their provider chain and their
three-argument \`test()\` without re-explaining them. The pattern is the union of two production
codebases that each have half of it; the whole of it is a public demo,
[PhotomancerArt/humble-stack](https://github.com/PhotomancerArt/humble-stack): the **humble stack**,
a frontend stack built around this idea and named after it, with a
[live dashboard](https://photomancerart.github.io/humble-stack/) and a
[Storybook](https://photomancerart.github.io/humble-stack/storybook/). The compiled code in this
post is a self-contained miniature of the demo's orders feature. Like every example on this page, it
compiled and ran before the page was built; the repo is the full-scale reference.

## Why you can't write these today

The usual React feature has a shape. Data loads in an effect, the rules live in a hook, and the
decisions happen in JSX:
`;

ts`
function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const { user } = useSession();

  useEffect(() => {
    void fetch("/api/orders")
      .then((res) => res.json())
      .then(setOrders);
  }, []);

  const act = async (id: string, verb: "cancel" | "refund") => {
    await fetch(\`/api/orders/\${id}/\${verb}\`, { method: "POST" });
    setOrders(await (await fetch("/api/orders")).json());
  };

  return {
    orders,
    cancel: (id: string) => act(id, "cancel"),
    refund: (id: string) => act(id, "refund"),
    isAdmin: user.role === "admin",
  };
}

function OrdersTable() {
  const { orders, cancel, refund, isAdmin } = useOrders();

  return orders.map((order) => (
    <tr key={order.id}>
      <td>{order.customer}</td>
      <td>{order.status}</td>
      <td>
        <button
          disabled={order.status !== "pending"}
          onClick={() => window.confirm("Cancel this order?") && cancel(order.id)}
        >
          Cancel
        </button>
        {isAdmin && order.status === "delivered" && (
          <button onClick={() => refund(order.id)}>Refund</button>
        )}
      </td>
    </tr>
  ));
}
`;

md`
It works, and it ships. Then:

1. The rules are only reachable through the DOM. "Cancel only while pending" is a \`disabled\` prop.
   To test it you render the table, find the button, and read an attribute.
2. Every story needs its own network. The hook fetches in an effect, so a story of \`OrdersTable\`
   needs \`msw\` handlers for \`/api/orders\`, and each story's data lives inside its handlers.
3. The same rule lives in several components. \`isAdmin\` is computed in the hook, combined with a
   status in the JSX, and checked again on the detail page. When the rule changes, you grep.
4. Nothing is reusable outside React. A CLI, an agent, or a second framework cannot cancel an order
   without the hook, and the hook cannot run without a component.

The cold open is the negative image. The rule lives in the Ux, once. The test reads it as data. The
story renders it without a network. The same object would serve a CLI.

## The Service layer

The orders feature reaches the outside through one interface. Refusals come back as values, so the
Ux can explain them instead of catching them:
`;

type Role = "admin" | "agent";
type Session = { role: Role };
type OrderStatus = "pending" | "shipped" | "delivered" | "cancelled" | "refunded";

interface Order {
  id: string;
  customer: string;
  totalCents: number;
  status: OrderStatus;
}

type BackendError = { code: "not_found" | "invalid_state" | "forbidden"; message: string };
type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: BackendError };

/** The orders feature's port to the outside. Http talks to the backend; Fake is the backend. */
interface OrderService {
  list(): Promise<Order[]>;
  get(id: string): Promise<Order | undefined>;
  cancel(id: string): Promise<ServiceResult<Order>>;
  refund(id: string): Promise<ServiceResult<Order>>;
}
type OrderMethod = keyof OrderService;

interface AuthService {
  current(): Promise<Session>;
}

md`
There are two implementations. \`HttpOrderService\` calls the backend's routes through a
fetch-shaped function; it is in the appendix. \`FakeOrderService\` is the backend without the
network. In the demo, \`packages/backend\` is the backend, simulated in TypeScript (domain,
in-memory store, rules, routes), and the fake calls it directly. What the fake adds is a script, so
a test or a story can set latency or make the next call fail:
`;

function FakeOrderService({
  backend,
  script,
}: {
  backend: Backend;
  script: FakeScript<OrderMethod>;
}): OrderService {
  const refused = (error: BackendError): ServiceResult<Order> => ({ ok: false, error });

  return {
    list: () => script.run("list", () => backend.orders.list()),
    get: (id) => script.run("get", () => backend.orders.get(id)),
    cancel: (id) => script.run("cancel", () => backend.orders.cancel(id), refused),
    refund: (id) => script.run("refund", () => backend.orders.refund(id), refused),
  };
}

/** The fake, and its script so the test or story can change the weather. */
function provideFakeOrderService({ backend, clock }: BackendCtx & { clock: Clock }) {
  const ordersScript = FakeScript<OrderMethod>(clock);
  return { orderService: FakeOrderService({ backend, script: ordersScript }), ordersScript };
}

md`
The providers post covered \`provide*\` functions, so only the new part needs saying: the fake's
provider hands its script back to the world as \`ordersScript\`, the way the recording logger in
that post handed back its messages.

A fake you trust is a fake you have tested. The contract suite is one function of a world, written
once against the interface:
`;

function describeOrderService(
  name: string,
  world: () => Promise<{ orderService: OrderService; backend: Backend }>,
) {
  describe(`OrderService: ${name}`, () => {
    test("cancel: pending → cancelled", world, async ({ orderService, backend }) => {
      const order = await TestOrder(backend).create({ status: "pending" });

      expect(await orderService.cancel(order.id)).toMatchObject({
        ok: true,
        value: { status: "cancelled" },
      });
      expect((await order.get()).status).toBe("cancelled");
    });

    test("cancel: shipped → invalid_state", world, async ({ orderService, backend }) => {
      const order = await TestOrder(backend).create({ status: "shipped" });

      expect(await orderService.cancel(order.id)).toMatchObject({
        ok: false,
        error: { code: "invalid_state" },
      });
    });

    test("refund as agent → forbidden", world, async ({ orderService, backend }) => {
      await backend.session.setRole("agent");
      const order = await TestOrder(backend).create({ status: "delivered" });

      expect(await orderService.refund(order.id)).toMatchObject({
        ok: false,
        error: { code: "forbidden" },
      });
    });

    test("refund as admin after delivery → refunded", world, async ({ orderService, backend }) => {
      await backend.session.setRole("admin");
      const order = await TestOrder(backend).create({ status: "delivered" });

      expect(await orderService.refund(order.id)).toMatchObject({
        ok: true,
        value: { status: "refunded" },
      });
    });

    test("unknown id → not_found", world, async ({ orderService }) => {
      expect(await orderService.cancel("ord-none")).toMatchObject({
        ok: false,
        error: { code: "not_found" },
      });
    });
  });
}

md`
It runs twice: once against the fake, and once against \`HttpOrderService\` over the backend's
routes answering in-process, with no port:
`;

describeOrderService(
  "Fake",
  Providers(provideFakeClock, provideFakeBackend, provideFakeOrderService),
);

describeOrderService(
  "Http over in-process routes",
  Providers(provideBackend, provideInProcessHttp, provideOrderService),
);

md`
The fake is proven equivalent to the real thing on every rule the suite names, instead of assumed to
be. When the backend grows a rule, the suite grows a case, and both implementations have to pass it.
The demo runs the same kind of suite for its auth service and its shipment service.

## The Ux layer

The Ux accepts ops. An op is a command as plain data, and it is the only thing a View is allowed to
send:
`;

type OrdersOp =
  | { kind: "load" }
  | { kind: "cancel"; orderId: string }
  | { kind: "refund"; orderId: string }
  | { kind: "dismissNotice" };

md`
It emits state. State is the read model: serializable, complete, no functions. Each row carries its
actions, and an action is an op paired with what the Ux has to say about it:
`;

/**
 * The semantic availability of an op. The Ux reports what is true: the op is available, it is
 * disabled for a reason, the user is not allowed, or it does not apply. The surface decides how to
 * present each one. No presentation words live here.
 */
type Affordance =
  | { status: "available" }
  | { status: "disabled"; reason: string; progress?: { label: string } }
  | { status: "forbidden"; reason: string }
  | { status: "unavailable" };

function available(): Affordance {
  return { status: "available" };
}
function disabled(reason: string, progress?: { label: string }): Affordance {
  return progress ? { status: "disabled", reason, progress } : { status: "disabled", reason };
}
function forbidden(reason: string): Affordance {
  return { status: "forbidden", reason };
}
function unavailable(): Affordance {
  return { status: "unavailable" };
}

/** An op the user may perform, with its affordance and label. `confirm` is presentation data. */
type Action<Op> = {
  op: Op;
  label: string;
  affordance: Affordance;
  destructive?: boolean;
  confirm?: { title: string; body: string; confirmLabel: string };
};
type OrdersAction = Action<OrdersOp>;

type OrderRow = {
  id: string;
  customer: string;
  total: string;
  status: OrderStatus;
  actions: OrdersAction[];
};

/** The read model the orders Ux emits: serializable, complete, no functions. */
type OrdersState = {
  phase: "loading" | "ready" | "error";
  rows: OrderRow[];
  notice?: { tone: "error" | "info"; message: string };
};

md`
The store underneath is twenty lines. The Ux interface is the store plus \`dispatch\`:
`;

interface UxStore<S> {
  getState: () => S;
  subscribe: (listener: () => void) => () => void;
}

function UxStore<S>(initial: S): UxStore<S> & { setState: (next: S) => void } {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    setState: (next) => {
      if (Object.is(next, state)) return;
      state = next;
      for (const listener of [...listeners]) listener();
    },
  };
}

type DispatchResult =
  | { ok: true }
  | { ok: false; reason: "forbidden" | "disabled" | "unavailable" | "failed"; message: string };

/** A Ux owns its services, emits a data-only State, and accepts Ops. */
interface Ux<State, Op> extends UxStore<State> {
  dispatch: (op: Op) => Promise<DispatchResult>;
}

md`
And here is the orders Ux, in full. It takes its two services from the context, keeps the orders and
the role as private state, and projects them into \`OrdersState\` on every change:
`;

type OrdersUxCtx = { orderService: OrderService; auth: AuthService };

/**
 * The orders feature's logic, all of it: which ops apply to which order for whom, what happens
 * while one is in flight, and how the backend's refusals come back as notices. Framework-free.
 */
function OrdersUx({ orderService, auth }: OrdersUxCtx): Ux<OrdersState, OrdersOp> {
  const store = UxStore<OrdersState>({ phase: "loading", rows: [] });

  let orders: Order[] = [];
  let role: Role = "agent";
  let phase: OrdersState["phase"] = "loading";
  let notice: OrdersState["notice"];
  const inFlight = new Map<string, "cancel" | "refund">();

  function publish() {
    const rows = orders.map(toRow);
    store.setState(notice ? { phase, rows, notice } : { phase, rows });
  }

  function toRow(order: Order): OrderRow {
    return {
      id: order.id,
      customer: order.customer,
      total: usd.format(order.totalCents / 100),
      status: order.status,
      actions: [cancelAction(order), refundAction(order)],
    };
  }

  function cancelAction(order: Order): OrdersAction {
    const base = {
      op: { kind: "cancel", orderId: order.id } as const,
      label: "Cancel",
      destructive: true,
      confirm: {
        title: `Cancel order ${order.id}?`,
        body: `${order.customer} will be notified. This cannot be undone.`,
        confirmLabel: "Cancel order",
      },
    };
    if (inFlight.get(order.id) === "cancel") {
      return { ...base, affordance: disabled("Cancelling", { label: "Cancelling…" }) };
    }
    if (order.status !== "pending") {
      return { ...base, affordance: disabled("Only pending orders can be cancelled") };
    }
    return { ...base, affordance: available() };
  }

  function refundAction(order: Order): OrdersAction {
    const base = { op: { kind: "refund", orderId: order.id } as const, label: "Refund" };
    if (role !== "admin") return { ...base, affordance: forbidden("Admins only") };
    if (inFlight.get(order.id) === "refund") {
      return { ...base, affordance: disabled("Refunding", { label: "Refunding…" }) };
    }
    if (order.status !== "delivered" && order.status !== "cancelled") {
      return { ...base, affordance: unavailable() };
    }
    return { ...base, affordance: available() };
  }

  async function load(): Promise<DispatchResult> {
    phase = "loading";
    publish();
    try {
      [orders, { role }] = await Promise.all([orderService.list(), auth.current()]);
      phase = "ready";
      publish();
      return { ok: true };
    } catch (error) {
      phase = "error";
      notice = { tone: "error", message: `Could not load orders: ${describeError(error)}` };
      publish();
      return { ok: false, reason: "failed", message: describeError(error) };
    }
  }

  async function refetch(orderId: string) {
    const fresh = await orderService.get(orderId);
    orders = fresh
      ? orders.map((o) => (o.id === orderId ? fresh : o))
      : orders.filter((o) => o.id !== orderId);
    publish();
  }

  async function mutate(
    op: Extract<OrdersOp, { kind: "cancel" | "refund" }>,
  ): Promise<DispatchResult> {
    const row = store.getState().rows.find((r) => r.id === op.orderId);
    const action = row?.actions.find((a) => a.op.kind === op.kind);
    const affordance = action?.affordance ?? unavailable();
    if (affordance.status !== "available") {
      const message = "reason" in affordance ? affordance.reason : "Not applicable";
      return { ok: false, reason: affordance.status, message };
    }

    inFlight.set(op.orderId, op.kind);
    publish();
    try {
      const result = await (op.kind === "cancel"
        ? orderService.cancel(op.orderId)
        : orderService.refund(op.orderId));
      inFlight.delete(op.orderId);
      if (result.ok) {
        orders = orders.map((o) => (o.id === result.value.id ? result.value : o));
        publish();
        return { ok: true };
      }
      notice = { tone: "error", message: result.error.message };
      await refetch(op.orderId);
      return {
        ok: false,
        reason: result.error.code === "forbidden" ? "forbidden" : "failed",
        message: result.error.message,
      };
    } catch (error) {
      inFlight.delete(op.orderId);
      notice = { tone: "error", message: describeError(error) };
      publish();
      return { ok: false, reason: "failed", message: describeError(error) };
    }
  }

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    dispatch: (op) => {
      switch (op.kind) {
        case "load":
          return load();
        case "cancel":
        case "refund":
          return mutate(op);
        case "dismissNotice":
          notice = undefined;
          publish();
          return Promise.resolve({ ok: true });
      }
    },
  };
}
type OrdersUx = ReturnType<typeof OrdersUx>;

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/** The last link of an orders world. */
function provideOrdersUx(ctx: OrdersUxCtx) {
  return { ordersUx: OrdersUx(ctx) };
}

md`
Read \`cancelAction\` and \`refundAction\` again. Every rule about what the user may do to an order
is in those two functions, once. Then read \`mutate\`: on dispatch, the Ux re-reads the affordance
it last published and refuses without calling the service if it is not available, so a stale View
cannot make it do what the state said it could not. When the backend refuses anyway, the refusal
becomes a notice and the row is refetched.

The demo's version has one more thing, an event-bus subscription, so that a shipment delivered in
the other feature refreshes its order here and a role switch recomputes the affordances. It is the
same file with a \`dispose\`.

Now the tests. They have the cold open's shape, and they need no DOM because the state is data:
`;

const asAgent = Providers(
  provideFakeClock,
  provideFakeBackend,
  provideAgent,
  provideOrders([
    { customer: "Radia", status: "pending" },
    { customer: "Ada", status: "shipped" },
    { customer: "Grace", status: "delivered" },
  ]),
  provideFakeOrderService,
  provideOrdersUx,
);

const asAdmin = Providers(
  provideFakeClock,
  provideFakeBackend,
  provideAdmin,
  provideOrders([
    { customer: "Radia", status: "pending" },
    { customer: "Ada", status: "shipped" },
    { customer: "Grace", status: "delivered" },
    { customer: "Lin", status: "cancelled" },
  ]),
  provideFakeOrderService,
  provideOrdersUx,
);

function affordance(ctx: { ordersUx: OrdersUx }, row: number, kind: OrdersOp["kind"]) {
  return ctx.ordersUx.getState().rows[row]?.actions.find((a) => a.op.kind === kind)?.affordance;
}

test("cancel is available only while pending", asAgent, async (ctx) => {
  await ctx.ordersUx.dispatch({ kind: "load" });

  expect(affordance(ctx, 0, "cancel")).toEqual({ status: "available" });
  expect(affordance(ctx, 1, "cancel")).toEqual({
    status: "disabled",
    reason: "Only pending orders can be cancelled",
  });
});

test("refund is forbidden for agents, with the reason", asAgent, async (ctx) => {
  await ctx.ordersUx.dispatch({ kind: "load" });

  expect(affordance(ctx, 2, "refund")).toEqual({ status: "forbidden", reason: "Admins only" });
});

test("refund is available to admins after delivery or cancellation", asAdmin, async (ctx) => {
  await ctx.ordersUx.dispatch({ kind: "load" });

  expect(affordance(ctx, 0, "refund")).toEqual({ status: "unavailable" });
  expect(affordance(ctx, 1, "refund")).toEqual({ status: "unavailable" });
  expect(affordance(ctx, 2, "refund")).toEqual({ status: "available" });
  expect(affordance(ctx, 3, "refund")).toEqual({ status: "available" });
});

test(
  "dispatch re-validates: a disabled op is refused without calling the service",
  asAgent,
  async ({ ordersUx, orders, backend }) => {
    await ordersUx.dispatch({ kind: "load" });

    const result = await ordersUx.dispatch({ kind: "cancel", orderId: orders[1]!.id });

    expect(result).toEqual({
      ok: false,
      reason: "disabled",
      message: "Only pending orders can be cancelled",
    });
    expect((await backend.orders.get(orders[1]!.id))?.status).toBe("shipped");
  },
);

test(
  "while an op is in flight its action is disabled with progress",
  asAgent,
  async ({ ordersUx, orders, ordersScript, clock }) => {
    await ordersUx.dispatch({ kind: "load" });
    ordersScript.latencyMs = 100;

    const cancelling = ordersUx.dispatch({ kind: "cancel", orderId: orders[0]!.id });
    await clock.settle();

    expect(ordersUx.getState().rows[0]?.actions[0]?.affordance).toEqual({
      status: "disabled",
      reason: "Cancelling",
      progress: { label: "Cancelling…" },
    });

    await clock.advance(100);
    expect(await cancelling).toEqual({ ok: true });
    expect(ordersUx.getState().rows[0]?.status).toBe("cancelled");
  },
);

test(
  "the backend's refusal becomes a notice and the row is refetched",
  asAdmin,
  async ({ ordersUx, orders, backend }) => {
    await ordersUx.dispatch({ kind: "load" });
    // The UI still shows refund as available; the server no longer agrees.
    await backend.session.setRole("agent");

    const result = await ordersUx.dispatch({ kind: "refund", orderId: orders[2]!.id });

    expect(result).toMatchObject({ ok: false, reason: "forbidden" });
    expect(ordersUx.getState().notice).toEqual({
      tone: "error",
      message: "Only admins can refund orders",
    });
    expect(ordersUx.getState().rows[2]?.status).toBe("delivered");

    await ordersUx.dispatch({ kind: "dismissNotice" });
    expect(ordersUx.getState().notice).toBeUndefined();
  },
);

test(
  "a scripted service failure becomes a notice",
  asAgent,
  async ({ ordersUx, orders, ordersScript }) => {
    await ordersUx.dispatch({ kind: "load" });
    ordersScript.failNext("cancel", {
      code: "invalid_state",
      message: "Order changed on the server",
    });

    const result = await ordersUx.dispatch({ kind: "cancel", orderId: orders[0]!.id });

    expect(result).toEqual({ ok: false, reason: "failed", message: "Order changed on the server" });
    expect(ordersUx.getState().notice?.message).toBe("Order changed on the server");
    expect(ordersUx.getState().rows[0]?.status).toBe("pending");
  },
);

test("state is data", asAdmin, async ({ ordersUx }) => {
  await ordersUx.dispatch({ kind: "load" });

  expect(JSON.parse(JSON.stringify(ordersUx.getState()))).toEqual(ordersUx.getState());
  expect(ordersUx.getState().rows[0]?.total).toBe("$42.00");
});

md`
Two worlds, a three-line helper, and each rule gets a test the size of the rule. The in-flight test
holds the fake open with a scripted latency and a fake clock. The failure test scripts the fake's
next call. The refusal test switches the backend's role after the Ux has loaded. None of them render
anything, and an agent can run the whole file in a loop without a browser.

## Actions are data

An affordance has four states, and the split between them is the part of this pattern I care most
about.

\`available\` means the op will go through. \`disabled\` means it applies but cannot run now, with a
reason; an in-flight op is a disabled one with a progress label. \`forbidden\` means this user may
not, with a reason. \`unavailable\` means the op does not apply to this row. The Ux reports which
one is true. The surface decides how each looks: a refund the user may not perform is a locked
button in Dispatch, it could be hidden in another product, and the Ux would not change.

Confirmation is presentation too. The cancel action carries \`confirm\`; the button asks and
dispatches on yes; the Ux never models a pending confirmation.

One rule keeps this honest: no action field exists without a renderer and a story that honors it.
Both production codebases behind this post grew action metadata that nothing rendered: an enablement
enum here, a short label there, a hidden predicate no surface read. A field no renderer consumes is
a lie the type system will not catch. So the demo has one renderer, \`ActionButton\` in \`ui-app\`,
and its \`All States\` story is the proof:
`;

ts`
/**
 * An Action, rendered. This is where the default surface decides how each affordance looks:
 *
 * - available:   an enabled button (destructive variant when the action says so).
 * - disabled:    a disabled button; the reason on hover and in aria-description; in-flight
 *                progress replaces the label.
 * - forbidden:   a disabled button with a lock and the reason. The user learns what they lack.
 * - unavailable: nothing. The op does not apply, so the surface omits it.
 *
 * confirm is presentation: the button opens a ConfirmDialog and dispatches on confirm.
 */
export function ActionButton<Op>(props: { action: Action<Op>; onDispatch: (op: Op) => void }) {
  const { action } = props;
  const { affordance } = action;
  const [confirming, setConfirming] = useState(false);

  if (affordance.status === "unavailable") return null;

  const dispatch = () => props.onDispatch(action.op);

  if (affordance.status === "available") {
    return (
      <>
        <Button
          variant={action.destructive ? "destructive" : "outline"}
          data-affordance="available"
          onClick={action.confirm ? () => setConfirming(true) : dispatch}
        >
          {action.label}
        </Button>
        {action.confirm && (
          <ConfirmDialog open={confirming} onOpenChange={setConfirming} {...action.confirm} onConfirm={dispatch} />
        )}
      </>
    );
  }

  const progress = affordance.status === "disabled" ? affordance.progress : undefined;
  return (
    <Tooltip content={affordance.reason}>
      <Button disabled aria-description={affordance.reason} data-affordance={affordance.status}>
        {affordance.status === "forbidden" && <LockIcon aria-hidden />}
        {progress ? <InlineProgress label={progress.label} /> : action.label}
      </Button>
    </Tooltip>
  );
}
`;

md`
<iframe src="https://photomancerart.github.io/humble-stack/storybook/iframe.html?viewMode=story&id=app-actionbutton--all-states"
        style="width: 100%; height: 400px; border: 1px solid #8884; border-radius: 8px; background: #fff;"
        loading="lazy"
        title="ActionButton story: all states"></iframe>

<p style="text-align: right; font-size: 0.9em;">
  <a href="https://photomancerart.github.io/humble-stack/storybook/?path=/story/app-actionbutton--all-states" target="_blank">open in Storybook ↗</a>
  · <a href="https://github.com/PhotomancerArt/humble-stack/blob/main/packages/ui-app/src/action/ActionButton.tsx" target="_blank">source</a>
</p>

One more check happens before anything runs. A world that cannot build the Ux does not compile, so a
test or a story with a missing service fails at the type level:
`;

// @ts-expect-error A world without an order service cannot build the orders Ux.
Providers(provideFakeClock, provideFakeBackend, provideOrdersUx);

md`
## The View layer

React meets the Ux in one hook. This is the entire adapter:
`;

ts`
export function useUx<S, Op>(ux: Ux<S, Op>) {
  const state = useSyncExternalStore(ux.subscribe, ux.getState, ux.getState);
  return { state, dispatch: ux.dispatch };
}
`;

md`
The View is a function of \`{ state, dispatch }\`. It has no import from \`service/\`, none from the
auth service, and no \`if\` about the domain. Its one lookup table maps a status to a color, which
is presentation:
`;

ts`
const tone: Record<OrderStatus, StatusTone> = {
  pending: "neutral",
  shipped: "info",
  delivered: "success",
  cancelled: "warning",
  refunded: "danger",
};

/** Renders OrdersState, dispatches OrdersOps, decides nothing. */
export function OrdersView({ state, dispatch }: { state: OrdersState; dispatch: (op: OrdersOp) => void }) {
  const columns: Column<OrderRow>[] = [
    { key: "id", header: "Order", cell: (row) => <span className="font-mono">{row.id}</span> },
    { key: "customer", header: "Customer", cell: (row) => row.customer },
    { key: "total", header: "Total", cell: (row) => row.total },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge tone={tone[row.status]}>{row.status}</StatusBadge>,
    },
    {
      key: "actions",
      header: "",
      cell: (row) => <ActionBar actions={row.actions} onDispatch={dispatch} />,
    },
  ];

  return (
    <ListLayout title="Orders" description="Cancel while pending; refund once delivered.">
      {state.notice && (
        <Notice tone={state.notice.tone} onDismiss={() => dispatch({ kind: "dismissNotice" })}>
          {state.notice.message}
        </Notice>
      )}
      {state.phase === "loading" && state.rows.length === 0 ? (
        <InlineProgress label="Loading orders…" />
      ) : (
        <DataTable rows={state.rows} columns={columns} rowKey={(row) => row.id} />
      )}
    </ListLayout>
  );
}
`;

md`
\`ActionBar\` is a row of \`ActionButton\`s. The View does not know what an affordance means; it
hands each row's actions to the one component that does. The Page is the one place React and the Ux
touch:
`;

ts`
export function OrdersPage({ ordersUx }: { ordersUx: OrdersUx }) {
  const { state, dispatch } = useUx(ordersUx);

  useEffect(() => {
    void dispatch({ kind: "load" });
  }, [dispatch]);

  return <OrdersView state={state} dispatch={dispatch} />;
}
`;

md`
Because the View takes state as a prop, its stories are hand-built states, and every state of the
screen is one click away without a backend:
`;

ts`
const meta = {
  title: "orders/OrdersView",
  component: OrdersView,
  args: { dispatch: fn(), state: sampleStates.readyAsAdmin },
} satisfies Meta<typeof OrdersView>;

export const Loading: Story = { args: { state: sampleStates.loading } };
export const ReadyAsAgent: Story = { args: { state: sampleStates.readyAsAgent } };
export const InFlight: Story = { args: { state: sampleStates.inFlight } };
export const LoadFailed: Story = { args: { state: sampleStates.loadFailed } };
`;

md`
The demo's \`sampleStates\` has seven of these, including the ones that are hard to reach by
clicking: a cancel in flight, a load that failed.

## Page stories

The component stories prove the View renders every state. The page stories prove the whole feature
works on the screen, and they start from the test's world:
`;

ts`
// The same chain the cold-open Ux test uses; only the last link renders.
const asAdmin = Providers(
  provideFakeClock,
  provideFakeBackend(),
  provideAdmin,
  provideOrders(demoOrders),
  provideFakeOrderService,
  provideOrdersUx,
);

function Booted({ world }: { world: typeof asAdmin }) {
  return (
    <World provider={world} fallback={<InlineProgress label="Booting world…" />}>
      {({ ordersUx }) => <OrdersPage ordersUx={ordersUx} />}
    </World>
  );
}

const meta = {
  title: "orders/OrdersPage",
  component: Booted,
  args: { world: asAdmin },
} satisfies Meta<typeof Booted>;

export const AsAdmin: Story = { name: "As admin" };

export const TestCancelPendingOrder: Story = {
  name: "Test: cancel a pending order",
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByTestId("orders-status-ord-1001")).toHaveTextContent("pending");

    await userEvent.click(await canvas.findByTestId("orders-cancel-ord-1001"));
    await userEvent.click(await screen.findByTestId("orders-cancel-ord-1001-confirm-confirm"));

    await waitFor(() =>
      expect(canvas.getByTestId("orders-status-ord-1001")).toHaveTextContent("cancelled"),
    );
  },
};
`;

md`
\`World\` runs a provider chain once and renders its children with the context. It is the story-side
twin of \`test(name, world, fn)\`. The play test then clicks through the flow the cold-open test
dispatched, and CI runs it in a real browser. Here it is, running:

<iframe src="https://photomancerart.github.io/humble-stack/storybook/iframe.html?viewMode=story&id=orders-orderspage--test-cancel-pending-order"
        style="width: 100%; height: 480px; border: 1px solid #8884; border-radius: 8px; background: #fff;"
        loading="lazy"
        title="OrdersPage story: test, cancel a pending order"></iframe>

<p style="text-align: right; font-size: 0.9em;">
  <a href="https://photomancerart.github.io/humble-stack/storybook/?path=/story/orders-orderspage--test-cancel-pending-order" target="_blank">open in Storybook ↗</a>
  · <a href="https://github.com/PhotomancerArt/humble-stack/blob/main/packages/feat-orders/src/view/OrdersPage.stories.tsx" target="_blank">story source</a>
</p>

Scroll back to the top. Every line of the test is now code you have read, and the story is the same
six providers with a page rendered over the last one. Two proofs, one set of fakes: the Ux test says
the rules are right, the page story says the screen shows them, and neither needed a mock.

## Features and boundaries

Dispatch has two features, orders and shipments, and they never import each other. A delivered
shipment changes its order's status; that rule runs in the backend, \`feat-shipments\` publishes
\`shipment.delivered\` on a shared bus, and \`feat-orders\` refetches the order. The packages are
the boundaries, so a violation is a build failure rather than a review comment:

~~~text
packages/
  ux-core/        the pattern: Providers, test(), UxStore, Ux, Affordance, Action, EventBus, Clock;
                  ux-core/react: useUx, World
  ui-design/      Tailwind theme and tokens
  ui-base/        shadcn/ui primitives; never imports ux-core
  ui-app/         the app's common language: DataTable, StatusBadge, ActionButton, ActionBar, Notice
  backend/        the simulated backend: domain, store, rules, routes; testing/: builders and worlds
  app-core/       AuthService, HttpClient, DispatchEvent; testing/: provideFakeBackend
  feat-orders/    service/ ux/ view/ testing/
  feat-shipments/ same shape
apps/
  api/            node server mounting the routes
  dashboard/      Vite + React; two composition roots: over the network, or routes in the browser
  storybook/      every package's stories, plus the full-app story
~~~

Arrows mean "may import":

~~~text
ui-design ← ui-base ← ui-app ← feat-* → app-core → ux-core
                       ↑ ux-core         ↑ backend (fakes, routes, worlds)
apps → feat-*, ui-app, app-core, backend, ux-core
~~~

Each package's tests run alone. The deployed dashboard is the real app over the real HTTP services,
with the backend's routes mounted in the browser, so GitHub Pages serves it with no server. The
full-app story does the same inside Storybook:

<iframe src="https://photomancerart.github.io/humble-stack/storybook/iframe.html?viewMode=story&id=dispatch-dispatch--default"
        style="width: 100%; height: 600px; border: 1px solid #8884; border-radius: 8px; background: #fff;"
        loading="lazy"
        title="Dispatch: the full app in Storybook"></iframe>

<p style="text-align: right; font-size: 0.9em;">
  <a href="https://photomancerart.github.io/humble-stack/" target="_blank">open the dashboard ↗</a>
  · <a href="https://photomancerart.github.io/humble-stack/storybook/?path=/story/dispatch-dispatch--default" target="_blank">open in Storybook ↗</a>
</p>

The humble view is one of the stack's nine decisions. The others, providers and worlds, builders,
component layers, feature modules, are in the humble stack's
[README](https://github.com/PhotomancerArt/humble-stack#readme), each in the same shape: the
problem, the decision, what it replaces, where the idea comes from, and what it costs. The layering
itself is
[ADR 0001](https://github.com/PhotomancerArt/humble-stack/blob/main/docs/adr/0001-service-ux-view-layers.md).

## Provenance

Neither production codebase behind this post has the whole pattern. Each has a different half, and
the demo is the union.

LightPlayer, a Rust and Dioxus desktop app of mine, has the Ux layer, named and tested. Its studio
surfaces own the device link and expose UI-independent view DTOs and typed actions; 30 end-to-end
tests drive the real effects layer over a scripted fake device, in a crate with about 1150 tests.
Its stories, though, render hand-built DTO fixtures. No story boots a Ux on fakes, so the screen and
the logic are proven separately and nothing proves they agree. That is the gap this demo's page
stories close, and a to-do for LightPlayer.

The SaaS monorepo behind the earlier posts has the other half. Its full-page stories boot the app on
a memory database through a provider chain, run the real server load inside the real context, and
render the real page; 49 of its 439 stories work this way, and its query layer has memory and
Postgres implementations that pass the same tests. It has no Ux layer. Page logic lives in load
functions and components, and its action type is a presentation DTO with callbacks. Adding a Ux
there is a refactor, because the worlds already exist.

The naming came from both. LightPlayer's split between a typed controller op and a UI action held
up; the monorepo's single action type with callbacks did not. The demo keeps \`Op\` and \`Action\`
as separate words for that reason.

## For agents and teams

I built the demo instead of writing the pattern up from memory because I wanted one place to point
at, for people and for coding agents, that says where each kind of code goes. The repo's
[AGENTS.md](https://github.com/PhotomancerArt/humble-stack/blob/main/AGENTS.md) is that place: a
table of where code goes, the naming vocabulary, the dependency rule, and the rules as a checklist:

- The View decides nothing. No domain \`if\` in JSX; if a View needs a fact, the Ux puts it in
  State.
- State is data. It must survive \`JSON.parse(JSON.stringify(s))\`.
- Every rule lives in the Ux, once, with a test.
- Re-validate on dispatch.
- No action field without a renderer and a story that honors it.
- Confirmation is presentation; progress is data.
- Authorization twice: the Ux computes \`forbidden\` so the UI can explain, the backend enforces.
- Every service ships a fake, a real implementation, and one contract suite run against both.
- Ux tests and page stories share worlds.

To add a feature, copy \`feat-orders\`, rename by the table, and write the contract suite first. An
agent with that file can build a feature in a test loop without opening a browser, then prove the
screen in a story. That is the payoff past the tests: the view is humble so that everything else can
be tested.

## Appendix: the world

Everything the examples depend on, in full. First the simulated backend. It owns the rules, the way
\`packages/backend\` does in the demo, and both implementations of \`OrderService\` end up here:
`;

interface Backend {
  orders: {
    list(): Promise<Order[]>;
    get(id: string): Promise<Order | undefined>;
    create(input: Omit<Order, "id">): Promise<Order>;
    cancel(id: string): Promise<ServiceResult<Order>>;
    refund(id: string): Promise<ServiceResult<Order>>;
  };
  session: {
    get(): Promise<Session>;
    setRole(role: Role): Promise<void>;
  };
}

function Backend(): Backend {
  const rows = new Map<string, Order>();
  let session: Session = { role: "agent" };

  const fail = (code: BackendError["code"], message: string): ServiceResult<Order> => ({
    ok: false,
    error: { code, message },
  });
  const save = (order: Order): ServiceResult<Order> => {
    rows.set(order.id, order);
    return { ok: true, value: order };
  };

  return {
    orders: {
      list: async () => [...rows.values()],
      get: async (id) => rows.get(id),
      create: async (input) => {
        const order = { id: `ord-${1000 + rows.size + 1}`, ...input };
        rows.set(order.id, order);
        return order;
      },
      cancel: async (id) => {
        const order = rows.get(id);
        if (!order) return fail("not_found", `No such order: ${id}`);
        if (order.status !== "pending") {
          return fail(
            "invalid_state",
            `Order ${id} is ${order.status}; only pending orders can be cancelled`,
          );
        }
        return save({ ...order, status: "cancelled" });
      },
      refund: async (id) => {
        const order = rows.get(id);
        if (!order) return fail("not_found", `No such order: ${id}`);
        if (session.role !== "admin") return fail("forbidden", "Only admins can refund orders");
        if (order.status !== "delivered" && order.status !== "cancelled") {
          return fail(
            "invalid_state",
            `Order ${id} is ${order.status}; only delivered or cancelled orders can be refunded`,
          );
        }
        return save({ ...order, status: "refunded" });
      },
    },
    session: {
      get: async () => session,
      setRole: async (role) => {
        session = { role };
      },
    },
  };
}

function provideBackend() {
  return { backend: Backend() };
}
type BackendCtx = ReturnType<typeof provideBackend>;

/** The fake world's foundation: the simulated backend and a fake auth service over its session. */
function provideFakeBackend() {
  const { backend } = provideBackend();
  const auth: AuthService = { current: () => backend.session.get() };
  return { backend, auth };
}

md`
The real implementation, and the routes it talks to. \`backendRoutes\` returns a fetch-shaped
function; the demo's version is a Hono app, and the api server, the browser build, and the contract
test all mount the same one:
`;

type Fetch = (path: string, init?: { method?: string }) => Promise<Response>;

function HttpOrderService({ http }: { http: Fetch }): OrderService {
  return {
    list: () => readJson<Order[]>(http("/orders")),
    get: async (id) => {
      const res = await http(`/orders/${id}`);
      return res.status === 404 ? undefined : readJson<Order>(Promise.resolve(res));
    },
    cancel: (id) => readResult<Order>(http(`/orders/${id}/cancel`, { method: "POST" })),
    refund: (id) => readResult<Order>(http(`/orders/${id}/refund`, { method: "POST" })),
  };
}

async function readJson<T>(response: Promise<Response>): Promise<T> {
  const res = await response;
  if (!res.ok) throw new Error(`${res.status} from the backend`);
  return (await res.json()) as T;
}

async function readResult<T>(response: Promise<Response>): Promise<ServiceResult<T>> {
  const res = await response;
  return res.ok
    ? { ok: true, value: (await res.json()) as T }
    : { ok: false, error: (await res.json()) as BackendError };
}

function backendRoutes(backend: Backend): Fetch {
  const json = (body: unknown, status = 200) => Response.json(body, { status });
  const statusOf: Record<BackendError["code"], number> = {
    not_found: 404,
    invalid_state: 409,
    forbidden: 403,
  };

  return async (path, init) => {
    const method = init?.method ?? "GET";
    const [, resource, id, verb] = path.split("/");
    if (resource !== "orders") return json({ message: "no route" }, 404);

    if (method === "GET" && id === undefined) return json(await backend.orders.list());
    if (method === "GET" && id !== undefined && verb === undefined) {
      const order = await backend.orders.get(id);
      return order
        ? json(order)
        : json({ code: "not_found", message: `No such order: ${id}` }, 404);
    }
    if (method === "POST" && id !== undefined && (verb === "cancel" || verb === "refund")) {
      const result = await backend.orders[verb](id);
      return result.ok ? json(result.value) : json(result.error, statusOf[result.error.code]);
    }
    return json({ message: "no route" }, 404);
  };
}

function provideInProcessHttp({ backend }: BackendCtx) {
  return { http: backendRoutes(backend) };
}

function provideOrderService({ http }: { http: Fetch }) {
  return { orderService: HttpOrderService({ http }) };
}

md`
The fake's script and the fake clock. The script waits on the clock, so a test can hold a call open
and watch the state while it is in flight:
`;

interface Clock {
  sleep(ms: number): Promise<void>;
}

/** What a fake service does besides call the backend: wait, and fail on cue. */
interface FakeScript<Method extends string> {
  latencyMs: number;
  failNext(method: Method, error: BackendError): void;
  run<T>(method: Method, call: () => Promise<T>, onError?: (error: BackendError) => T): Promise<T>;
}

function FakeScript<Method extends string>(clock: Clock): FakeScript<Method> {
  let scripted: { method: Method; error: BackendError } | undefined;

  const script: FakeScript<Method> = {
    latencyMs: 0,
    failNext: (method, error) => {
      scripted = { method, error };
    },
    run: async (method, call, onError) => {
      if (script.latencyMs > 0) await clock.sleep(script.latencyMs);
      if (scripted?.method === method) {
        const { error } = scripted;
        scripted = undefined;
        if (onError) return onError(error);
        throw new Error(error.message);
      }
      return call();
    },
  };
  return script;
}

function provideFakeClock() {
  let now = 0;
  const timers: Array<{ at: number; fire: () => void }> = [];
  const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  const clock = {
    sleep: (ms: number) => new Promise<void>((fire) => void timers.push({ at: now + ms, fire })),
    /** Lets every pending promise chain run without moving time. */
    settle: flush,
    /** Moves time forward and fires every timer that comes due. */
    advance: async (ms: number) => {
      now += ms;
      for (const timer of timers.filter((t) => t.at <= now)) {
        timers.splice(timers.indexOf(timer), 1);
        timer.fire();
        await flush();
      }
    },
  };
  return { clock };
}

md`
The builder and the world links, from the fixture-builders post. \`TestOrder\` creates through the
backend's own create path and returns a live handle; \`provideOrders\` composes it as a provider:
`;

const testStrCounters = new Map<string, number>();

function testStr(prefix: string): string {
  const count = testStrCounters.get(prefix) ?? 0;
  testStrCounters.set(prefix, count + 1);
  return `${prefix}-${count}`;
}

type OrderSpec = Partial<Omit<Order, "id">>;
type OrderHandle = { id: string; get: () => Promise<Order> };

function TestOrder(backend: Backend) {
  const byId = (id: string): OrderHandle => ({
    id,
    get: async () => {
      const order = await backend.orders.get(id);
      if (!order) throw new Error(`Order ${id} no longer exists`);
      return order;
    },
  });

  return Object.assign(byId, {
    create: async (overrides: OrderSpec = {}): Promise<OrderHandle> => {
      const order = await backend.orders.create({
        customer: testStr("customer"),
        totalCents: 4_200,
        status: "pending",
        ...overrides,
      });
      return byId(order.id);
    },
  });
}

/** Creates orders through the builder and hands their handles to the world as `orders`. */
function provideOrders(specs: OrderSpec[]) {
  return async ({ backend }: BackendCtx) => {
    const orders: OrderHandle[] = [];
    for (const spec of specs) orders.push(await TestOrder(backend).create(spec));
    return { orders };
  };
}

async function provideAdmin({ backend }: BackendCtx) {
  await backend.session.setRole("admin");
  return {};
}

async function provideAgent({ backend }: BackendCtx) {
  await backend.session.setRole("agent");
  return {};
}

md`
Finally, the machinery from the earlier posts: \`Providers\` with enough overloads for a six-link
world, and the \`test()\` that takes one. The demo vendors the same code from
[ts-provide](https://github.com/PhotomancerArt/ts-provide) without its ambient context, because
\`AsyncLocalStorage\` is a server-side trick: in the browser a Ux takes its context explicitly,
which is also why the tests read the way they do.
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
export function Providers<
  A extends Ctx,
  B extends Ctx,
  C extends Ctx,
  D extends Ctx,
  E extends Ctx,
>(
  a: () => MaybePromise<A>,
  b: (ctx: A) => MaybePromise<B>,
  c: (ctx: A & B) => MaybePromise<C>,
  d: (ctx: A & B & C) => MaybePromise<D>,
  e: (ctx: A & B & C & D) => MaybePromise<E>,
): () => Promise<A & B & C & D & E>;
export function Providers<
  A extends Ctx,
  B extends Ctx,
  C extends Ctx,
  D extends Ctx,
  E extends Ctx,
  F extends Ctx,
>(
  a: () => MaybePromise<A>,
  b: (ctx: A) => MaybePromise<B>,
  c: (ctx: A & B) => MaybePromise<C>,
  d: (ctx: A & B & C) => MaybePromise<D>,
  e: (ctx: A & B & C & D) => MaybePromise<E>,
  f: (ctx: A & B & C & D & E) => MaybePromise<F>,
): () => Promise<A & B & C & D & E & F>;
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
