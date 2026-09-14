+++
author = "Yona Appletree"
title = "Contra Dance: A Visual Exploration"
date = "2026-09-13"
description = "Ten contra dances drawn by putting a pen on each dancer in a minor set, and an evening's program as rows you can read at a glance. An agent-built exploration, approximate on purpose."
tags = [
  "contra-dance",
  "visualization",
  "agentic",
]
+++

![Ten contra dances, each drawn as one picture](/examples/2026-09-13-contra-dance-visual-exploration/img/gallery.png)

Ten contra dances. Each picture is four dancers and 64 beats: a pen on every dancer in one
minor set, drawing for the length of the dance.

> **Transparency note:** this post was drafted by an AI agent (Claude) working at my
> direction, from an exploration we did together in one evening. The question, the
> rulings, and the opinions are mine; most of the sentences are the machine's, and so is
> the playground that drew the pictures. That playground moves the dancers with a small
> hand-written set of figure shapes, not a simulation, so some details in the pictures
> are wrong. I say which ones below. I've reviewed and edited the post before publishing.

I call contra dances, and part of calling is programming an evening: ten or twelve
dances in an order that builds, with enough variety that the eighth dance doesn't feel
like the third. The tools for that are text. A dance is a card with four lines on it,
A1, A2, B1, B2, each line a few figures with beat counts. A program is a list of card
titles. To feel the shape of a dance I read the card and run it in my head. To feel the
shape of an evening I do that ten times and try to hold the results at once.

I wanted to know whether a picture could carry what a card carries. The idea was
simple: put a pen on each of the four people in a minor set, run the dance, and look at
the ink. If one dance is one picture, an evening is ten pictures in a column, and
repetition should be visible without reading anything.

This post is that idea tried out, not built out. Everything here comes from a single HTML
file that an agent wrote under my direction in an evening. It knows sixteen figures,
each as a rough path, and it checks only one thing about a dance: that after 64 beats
everyone stands where the next round starts. It is enough to compare ways of drawing a
dance. It is not enough to trust any one line in the drawing.

## The canvas is the minor set

Contra dancers dance in long lines, but the dance itself happens in groups of four:
two couples, "hands four", which I'll call the minor set. Every 64 beats each couple
moves on to the next couple, and the same 64 beats happen again with new neighbours.
So a dance is fully described by what four people do in one square for 64 beats, and
that square is the canvas.

In the pictures, the band is at the top. The ones (the couple progressing down the hall)
start at the top of the square facing down; the twos start at the bottom facing up. Each
of the four gets a pen. Larks are blue, robins are pink, and the ones are the darker
shade of each. Where a figure has a family colour instead, the colour comes from the
card taxonomy I already use: swings are salmon, circles green, heys mint, chains gold,
long lines a pale blue, balances grey.

## One dance, large

Here is Butter, by Gene Hubert, coloured by figure family.

![Butter as one picture, coloured by figure family](/examples/2026-09-13-contra-dance-visual-exploration/img/butter-glyph.png)

The big green ring is the circle left three quarters. The two small salmon circles, one
on each side of the set, are the swings: a neighbour swing on one side and a partner
swing on the same spot later, so they overlap. The mint bow tie across the middle is the
full hey. The gold curve that crosses the set and hooks around is the robins' chain,
and the two straight pale-blue strokes are the couples stepping into the set for long
lines and back out. The vertical lines at the edges are the Becket slide, where the
ones step up the hall to meet their new neighbours.

This is the picture I'd want as a thumbnail on every card: it reads in a second. It also
hides time completely. The two swings are on top of each other, and nothing tells you
the hey is in B1 rather than A2. So the rest of this post is about where to put time.

## March

The first answer: keep the pens on the set, but move the set to the right as the beats
pass.

![Butter marched along the time axis](/examples/2026-09-13-contra-dance-visual-exploration/img/butter-march.png)

Now the circle is a set of loops, the swings are tight coils, the long lines are a
flat stretch where nobody moves along the hall, and the hey is a braid. The strip of
names underneath is the card, laid along the same axis. Slow the march down and the
picture folds back into the glyph above; speed it up and it becomes the next picture.

I find this the most pleasing single-dance view. It is also the hardest to stack: ten of
these in a column read as texture, and you stop seeing the dances.

## Seismograph

The second answer drops the floor entirely. Two lanes: how far across the set each
dancer is, and how far along it, both against time.

![Butter as two lanes of position against time](/examples/2026-09-13-contra-dance-visual-exploration/img/butter-seismo.png)

A swing is a wiggle in both lanes. A circle is four sine waves offset by a quarter
turn. Long lines is a bump in the top lane and nothing in the bottom one. The hey is
the wide braid in the middle where all four cross the set twice.

This looks least like a dance and is best at repetition: two figures that are the same
produce the same waveform, and your eye is good at matching waveforms. It is the view
I ended up liking most for the program.

## Figure strip

The third answer keeps the floor but gives each figure its own little square, with the
square's width equal to its beat count.

![Butter as one small plot per figure, cell width equal to beats](/examples/2026-09-13-contra-dance-visual-exploration/img/butter-strip.png)

I'd worried that figures of different lengths would make a grid impossible. This is
the way around it: a two-beat slide is a sliver, a sixteen-beat hey is a wide cell, and
because every dance is 64 beats the cells of one dance line up with the cells of the
next. Each cell is tinted by its family, so a column of these is also a colour map of
the evening. What each cell loses is the whole: you see a circle, not the way the
circle sets up the swing.

## Where the pictures are wrong

Before the program, the honest part. The dancers are moved by sixteen small functions,
one per figure, each of which draws a plausible path in the square. A swing is two pens
spiralling in and out around their midpoint. A hey is a figure-eight track with the
dancers spaced along it and a small offset so they pass by the shoulder. A courtesy
turn is a quarter arc. None of these came from watching dancers; they came from
describing the figure in a sentence and drawing what the sentence says.

The only check is closure: after 64 beats, is everyone standing where the next round
needs them? Nine of the ten dances close exactly. The tenth doesn't.

![Another Equal Turn, whose wave figures are stand-ins](/examples/2026-09-13-contra-dance-visual-exploration/img/aet-strip.png)

Another Equal Turn starts in a wave of four and ends by forming the next one. The
playground has no idea what a wave is, so those cells are stand-ins, and the dance
finishes about a dancer's width from where it should. I left it in because a method
that only shows its successes isn't telling you much.

Two more things to know when reading any of these. Becket dances progress by sliding
along the hall, and the playground handles that by recentring the square on the new
neighbours, so the ink breaks at the slide. And every figure that takes hands, turns
by the shoulder, or uses the whole line is drawn as a shape in a two-by-two square,
which means the top and bottom of the set, where the real interest in a dance often
is, don't exist here at all.

## An evening

Ten dances as rows, on a shared 64-beat axis with the phrase lines drawn. Each row
stacks the figure strip over the seismograph, with the glyph at the left and the
figure names underneath.

![Ten dances as rows on one 64-beat axis](/examples/2026-09-13-contra-dance-visual-exploration/img/rows.png)

Things I can see here that I would have had to count on cards:

- Seven of the ten open A1 with a neighbour swing. The rows show it as the same salmon
  cell in the same place, and the same coil in the seismograph.
- Spring Break and Heartbeat Contra begin with the same two petronellas. In the
  seismograph they are the same pair of scallops, and a ring marks the second one as a
  repeat of the first.
- Nine of the ten have a circle left three quarters, and every one has a partner swing.

The small red ticks above cells mark a figure that sits on the same beats as the same
family in the dance before it. That's a first pass at the thing a good programmer does
by feel: notice when two dances in a row have the same figure at the same moment of
the tune.

Repetition inside one dance shows up best when the ink is coloured by phrase instead of
by role. Here is The Baby Rose with A1 gold, A2 green, B1 blue, B2 pink:

![The Baby Rose coloured by phrase; A1 and B1 are the same shapes](/examples/2026-09-13-contra-dance-visual-exploration/img/babyrose-strip.png)

A1 and B1 are the same three shapes in two colours. On the card that's "neighbours
balance and swing" and "partners balance and swing", which read as two different
lines.

## How this was made

I set the question at the start of an evening: could a dance be drawn by pens on the
four roles, and if so, how should a program be laid out. An agent (Claude, in Claude
Code) built the playground. I ruled on the things a caller would rule on. The canvas is
the minor set, the band is at the top, the pens are the four roles rather than
individual dancers, the dances are ten I know from my own cards, and the program rows
should stack whichever views I want to compare. The agent decided how a hey is drawn,
what a courtesy turn looks like as an arc, and how the row layout works.

The playground is one HTML file of about four hundred lines with no dependencies. The
figure library is sixteen functions, each taking a role, a time in beats, and the
positions at the start of the figure, and returning a point. A dance is a list of
figure calls with the beat counts from the card. The file samples each pen eight times
a beat, checks closure, and draws the four projections from the same samples. The
first working version, the move-name strips, and the stacking rows were three commits
across one evening.

The point of building it approximately was to compare four ways of drawing a dance
without first building a simulator. That worked. The cost is what the previous section
says: the shapes are sketches. I would not use any of these pictures to teach a figure.

## What a real version needs

Traces from an engine instead of a hand library, so the shapes are right and the hey
looks like a hey. A hall of finite lines instead of one square, so that the top and
bottom of the set, and the dancers waiting out, are in the picture. More dances than
ten, so the program view earns its marks. And something on a third axis for
difficulty, which is the thing a caller weighs most when ordering an evening and the
thing none of these pictures show.

That engine is a separate project. This was the evening spent finding out whether the
pictures would be worth drawing. I think they are.

## Try it

The playground itself, with every view above and a play button that draws all ten
dances at once on one clock. Space plays and pauses; the arrow keys step a beat.

<iframe src="/examples/2026-09-13-contra-dance-visual-exploration/index.html"
        style="width: 100%; height: 720px; border: none; border-radius: 8px; background: #141110;"
        loading="lazy"
        title="Dance sheet playground"></iframe>

<p style="text-align: right; font-size: 0.9em;">
  <a href="/examples/2026-09-13-contra-dance-visual-exploration/" target="_blank">open the playground in its own page ↗</a>
</p>

Go back to the gallery at the top and find Spring Break and Heartbeat Contra. The two
scalloped arcs at the top of each are the two petronellas, and they are the same
drawing.
