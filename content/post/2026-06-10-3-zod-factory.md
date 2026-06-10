+++
author = "Yona Appletree"
title = "A Tiny Zod Factory Pattern"
date = "2026-06-10"
description = "A small TypeScript pattern for keeping runtime schemas, inferred types, and object construction together."
tags = [
  "architecture",
  "typescript",
]
+++

There's a pattern in TypeScript I like for building typed data graphs with a small, fluent interface.

```ts
publish(
  Post({
    title: "A TypeScript data pattern",
    content: document.body.innerText,
    author: Person({ name: "Yona Appletree", email: "yona@photomancer.art" }),
  }),
);

function publish(post: Post) {
  /**/
}
```

The shape of the code is almost suspiciously simple: `Person(...)` makes a person, `Post(...)` makes a post, and the type names line up with the runtime functions. That last part is the trick. In TypeScript, values and types live in different namespaces, so `Post` can be both a factory function and the name of the type it returns.

I also like the naming convention here: `Factory` over `class`. A PascalCase factory gives the call site the weight of a named domain concept without requiring the implementation to become an instance type with a prototype.

You can do this by hand:

```ts
function Person(props: { name: string; email: string }) {
  if (!props.name) throw new Error("Name is required");
  if (!props.email) throw new Error("Email is required");
  return { name: props.name, email: props.email };
}
type Person = ReturnType<typeof Person>;
```

That works, but it gets tedious quickly. You have to keep the input type, the validation logic, the output shape, and the exported type synchronized by discipline. Discipline is not my favorite build tool.

So I usually use Zod and a tiny factory helper:

```ts
import { z } from "zod";

export function ZodFactory<TSchema extends z.ZodTypeAny, TExtra>(
  schema: TSchema,
  extra?: TExtra,
) {
  return Object.assign((params: z.input<TSchema>) => schema.parse(params), {
    schema,
    ...extra,
  }) as {
    (params: z.input<TSchema>): z.output<TSchema>;
    schema: TSchema;
  } & (void extends TExtra ? Record<never, never> : TExtra);
}
```

Now the schema is the source of truth:

```ts
const Person = ZodFactory(
  z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
);
type Person = ReturnType<typeof Person>;

const Post = ZodFactory(
  z.object({
    title: z.string().min(1),
    content: z.string(),
    author: Person.schema,
  }),
);
type Post = ReturnType<typeof Post>;
```

The factory gives you three things in one place:

- `Person(...)` parses unknown-ish input into a validated value.
- `type Person = ReturnType<typeof Person>` gives consumers the runtime output type.
- `Person.schema` keeps the original Zod schema available for composition.

That third part matters more than it looks like it should. Once every domain shape has a `.schema`, nested data stays easy to assemble:

```ts
const Comment = ZodFactory(
  z.object({
    author: Person.schema,
    body: z.string().min(1),
    postedAt: z.date().default(() => new Date()),
  }),
);
type Comment = ReturnType<typeof Comment>;

const comment = Comment({
  author: { name: "Ada", email: "ada@example.com" },
  body: "This is nice.",
});
```

`comment.postedAt` is present in the output type because Zod applied the default. The input type still allows you to omit it. That is exactly the distinction I want the type system to remember for me.

## Why not classes?

TypeScript classes are first-class, built-in, and well-supported. If you like classes and your team already reaches for them comfortably, you can absolutely build a similar API with `new Person(...)`.

I tend not to, for this kind of data.

Plain values compose more quietly than instances. They serialize cleanly, compare predictably, and don't make me wonder which methods, prototype behavior, or `this` binding might matter. Most data transfer objects in an application are not little actors with private lives. They are just validated records crossing boundaries.

The convention I want is class-shaped naming, not class-shaped machinery. `User(...)` reads like "make a user" and `type User` reads like "this is a user." That buys the ergonomic part of classes while keeping the value itself a boring object.

You can wrap a Zod schema in a class constructor:

```ts
function ZodClass<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return class {
    constructor(params: z.input<TSchema>) {
      Object.assign(this, schema.parse(params));
    }
  } as unknown as {
    new (params: z.input<TSchema>): z.output<TSchema>;
    prototype: z.output<TSchema>;
  };
}

const Person = ZodClass(
  z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
);
type Person = InstanceType<typeof Person>;

const person = new Person({ name: "Yona", email: "yona@example.com" });
```

But there is more ceremony, more casting, and not much payoff unless you actually need class behavior. The factory version gives me the part I wanted: a named constructor for plain validated data.

## A few useful edges

The helper also leaves room for domain-specific companion schemas without turning the pattern into a framework. The `extra` argument is copied onto the function:

```ts
const User = ZodFactory(
  z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().min(1),
  }),
  {
    createSchema: z.object({
      email: z.string().email(),
      name: z.string().min(1),
    }),
  },
);

type User = ReturnType<typeof User>;
type CreateUserInput = z.input<typeof User.createSchema>;
```

This is useful when a resource has a full shape, a create shape, and an update shape. The main factory stays the obvious public thing, and the extra schemas stay attached to the same concept.

For error handling, I don't usually add anything to the factory. `User(...)` should throw if constructing a `User` is supposed to be an assertion. If I want recoverable validation, I use the schema directly:

```ts
const result = User.schema.safeParse(input);
```

For async refinements, same idea: use `User.schema.parseAsync(input)`. You could add `.parseAsync` or `.safeParse` wrappers to the returned function, but I prefer keeping the factory tiny until a codebase has a real repeated use case.

## When I reach for it

I like this pattern for API request and response shapes, database rows and resources, configuration objects, fixtures, and domain records that need runtime validation. I don't use it for every local function parameter or component prop. The pattern earns its keep when the same shape crosses a boundary and needs to be both a runtime value and a TypeScript type.

The whole point is modest: make the good path short.

```ts
export const Thing = ZodFactory(z.object({ /* ... */ }));
export type Thing = ReturnType<typeof Thing>;
```

One name. One schema. One place to look.
