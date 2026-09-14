# Outline: the same dances, simulated

Working artifact for the structure of the follow-up to
[Contra Dance: A Visual Exploration](https://lab.photomancer.art/post/2026-09-13-contra-dance-visual-exploration/)
(`content/post/2026-09-13-contra-dance-visual-exploration.md`, merged in
PR #14). The subject is the `contra` repo at
`/Users/yona/dev/personal/contra`, deployed at
<https://yona-appletree.github.io/contra/>. This file describes the
*architecture* of the piece; prose changes happen in the post itself.

Written by the B2 agent, 2026-09-14. **Nothing here is approved yet.** The
Decisions section below carries my lean on every open question; the user
answers them and I rework the post against whatever they say.

## The story

**Thesis (one sentence):** The first post's pictures were drawn by sixteen
hand-written figure functions and a closure check, and a Seattle dancer was
right that the hey in them is wrong; the same dances now come out of a
simulation whose hands have to reach, whose dancers have to clear each
other, and whose hey has four real passes on the counts, and the price is
that only three of that post's ten dances can be drawn this way today.

The payoff is a picture that is **checked**. The first post's method
section had to list its own approximations: the hey was a figure-eight
track, the courtesy turn a quarter arc, becket dances broke the ink where
the square recentred. Every one of those is now a measured property rather
than an apology. The price is coverage: the figure library is 17 figures,
and the dances it can dance are the ten whose Caller's Box entries carry
`Permission: full`, of which three overlap with the first post's ten.

**Reader:** the same primary reader as the first post, now with a history.
A contra dancer or caller in the Seattle community who read the first post
when it was shared to the list, looked at the hey, and thought *that isn't
a hey*. They keep dance cards. They think in A1 A2 B1 B2. They are not a
programmer, and several of them are wary of anything made by a model. What
they should do after reading: open the Moves tab, pick a figure they know
cold, and tell me where the simulation still has it wrong.

The secondary reader is the engineer who wants the method. The first post
served them with one section at the end, and so does this one. I am not
writing the method section to argue with anybody about AI; I am writing it
because a claim like "nobody comes within 8 px of anybody" is only worth
anything with the number attached and the file it is asserted in.

**The move:** a cold open that is a **before and after of one dance**,
Butter, in the first screen, with no preamble: the plate the first post
published, then the plate the simulator draws. The nut graf under it names
the three differences a dancer can see and states the price (three of ten)
in the same breath. Then the hey, because the hey is the complaint that
started this. Then the four things a dancer asked for, each with the plate
that answers it. Then the ten dances. Then which of the old ten are missing
and why. Then method. Ring back at the end to the same Butter plate by
sending the reader to the live page where it moves.

Load-bearing example: **Butter drawn twice.** It is the right dance for the
job because it is one of the three that appear in both posts, it is becket
(so it shows the ink break the first post apologised for, gone), and its B1
is a full 16-beat hey (so it carries the hey complaint inside the cold
open). It exists already: `apps/web/e2e/traces/dances/butter-pen.svg` and
`butter-strip.svg` from `pnpm traces:export`, beside
`/examples/2026-09-13-contra-dance-visual-exploration/img/dance-3.png`,
which is the first post's own published plate and is not edited.

## Beat sheet

1. **Update note.** Dated, visible, above everything. Says this post
   supersedes the first post's pictures and that the first post is left
   standing as published. Job: a reader arriving from the old link knows
   in one line which page is current.
2. **Butter, twice.** The old plate, the new pen plot, the new figure
   strip. Three sentences. Job: the whole argument in the first screen,
   before any claim about method.
3. **What the pictures come out of now.** One paragraph a caller reads:
   a timeline, an arm solver, a progression, and four properties that are
   checked rather than assumed. The numbers: hands short by `0` px across
   51 dance-by-line-length cases, closure error 5.28e-14 px, minimum torso
   distance 9.19 px against an 8 px bound. Job: convert "simulation" from
   a word into four measurements.
4. **The hey.** The complaint, the old shape, the new one. `hey-pen.svg`
   and the B1 panel of `butter-seismograph.svg`. Counts: four centre
   passes on 2, 6, 10, 14 at 13.00 px, three side passes on 4, 8, 12 at
   9.19 px. Job: the reframe. The first post's hey was a shape that looked
   like a hey; this one is a hey because passing is what it is made of.
5. **The four things a dancer asked for.** Pen offset (diagonal, 2.4 px,
   and why diagonal and not horizontal); role colours (gold and red, and
   why the first pair was a mistake); facing (a tick every beat);
   petronella (`petronella-pen.svg`, four congruent arcs). Job: show that
   feedback on a picture turned into a property of the code, with the
   file each one lives in.
6. **The ten dances.** Pen plot and figure strip for each of the ten in
   `data/dances/`. Job: the gallery, same as the first post, redrawn.
7. **What is missing.** The three that overlap, the seven that do not, the
   two reasons (permission and the figure library), the figure library's
   17 names, and the courtesy turn still in flight. Job: own the coverage
   price before a reader finds it.
8. **Method.** What I ruled, what the agents decided, the oracle, the
   known-wrong table at 0 rows, the frame-cost split, and the same AI
   disclaimer the first post carries. Job: the answer to "how do you know",
   in numbers and file paths.
9. **Where to look.** Moves tab, Dances tab, `#/moves/hey`,
   `#/dances/butter/traces`. Job: hand the reader the thing that moves,
   and ask for the next correction.

## Title and slug

Working title **The same dances, simulated**; slug
`2026-09-14-the-same-dances-simulated`, so the file is
`content/post/2026-09-14-the-same-dances-simulated.md` and the URL is
`https://lab.photomancer.art/post/2026-09-14-the-same-dances-simulated/`.

Candidates considered:

- *The same dances, simulated.* Names the relationship to the first post in
  four words. My pick.
- *The hey was wrong.* Truer to the trigger, and a better headline, but it
  makes the piece about the criticism rather than about the dances, and it
  reads as self-flagellation on a list where a few people already decided
  the project was a bad idea.
- *Ten dances, checked.* Accurate, dull, and "checked" means nothing until
  the post explains it.

Session slug: `blog: same-dances-simulated`.

## Decisions

Answered by: **nobody yet.** Every line below is my lean, written so the
post could ship on it, and every one is cheap to reverse except the slug.

1. **Title and slug.** Lean: as above. Reversible until publish; after
   publish a rename needs a Hugo `aliases` entry.
2. **Primary reader.** Lean: the Seattle dancer who pushed back, not the
   engineer. Sets the vocabulary (A1, becket, courtesy turn are used
   without gloss; `Timeline`, `poseAt` and file paths appear only in the
   method section).
3. **Embedded playground.** Lean: **no iframe.** The first post embedded a
   single-file playground because there was nothing else to point at. There
   is now: <https://yona-appletree.github.io/contra/>, which is the actual
   simulator, updated on every merge. Shipping a second frozen copy inside
   the post would recreate the exact thing the first post got criticised
   for. If you want one, the natural candidate is an iframe of
   `#/dances/butter/traces`, and I can add it in a line.
4. **Quoting the feedback.** Lean: **paraphrase, do not quote, do not
   name.** The four points came to me relayed from Dirk. I have his words
   but not his permission to publish them, and a post that quotes a named
   dancer's critique back at the list he sent it to reads differently from
   one that says "a dancer asked for four things". If he is happy to be
   quoted and credited, say so and I will put his words in verbatim, which
   is the better post.
5. **The anti-AI reaction.** Lean: **do not mention it.** The post carries
   the same disclaimer the first one did, and answers the underlying
   question (is this made up?) with the oracle numbers. Arguing with the
   reaction in prose would make the post about the argument.
6. **Which of the first post's ten to show.** Lean: **show all ten new
   ones**, and carry an explicit list of the old ten marked simulated or
   not. Showing only the three overlapping dances would be the tidier
   before-and-after and would hide most of the work.
7. **SVG or PNG.** Lean: **SVG**, as `traces:export` writes them, copied
   into `static/examples/2026-09-14-the-same-dances-simulated/img/`. They
   carry their own dark ground, they scale on a phone, and 48 of them are
   2.0 MB. The cost is that a reader cannot right-click and save a picture
   the way they can a PNG.
8. **The two stale plates.** `robins-chain-pen.svg` and
   `right-and-left-through-pen.svg`, and the `robins-chain` cell inside
   every dance strip, were exported before F7/F8 (the courtesy turn's
   pivot) and F7/F8 are not on `contra`'s `main` yet. Lean: **say so in the
   post**, and re-run `pnpm traces:export` and re-copy before publishing if
   they have merged by then. Do not publish a plate whose figure the repo
   has already changed without saying which one.
9. **The old post's forward note.** Lean: **write it, do not apply it.**
   It ships in this PR as `docs/plans/2026-09-14-old-post-forward-note.md`,
   with the exact Markdown to paste and where. The first post is not edited
   by this branch.

## What this post must not do

- Fake a plate. Every image is a file `pnpm traces:export` wrote, copied
  byte for byte. Nothing is recoloured, cropped or redrawn for the post.
- Publish new figure text for the seven dances the simulator cannot dance.
  They stay as the first post has them.
- Claim a number the repo does not measure. Every number in the method
  section is traceable to `docs/acceptance.md`, `docs/motion-report.md`,
  `docs/role-colours.md` or `AGENTS.md`.
