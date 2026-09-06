# AGENTS.md

Operating notes for agents working in this repo. The README covers setup and deployment; this file
covers how to write and what to check.

## Commands

```bash
pnpm turbo validate   # full gate: posts:check, format:check, lint, typecheck, test, build
pnpm turbo dev        # regenerate TypeScript posts and serve Hugo at :1313
pnpm format           # prettier over config, scripts, src, *.post.ts, docs/adr
```

Run `pnpm turbo validate` before every commit. A post is done when validate is green and the prose
passes the checks below.

Fresh worktrees need `git submodule update --init` or Hugo 404s every post while validate stays
green.

## Posts

- Plain posts: `content/post/YYYY-MM-DD-slug.md`.
- Checked posts: `content/post/YYYY-MM-DD-slug.post.ts`. The source is real TypeScript; prose lives
  in `md` template calls. The compiler writes ignored `*.gen.md` siblings for Hugo. Never edit a
  `.gen.md` file.
- Editorial briefs live in `docs/plans/YYYY-MM-DD-slug-outline.md`. Structural changes go through
  the brief first.
- Slugs are hard to change after publish. If one must change, add a Hugo `aliases` entry for the
  old URL.

## Prose style

The blog is one person writing in their own voice for working TypeScript engineers. The reader
knows the domain. The writing should read like a colleague explaining a pattern they use, not like
a model performing expertise. Every rule below exists because the pattern it bans is a known
marker of machine-written text.

### Say it plainly

- State the claim directly. "The shape is simple:" not "The shape of the code is almost
  suspiciously simple:". Hedged intensifiers ("almost suspiciously", "deceptively", "surprisingly",
  "quietly", "genuinely", "honestly", "actually") are the writer winking at the reader. Delete them.
- No mannered prose. Mannered prose substitutes metaphor and flourish for direct statement: "a dial
  worth turning" for "a parameter worth varying", "earns its keep" for "still matters", "rectangles
  conspiring" for "separate rectangles". When a literal phrase is available, use it.
- Do not label your own significance. No "This is the punchline:", "Here's the trick:", "Notice
  what disappeared", "the key insight is". Make the point and let it land.
- No throat-clearing or codas. No "It's worth noting", "In other words", "At its core", "In
  summary". Do not end a paragraph with a sentence that restates it.
- Prefer "is" and "has" over "serves as", "features", "boasts".

### Structure

- Em dashes are the single most recognized tell. Use commas, periods, colons, or parentheses.
  A post should have zero or close to it.
- Avoid the negated contrast ("not X but Y", "not just X, it's Y") unless the rejected alternative
  is something the reader believed. Say the true thing.
- Do not reach for threes. A list of three parallel fragments as a closing line ("One name. One
  schema. One place to look.") is a rhythm models default to. Use it once per blog, not once per
  post.
- No tailing participles that add vague weight ("..., highlighting the importance of").
- Vary sentence and paragraph length. Uniform rhythm reads as extruded.
- Bullets are for real enumerations. Do not convert an argument into "**Bold label.** Sentence."
  lists unless each item is a distinct, parallel thing.
- Headings are plain nouns. No "Caveats, honestly", no questions, no emoji.

### Vocabulary

Never: delve, leverage, robust, seamless, landscape, navigate, harness, foster, crucial, pivotal,
game-changer, elegant, beautifully, unlock, empower, journey, tapestry, "at scale" as decoration.

Prefer the short word: use, not utilize; method, not methodology; so, not "in order to".

### What to keep

- First person and opinions. "I tend not to" and "I like this for" are the voice.
- Named tradeoffs and numbered failure modes.
- Grounded specifics: real counts, real file names, real call sites. Never invent them.
- Contractions.
- Code that carries the argument. Skimmers read only the code blocks; prose says what code cannot.

### Review pass

Before calling a draft done, grep the post for the banned words, the intensifiers, em dashes, and
"not just". Read the opening paragraph and the last paragraph aloud. If either sounds like a
product page or a chatbot, rewrite it.
