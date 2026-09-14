+++
author = "Yona Appletree"
title = "Contra Dance: A Visual Exploration"
date = "2026-09-13"
description = "Ten contra dances drawn by putting a pen on each dancer in a minor set, and an evening as rows."
tags = [
  "contra-dance",
  "visualization",
  "agentic",
]
+++

![Ten contra dances, each drawn as one picture](/examples/2026-09-13-contra-dance-visual-exploration/img/gallery.png)

Ten contra dances. Each picture is one minor set, four dancers, 64 beats: a pen on every
dancer, drawing for the length of the dance.

## The dances

Each dance four ways: pen plot, march, seismograph, figure strip with the figure names.
Colours are figure families; the method section at the end explains the views.

![Figure family colours](/examples/2026-09-13-contra-dance-visual-exploration/img/legend.png)

### The Baby Rose (no-chain var), David Kaynor

![The Baby Rose](/examples/2026-09-13-contra-dance-visual-exploration/img/dance-0.png)

### Thursday Night Special #1, Larry Jennings

![Thursday Night Special #1](/examples/2026-09-13-contra-dance-visual-exploration/img/dance-1.png)

### Another Equal Turn, Jerome Grisanti

The wave figures at the start and end are stand-ins. This is the one that doesn't close.

![Another Equal Turn](/examples/2026-09-13-contra-dance-visual-exploration/img/dance-2.png)

### Butter, Gene Hubert

![Butter](/examples/2026-09-13-contra-dance-visual-exploration/img/dance-3.png)

### Spring Break, Nils Fredland

![Spring Break](/examples/2026-09-13-contra-dance-visual-exploration/img/dance-4.png)

### Flying Flamingos, Cary Ravitz

![Flying Flamingos](/examples/2026-09-13-contra-dance-visual-exploration/img/dance-5.png)

### Heartbeat Contra, Don Flaherty

![Heartbeat Contra](/examples/2026-09-13-contra-dance-visual-exploration/img/dance-6.png)

### Airpants, Lisa Greenleaf

![Airpants](/examples/2026-09-13-contra-dance-visual-exploration/img/dance-7.png)

### Simplicity Swing, Becky Hill

![Simplicity Swing](/examples/2026-09-13-contra-dance-visual-exploration/img/dance-8.png)

### The Nice Combination, Gene Hubert

![The Nice Combination](/examples/2026-09-13-contra-dance-visual-exploration/img/dance-9.png)

## As a program

The same ten on one 64-beat axis, figure strip over seismograph. Seven open with a
neighbour swing. Spring Break and Heartbeat Contra begin with the same two petronellas.

![Ten dances as rows on one 64-beat axis](/examples/2026-09-13-contra-dance-visual-exploration/img/rows.png)

## Playground

Every view above, plus a play button that draws all ten dances at once. Space plays and
pauses; the arrow keys step a beat.

<iframe src="/examples/2026-09-13-contra-dance-visual-exploration/index.html"
        style="width: 100%; height: 720px; border: none; border-radius: 8px; background: #141110;"
        loading="lazy"
        title="Dance sheet playground"></iframe>

<p style="text-align: right; font-size: 0.9em;">
  <a href="/examples/2026-09-13-contra-dance-visual-exploration/" target="_blank">open the playground in its own page ↗</a>
</p>

## Method

**AI disclosure:** this is a visual exploration of contra dances created using Claude
Fable 5.1, at my direction, for the purpose of exploring how to build software that helps
callers program dances. The agent wrote the playground that drew every picture and most of
this text. The figure shapes are hand-written approximations, not a simulation, so details
are wrong; the rest of this section says how.

The canvas is one minor set with the band at the top. Ones start at the top facing down,
twos at the bottom facing up. Each dancer is a pen: larks blue, robins pink, ones darker.

The pens are moved by sixteen small functions, one per figure, each drawing a plausible
path for a role over the figure's beats. A dance is the figures from its card with their
beat counts. The only check is closure: after 64 beats, is everyone standing where the
next round starts? Nine of the ten dances close exactly. Another Equal Turn, which starts
in a wave, does not, because the playground has no wave figures and uses stand-ins.

Other approximations: the hey is a figure-eight track with a shoulder offset, the
courtesy turn is a quarter arc, and Becket dances recentre the square after the slide, so
the ink breaks there. The top and bottom of the set do not exist.

The four views of each dance:

- **Pen plot**: the whole dance on the set.
- **March**: the set moves right as the beats pass. Loops are turns, flat stretches are
  standing still.
- **Seismograph**: each dancer's position across the set, then along it, against time.
- **Figure strip**: one small plot per figure, cell width equal to its beats, the figure's
  name underneath.

The playground is a single HTML file with no dependencies, written by the agent in one
evening from the question "could a dance be drawn by pens on the four roles, and how would
a program be laid out". I ruled on the canvas, the pens, the dances, and the layout; the
agent decided how each figure is drawn.
