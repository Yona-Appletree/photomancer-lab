# ADR: TypeScript-Authored Posts

Date: 2026-06-10

## Status

Accepted

## Context

Some blog posts are code-heavy enough that ordinary Markdown snippets are too easy to let drift. The
blog should support posts where TypeScript examples are checked by the same kind of feedback loop as
application code.

Two source-of-truth options were considered:

- TypeScript files with Markdown prose represented by helper calls.
- Markdown files with TypeScript extracted from marked code fences.

The Markdown-first option preserves normal Markdown authoring, but diagnostics point at generated
files unless extra mapping is added. The TypeScript-first option gives IDE-native inline errors and
clickable diagnostics in the real source file.

## Decision

Use TypeScript as the source of truth for checked posts.

TypeScript-authored posts live beside ordinary posts as `content/post/*.post.ts`. The post compiler
uses `ts-morph` to read those source files semantically and generate ignored sibling files named
`*.gen.md` for Hugo.

The source format uses small no-op helper calls:

```ts
import { md, post, ts } from "../../src/ts-post";

post({
  title: "Tagged Records in TypeScript",
  date: "2026-06-10",
});

md`
Markdown prose goes here.
`;

const value = 1 satisfies number;

ts`
const renderedOnly = "this appears as a TypeScript code block but is not compiled";
`;
```

## Consequences

- The checked source file is ordinary TypeScript, so IDE diagnostics and `tsc` errors point at the
  real authored post.
- Hugo renders generated Markdown, not the TypeScript source.
- Generated Markdown files must be ignored by Git.
- Hugo must ignore `.post.ts` files and read generated `.gen.md` files.
- CI must generate posts before the Hugo build.
- The compiler can use `ts-morph` instead of ad hoc text parsing.
- Render-only TypeScript snippets can use `ts\`...\`` instead of embedding code fences inside
  Markdown strings.
- Repeated front matter fields such as `author` and `url` should be derived by the compiler rather
  than handwritten in each checked post.
