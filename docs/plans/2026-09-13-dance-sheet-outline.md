# Outline: the dance-sheet post

Working artifact for the structure of a post about the dance-sheet spike
in the `contra` repo (`spikes/dance-sheet/index.html`, commits fab815d,
3cd7fc1, 521dbf8, all 2026-09-13). This describes the *architecture* of
the piece; prose changes happen in the post itself.

## The story

**Thesis (one sentence):** Put a pen on each of the four roles in a
contra minor set, run the dance, and the ink is the dance: one picture
you can read in a second, and an evening's program becomes ten rows you
can compare at a glance, at the price of a sketch-grade figure library
that gets details wrong, which is the limitation the post has to own in
its first screen.

The payoff is the **gallery**: ten real dances as ten glyphs, then the
same ten as rows on one 64-beat axis, where repetition inside a dance
(A1 = B1 in The Baby Rose) and across an evening (two petronella dances
back to back) is visible without reading a word. The price is that the
pictures come from sixteen hand-written parametric figure functions and
a closure check, not a simulator. Nine of ten dances close exactly; the
tenth (Another Equal Turn, starts in a wave) does not, and the post
shows it rather than hiding it.

**Reader (open, see decisions):** two candidates.

- *A. A contra caller who programs evenings.* Keeps cards, thinks in A1
  A2 B1 B2, has never seen a dance drawn. Not a programmer. Wants to
  know whether a picture can carry what a card carries, and whether an
  evening's shape can be seen rather than remembered. What they do
  after reading: look at their own program and ask which rows would
  look alike.
- *B. An engineer curious about agentic exploration.* Wants the method:
  how a visual idea got tested in an evening by directing a model to
  build a throwaway playground with an approximate model of the domain,
  and what "approximate on purpose" buys and costs.

Recommendation: A is the primary reader and sets the vocabulary; B is
served by one methodology section near the end and by the transparency
note at the top. Writing for B first would put the tooling story ahead
of the dances, and the dances are the reason anyone opens the page.

**The move:** Gallery-first cold open, then a walk through the
projections, then the method, then a ring back to the gallery once the
reader can read it. The cold open is an image, not code: ten glyphs in
a grid with names under them, and one sentence of setup. The nut graf
immediately names what this is not (a simulator) and what it costs
(details may be wrong), so the credibility question is answered before
the reader forms it. Each projection section pairs one image with one
named tradeoff: what this view makes obvious and what it hides. The
program section shows the stacked rows (figure strip over seismograph)
because that stack is the view Yona picked. The methodology section is
where the agentic framing lives, in plain terms: Yona set the question
and the rulings, the model wrote the playground, the figure library is
sixteen functions in minor-set units, the only oracle is whether the
dance closes.

## Grounding (contra repo, 2026-09-13)

- `spikes/dance-sheet/index.html`, 381 lines, one file, no dependencies,
  opens from `file://`. Three commits in one evening.
- Figure library: 16 functions (`balance`, `swing`, `lines`, `circle`,
  `allemande`, `dosido`, `chain`, `hey`, `petronella`, `star`,
  `downHall`, `twirl`, `pass`, `pullBy`, `slide`, `passOcean`), each a
  parametric path in minor-set units (the set is 2×2, band at the top,
  ones face down the hall). Sampled at 8 points per beat.
- Ten dances, figure text from `contra-card/dances.csv`: the six from
  Yona's 2026-06-13 EFS program (The Baby Rose no-chain var, Thursday
  Night Special #1, Another Equal Turn, Butter, Spring Break, Flying
  Flamingos) plus four Portland standards (Heartbeat Contra, Airpants,
  Simplicity Swing, The Nice Combination).
- Closure check: max distance from the expected end position after 64
  beats. Nine dances at 0.00 units; Another Equal Turn at 1.12 (its
  wave figures are stand-ins).
- Known approximations, to be stated in the post: the hey track is a
  lemniscate with a shoulder offset; the courtesy turn is a quarter arc;
  Becket progression recentres the frame after the slide; the wave
  figures are stand-ins.
- Four projections: pen plot (the glyph), march (x = across the set +
  time), seismograph (across and along position against time, two
  lanes), figure strip (one plot per figure, cell width = beats). Plus
  the vision's family-coloured bars as the baseline.
- Program view: rows on a shared 64-beat axis with phrase lines,
  stackable projections, move-name strip under each row, repeat rings
  and collision ticks, print mode.
- Repetition examples the pictures show: The Baby Rose A1 and B1 are
  the same shape (balance and swing, circle left ¾); Spring Break and
  Heartbeat Contra both open with two petronellas; six of ten dances
  have a neighbour swing in A1.
- Precedent on this blog: the contiguous popup post (2026-07-15) carries
  a transparency note and embeds a prototype from `static/examples/`.

## Beat sheet

1. **Cold open: the gallery.** Ten glyphs in a grid, names under them.
   One sentence: "Ten contra dances. Each picture is four dancers and
   64 beats." The reader hits the pictures inside the first screen.
2. **Transparency note and nut graf.** The note (agent-drafted, Yona
   directed and edited, spike code also agent-built under direction).
   Then what the pictures are: pens on the four roles of a minor set.
   What they are not: a simulation. What that costs: figure geometry
   is approximate, one dance visibly does not close. Promise: by the
   end you can read the gallery and an evening's rows.
3. **How a pen plot reads.** One dance large (Butter). Circle, swing,
   hey, chain, each named on the picture. The tradeoff: the glyph is
   the fastest read and the worst at time; you cannot tell A1 from B2.
4. **March.** Same dance, pens marched along x with time. Loops are
   turns, flat stretches are standing still. Tradeoff: the most
   beautiful single-dance picture, and it does not stack.
5. **Seismograph.** Across and along position against time. Tradeoff:
   pure time axis, best at repetition, least like a dance.
6. **Figure strip.** One small plot per figure, width = beats. This is
   the answer to "figures are different lengths". Tradeoff: honest
   lengths and family colour at every beat, but each cell loses the
   whole-dance shape.
7. **The evening.** Ten rows, figure strip stacked over seismograph,
   move names under each. Point at the repetitions the reader can now
   see. This is the payoff beat; the ring closes on the gallery's
   dances.
8. **How it was made.** The agentic framing in plain terms: the
   question, the playground, the sixteen figure functions, the closure
   oracle, the three commits, what was ruled by a human and what by
   the model. The Another Equal Turn failure shown, not described.
9. **What a real version needs.** Traces from an engine instead of a
   hand library, so shapes are right; ends of the set; more dances.
   Pointer to the workbench idea without over-promising.
10. **Try it.** The playground embedded (iframe) with a link to open it
    full size; keys and controls in one line.

## Title and slug candidates

- **"A Contra Dance as One Drawing"** (recommended: names the payoff,
  no jargon, reads as a claim)
- "Pens on a Contra Dance"
- "Ten Contra Dances as Ink"
- "Drawing an Evening of Contra"

Slug: `2026-09-13-dance-as-one-drawing` (recommended) or
`2026-09-13-dance-sheet`. Session slug is `dance-sheet` either way.

## Decisions (2026-09-13)

1. Reader: **A, the contra caller**. The engineer reader gets the
   methodology section and the transparency note.
2. Format: **PNG figures for the gallery and every section, plus one
   iframe embed** of the playground copied to `static/examples/<slug>/`.
3. Title: **"Contra Dance: A Visual Exploration"** (Yona's wording; the
   candidates below were not taken). Slug
   `2026-09-13-contra-dance-visual-exploration`.
4. Naming: **dances and choreographers only.** The post does not say
   which program the six dances came from and names no other people.
5. Transparency note: reuse the popup post's wording plus one sentence
   that the playground itself was agent-built under direction and that
   its figure geometry is approximate. Placed after the gallery image,
   before the nut graf.

## Revision (2026-09-13, after the first draft)

Yona's ruling: readers dislike AI prose, so the post is a gallery, not
an essay. Structure: gallery image, one sentence, transparency note, a
short method section (canvas, pens, sixteen figure functions, closure,
the named approximations, how to read a card), then every dance as one
card image (glyph beside march, seismograph, and figure strip with
names), the program rows, and the playground embed. Prose stays under
about 400 words; per-dance sections are a heading and an image, with a
sentence only where a picture needs one (Another Equal Turn). The
per-projection sections and the ring-composition close from the first
draft were dropped. Beats 3 to 6 and 8 to 9 of the beat sheet collapse
into the method section. The card image comes from the spike's
`?view=card&dance=<i>` capture mode.

**Second pass (2026-09-13):** method section moves to the bottom; the
page opens with the gallery, one sentence, an explicit AI disclosure in
Yona's words (made with Claude Fable 5.1, at Yona's direction, to
explore software that helps callers program dances), then "The dances"
with a two-line note on the four views and the legend.

**Third pass (2026-09-13):** the goal is to show callers the patterns
as fast as possible. No AI mention above the fold; the disclosure (in
Yona's words, naming Claude Fable 5.1 and the purpose) opens the method
section at the end. The intro under "The dances" is two lines.

## Open decisions (as put to Yona, resolved above)

1. **Reader.** A (caller) primary with B (engineer) in the methodology
   section, or B primary. Recommendation: A.
2. **Format.** Plain Markdown post with PNG figures for every section
   (renders, prints, loads fast) plus one iframe embed of the live
   playground near the end, copied into `static/examples/<slug>/` as
   the popup post did. Or images only. Recommendation: images plus one
   embed.
3. **Transparency note.** Reuse the popup post's wording and add one
   sentence that the playground itself was also built by the agent
   under direction and that its figure geometry is approximate.
   Recommendation: yes, and place it before the nut graf, after the
   gallery image, so the gallery still opens the page.
4. **Naming.** The post names Yona's real June program and the
   choreographers on the cards. It does not name callers Yona learns
   from. Recommendation: keep dance and choreographer names, no other
   people.
5. **Title and slug.** See candidates. Recommendation: "A Contra Dance
   as One Drawing", slug `2026-09-13-dance-as-one-drawing`.
