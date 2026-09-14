+++
author = "Yona Appletree"
title = "The Same Dances, Simulated"
date = "2026-09-14"
description = "The first post's contra plates were hand-written approximations, and the hey in them was wrong. These come out of a simulation where every hand has to reach and no two dancers can overlap."
tags = [
  "contra-dance",
  "visualization",
  "agentic",
]
+++

> **Update, 2026-09-14.** This post supersedes the pictures in
> [Contra Dance: A Visual Exploration](/post/2026-09-13-contra-dance-visual-exploration/),
> published yesterday. That post's plates were drawn by sixteen hand-written figure
> functions. These come out of a simulation. The first post is left standing exactly
> as published, approximations and all.

Here is Butter, by Gene Hubert, as yesterday's post drew it.

![Butter as the first post drew it: pen plot, march, seismograph and figure strip, coloured by figure family](/examples/2026-09-13-contra-dance-visual-exploration/img/dance-3.png)

And here is Butter as the simulator draws it, one time through, one minor set.

![Butter's pen plot from the simulation: four pens, gold larks and red robins, with facing ticks](/examples/2026-09-14-the-same-dances-simulated/img/dances/butter-pen.svg)

![Butter's figure strip: slide, circle, swing, long lines, robins chain, hey, balance and swing](/examples/2026-09-14-the-same-dances-simulated/img/dances/butter-strip.svg)

Three things are different. The long straight spines running out of the top and
bottom of the new plot are the progression, drawn as continuous travel; Butter is
becket, and yesterday's method section had to admit that "Becket dances recentre
the square after the slide, so the ink breaks there." The colouring changed hands:
yesterday's plate is painted by figure family, so you can see which call you are
looking at but not who is dancing it, and the new pen plot is painted by dancer,
gold for larks and red for robins, with the ones darker than the twos. The family
colours moved down to the strip. And B1, the sixteen-beat hey, is a weave with
passes in it instead of a figure-eight track, which is most of what the rest of
this post is about.

The price of all that is coverage. Ten dances can be danced by the simulator
today, and only three of yesterday's ten are among them.

---

**AI Disclaimer:** All code, visuals, and the remainder of this post were created
using Claude code and Fable 5.1.

## What the pictures come out of now

Yesterday's pens were sixteen small functions, one per figure, each drawing a
plausible path for a role over the figure's beats. The only check was closure:
after 64 beats, is everybody where the next round starts?

The pens are now four dancers in a simulation. A dance is a timeline of calls; a
call places bodies, and an arm solver puts two 7.5 px bones between a shoulder and
whatever hand that dancer is holding. Four properties are measured rather than
assumed, over all ten dances at every line length their formation is checked at:

- **Hands meet.** A joined hand is one shared floor point that both dancers
  compute from the same figure frame, and the solver reports how far short of it
  an arm falls. Across 51 dance-by-line-length cases, the worst shortfall is `0`.
- **The dance closes.** Worst position error at any seam between two figures:
  0.000000000000053 px, in Kitchen Stomp at the `star → balance-and-swing` seam.
  The bound is 0.01 px.
- **Nobody walks through anybody.** Minimum distance between two torsos, over the
  same set of runs: 9.19 px against an 8 px bound, in Butter at beat 100, in a
  line of five couples. No figure is exempted, including every swing and every
  allemande.
- **No arm does anything a body can't.** A separate oracle samples the drawn arm
  every 1/32 beat and checks hand speed, elbow speed, the ratio between them, how
  fast a hand changes height, and whether a hand jumps when a figure hands it to
  the next figure. 688,128 measurements over the ten dances, none of them a
  non-finite number.

Those bounds are derived, not chosen. The fastest honest motion in the library is
a *take*: a hand leaves a dancer's hip and arrives at a joined point over one beat.
The furthest any figure reaches is 14.7814 px, and every speed guard is three times
what that take produces.

## The hey

The complaint that started this was that the hey is wrong, and it was. Yesterday's
hey was a lemniscate with a shoulder offset: one hand-drawn figure-eight per role,
nudged apart so the four tracks did not coincide. A hey is not a shape. It is four
people passing each other in a fixed order, and a curve that looks like a
figure-eight has no passes in it at all.

![The hey's pen plot from the simulation: two lobes, four pens crossing in the middle, facing ticks every beat](/examples/2026-09-14-the-same-dances-simulated/img/figures/hey-pen.svg)

It still comes out as a figure-eight, because that is the shape a hey makes. The
difference is what the shape is made of. The four pens are phase-shifted rather
than parallel, so they cross each other in the centre once per pass instead of
running as four copies of one curve. The long straight diagonals through the
middle are dancers crossing the set in a straight line, the first pull-by among
them, and a lemniscate has no straight in it anywhere. The assertions in
`packages/contra/src/figures/figureChecks.ts` say where the passes are: four centre
passes on counts 2, 6, 10 and 14 at 13.00 px, and three side passes on 4, 8 and 12
at 9.19 px.

The seismograph says the same thing more plainly. Here is Butter again, each
dancer's position across the set on top and along it underneath, against the beat.

![Butter's seismograph: four traces across the set and four along it, over 64 beats](/examples/2026-09-14-the-same-dances-simulated/img/dances/butter-seismograph.svg)

B1 is the sixteen beats where the four across-traces braid through each other.
Every crossing there is two dancers changing sides, which is what a hey is. The
neighbour swing back in A1 is the opposite picture: two pairs of traces winding
tightly around each other inside their own band, going nowhere.

## Four things a dancer asked for

The first post went to the Seattle contra community, and a dancer sent back four
notes on the pictures. All four are now properties of the code rather than opinions
about it.

**The tracks overlapped.** Whichever pen was drawn last buried the other three, so
a swing came out as one solid loop instead of two. Each pen is now nudged 2.4 px
along a diagonal, symmetric about the middle of the four. The note suggested
trying horizontal and vertical too, and we did: an offset only shows where it has a
component across the track, and a contra's straight tracks are axis-aligned, so a
horizontal nudge vanishes on long lines going forward and back and a vertical one
vanishes on a pass along the set. Diagonal is the only direction with a component
on both.

**The colours were tied to gender.** The first post's method section says its pens
were larks blue and robins pink, and the simulator's first rendering dressed its
dancers the same way. That is gents and ladies with the words filed off, and
contra's role names exist to stop doing exactly that. A lark is now gold `#e0a32e`
and a robin is red `#c8362f` everywhere a role is drawn: shirts, floor trails,
trace pens, legends, all out of one exported constant. The rule is a test.
`roleColours.test.ts` names two forbidden hue bands, blue at 190°–270° and pink at
290°–350°, and checks the two bases, the pens at all three ranks, both floor
trails and six hundred seeded shirts against them. A skirt, separately, is decided
by a dancer's seed now and never by their role.

**There was no indication of facing.** Every pen plot and every march now carries a
short tick out of the path on every beat, pointing the way that dancer was facing.
It is not pretty, and I know it: a version that draws facing as a gradient wake
instead is being rendered for comparison as I write this. The ticks are what ships
today, and they are the reason the hey plot above can tell you which way somebody
was looking through each pass.

**Every dancer took a different petronella.** They did, because yesterday's
petronella was a path drawn by hand for each role and nothing made the four agree.
In the simulation it is one function of one argument, the place you are standing
on, so the four paths are congruent by construction.

![The petronella's pen plot: four congruent bowed arcs, one place clockwise](/examples/2026-09-14-the-same-dances-simulated/img/figures/petronella-pen.svg)

Four arcs, one per dancer, each travelling one place clockwise round the set and
each bowing 3 px outside the straight line between the two places. The bow is
deliberate. Riding the full circle through both corners bulges 8.9 px beyond the
set, which is most of the 20 px between one minor set and the next, and would put
two adjacent sets 2.3 px apart against that 8 px bound.

## The ten dances

Each dance is one time through, one minor set, with the real progression. The pen
plot is the whole 64 beats on the floor; the strip below it is one small plot per
call, each cell as wide as the call is long, with the figure's name underneath. All
ten are from The Caller's Box, and all ten carry `Permission: full` there.

### Airpants, Lisa Greenleaf

![Airpants pen plot](/examples/2026-09-14-the-same-dances-simulated/img/dances/airpants-pen.svg)

![Airpants figure strip](/examples/2026-09-14-the-same-dances-simulated/img/dances/airpants-strip.svg)

Three linked rings, because everything in Airpants turns: two balance-and-swings,
an allemande once and a half, a circle three quarters, and a do-si-do once and a
half.

### Butter, Gene Hubert

![Butter pen plot](/examples/2026-09-14-the-same-dances-simulated/img/dances/butter-pen.svg)

![Butter figure strip](/examples/2026-09-14-the-same-dances-simulated/img/dances/butter-strip.svg)

The becket dance. The spines are the slide and the progression.

### The Baby Rose, David Kaynor

![The Baby Rose pen plot](/examples/2026-09-14-the-same-dances-simulated/img/dances/the-baby-rose-pen.svg)

![The Baby Rose figure strip](/examples/2026-09-14-the-same-dances-simulated/img/dances/the-baby-rose-strip.svg)

### Jubilation, Gene Hubert

![Jubilation pen plot](/examples/2026-09-14-the-same-dances-simulated/img/dances/jubilation-pen.svg)

![Jubilation figure strip](/examples/2026-09-14-the-same-dances-simulated/img/dances/jubilation-strip.svg)

### Contra Cockaigne, Devin Nordson

![Contra Cockaigne pen plot](/examples/2026-09-14-the-same-dances-simulated/img/dances/contra-cockaigne-pen.svg)

![Contra Cockaigne figure strip](/examples/2026-09-14-the-same-dances-simulated/img/dances/contra-cockaigne-strip.svg)

### The Carousel, Tom Hinds

![The Carousel pen plot](/examples/2026-09-14-the-same-dances-simulated/img/dances/the-carousel-pen.svg)

![The Carousel figure strip](/examples/2026-09-14-the-same-dances-simulated/img/dances/the-carousel-strip.svg)

### Kitchen Stomp, Becky Hill

![Kitchen Stomp pen plot](/examples/2026-09-14-the-same-dances-simulated/img/dances/kitchen-stomp-pen.svg)

![Kitchen Stomp figure strip](/examples/2026-09-14-the-same-dances-simulated/img/dances/kitchen-stomp-strip.svg)

Nine cells, the longest strip of the ten: a chain, then balance the ring and
petronella twice over.

### After the Solstice, Lisa Greenleaf

![After the Solstice pen plot](/examples/2026-09-14-the-same-dances-simulated/img/dances/after-the-solstice-pen.svg)

![After the Solstice figure strip](/examples/2026-09-14-the-same-dances-simulated/img/dances/after-the-solstice-strip.svg)

### Thanks to the Gene, Tom Hinds

![Thanks to the Gene pen plot](/examples/2026-09-14-the-same-dances-simulated/img/dances/thanks-to-the-gene-pen.svg)

![Thanks to the Gene figure strip](/examples/2026-09-14-the-same-dances-simulated/img/dances/thanks-to-the-gene-strip.svg)

### Neighbor, Neighbor on the Wall, Maia McCormick

![Neighbor, Neighbor on the Wall pen plot](/examples/2026-09-14-the-same-dances-simulated/img/dances/neighbor-neighbor-on-the-wall-pen.svg)

![Neighbor, Neighbor on the Wall figure strip](/examples/2026-09-14-the-same-dances-simulated/img/dances/neighbor-neighbor-on-the-wall-strip.svg)

### The other two views

Every dance also has a march and a seismograph. The march slides the set to the
right as the beats pass, so a loop is a turn and a flat stretch is standing still.
Here is Airpants marching.

![Airpants march: the set sliding right over 64 beats](/examples/2026-09-14-the-same-dances-simulated/img/dances/airpants-march.svg)

All four views of any dance are at `#/dances/<slug>/traces` on the live page, for
example [Butter's](https://yona-appletree.github.io/contra/#/dances/butter/traces).

## What is missing

Yesterday's post had ten dances too, and they are mostly not these ten. Three
appear in both: **Butter**, **Airpants** and **The Baby Rose**. The other seven are
not simulated here, and I am not going to draw them from the old functions and
present them beside these.

| From the first post | Simulated |
| --- | --- |
| The Baby Rose, David Kaynor | yes |
| Thursday Night Special #1, Larry Jennings | no |
| Another Equal Turn, Jerome Grisanti | no |
| Butter, Gene Hubert | yes |
| Spring Break, Nils Fredland | no |
| Flying Flamingos, Cary Ravitz | no |
| Heartbeat Contra, Don Flaherty | no |
| Airpants, Lisa Greenleaf | yes |
| Simplicity Swing, Becky Hill | no |
| The Nice Combination, Gene Hubert | no |

Two reasons, and they stack.

The first is permission. A dance's figures are somebody's work, and the project's
rule is that only dances whose Caller's Box entry says `Permission: full` are
encoded and published. The ten in `data/dances/` are ten such dances. Yesterday's
ten were the ones I had called at a recent evening, which is a different filter
entirely.

The second is the figure library. It holds seventeen figures a dance can call:
balance, balance the ring, swing, balance and swing, allemande, do-si-do, long
lines, circle, star, petronella, California twirl, right and left through, robins
chain, pass through, roll away, slide left, and the hey. There are no waves, no
give and take, no poussette, no ricochet hey, no mad robin, no contra corners. A
card that calls one of those cannot be danced yet no matter whose permission we
have. Another Equal Turn is the clearest case: it starts in a wave, the first post
used stand-ins for the wave figures, and it is the one dance of that ten that did
not close.

One figure is mid-repair as I write. The courtesy turn was a quarter arc in the
first post and is a half turn of both bodies now, and a further change to what it
pivots about sits on a branch that has not merged.

![The robins chain's pen plot: two red scoops across the set, a narrow gold loop in each corner](/examples/2026-09-14-the-same-dances-simulated/img/figures/robins-chain-pen.svg)

The two robins scoop corner to corner and each lark turns their own narrow loop at
the end of it. That loop is the courtesy turn, and it is the version from before
the pending change, because these plates were exported from `main`. So the
`robins-chain` cell in a strip, and the chain inside The Baby Rose, Butter,
Jubilation and the rest, is the older turn. It is the one place in this post where
a picture is behind the code, and I would rather say so than re-export after the
fact and mention nothing.

## Method

I ruled on the floor. Arms are two 7.5 px bones. A joined hand is one shared point
both dancers compute, the robin's hand stacks on top, the feet swing ±2.6 px and
the torso sways 1.5° with no vertical bounce, shoulders are 11 px apart, a pixel is
four centimetres. Larks are gold and robins are red. I ruled on how several figures
are danced, including that a star's default hold is a wrist grip rather than a pile
of hands in the centre, and that a courtesy turn turns both bodies.

The agents decided everything else: how each figure gets from its start to its end
inside those constraints, how the seams between figures ease, where an elbow goes,
and how the four views are drawn.

The thing that made the difference between this post and the last one is not the
model. It is that the figures are now checked by something other than a person
looking at them. A motion oracle samples the drawn arm and reports every figure
against what a caller would say it does, and an assertion that fails goes into a
table in `knownWrong.ts` instead of being deleted. That table found
fourteen wrong things. It is now zero rows long, and every one of the fourteen was
removed by fixing the choreography rather than by loosening the assertion. The
three left-over uncertainties are marked in the source with `(unsure: …)` and are
mine to rule on, not the agents': which dancer turns under in a California twirl,
whether a lark can twirl a robin under in a chain, and how two couples doing right
and left through at once share 8.5 px of room.

The hall runs inside its frame budget with room to spare. A frame of the shipped
hall, fifteen couples and thirty dancers, takes a median 9.2 ms against a 33 ms
budget, and about 72% of that is the renderer, 25% the floor and furniture and
speech bubble, and 2.7% sampling the timeline.

Every number in this post comes from `docs/acceptance.md`, `docs/motion-report.md`
or `docs/role-colours.md` in the repo, and the plates are the files
`pnpm traces:export` writes, copied here unedited.

## Where to look

The simulator is live at
[yona-appletree.github.io/contra](https://yona-appletree.github.io/contra/). The
[Moves tab](https://yona-appletree.github.io/contra/#/moves) has every figure with
its call, its own pen plot and its strip cell; the
[hey](https://yona-appletree.github.io/contra/#/moves/hey) is the one to check
first. The [Dances tab](https://yona-appletree.github.io/contra/#/dances) has the
ten cards, each linking to all four views.

If you dance, look at a figure you know cold and tell me where it is still wrong.
The last round of that is most of what this post is about.
