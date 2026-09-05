+++
author = "Yona Appletree"
title = "Contiguous Animated Popups"
date = "2026-07-15"
description = "A button that grows into a popup, sharing one continuous border — why CSS can't express it, and a small geometry trick that can."
tags = [
  "ui",
  "svg",
  "css",
  "animation",
]
+++

> **Transparency note:** this post was drafted by an AI agent (Claude) working at my
> direction, based on a prototyping session we did together. The problem, the prototype,
> and the opinions are mine; most of the sentences are the machine's. I've reviewed and
> edited it before publishing.

There's a UI pattern I keep coming back to: a button that expands into a popup, where
the border is *contiguous* — one continuous outline wrapping both the button and the
panel, with smooth inward curves where they join. It ties the popup to the thing you
clicked in a way a floating card never does. It feels like diving into the button.

Here's the effect, live (click a button; the controls below let you scrub the
animation and change the geometry):

<iframe src="/examples/2026-07-15-contiguous-popup/embed.html"
        style="width: 100%; height: 600px; border: none; border-radius: 8px; background: #141519;"
        loading="lazy"
        title="Contiguous popup demo"></iframe>

<p style="text-align: right; font-size: 0.9em;">
  <a href="/examples/2026-07-15-contiguous-popup/" target="_blank">open the full demo in its own page ↗</a>
</p>

## Why CSS can't do this

I've now built this pattern twice, in two unrelated codebases, and both implementations
independently converged on the same pile of hacks. That's usually a sign the platform is
missing a primitive.

The core problem: in CSS, **each element draws its own border**. There is no way to ask
for an outline around the union of two boxes. So every CSS implementation of this
pattern is forgery — you build the illusion out of parts:

- **Overlap the popup and the trigger by 1px** and z-index the trigger above it, so the
  trigger's background covers the slice of popup border that runs beneath it.
- **Patch the concave corners** — the inward curves where the popup's top edge meets the
  trigger's sides — with pseudo-elements painted with `radial-gradient` rings, because
  `border-radius` can only curve outward.
- **Tune sub-pixel fudge factors** (`+0.5px` gradient stops, `-1.5px` ring thicknesses)
  until the anti-aliasing of the fake arc matches the anti-aliasing of the real border.
- **Keep the colors in sync by hand** across three or four elements, which breaks in
  interesting ways the moment you have dark mode or nested themes.

It works. Both of mine ship. But every geometric variation (popup wider than the
trigger? narrower? opening upward? trigger near a corner?) is a new special case, and
the whole thing is unfalsifiably coupled to the exact layout it was tuned for.

The platform is inching closer: the new
[`corner-shape: scoop`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/corner-shape)
gives you native concave corners, which shrinks the hack. But it's per-element and
Chromium-only, so you're still aligning separate boxes and hiding seams. The
merged-outline problem remains unsolved in CSS.

## Steal from text editors

The closest thing to prior art isn't in the popup world at all — it's **multi-line text
selection**. When an editor draws one rounded outline around a selection that spans
lines of different lengths, it's solving exactly this problem: the union of several
axis-aligned rectangles, with normal arcs on the convex corners and inverted arcs on
the concave ones. (There's even a recent paper,
[Ragged Blocks](https://arxiv.org/html/2507.06460v3), formalizing rectilinear outlines
around styled text.)

That reframing makes the solution obvious: stop trying to trick per-element borders
into looking merged, and **actually compute the merged shape**.

## The technique

The whole thing is about 120 lines of dependency-free geometry with this signature:

```js
mergedOutline(rects, radius) // -> an SVG path string
```

You give it the client rects of the participating elements; it returns one path that
you fill (the background) and stroke (the border) in an absolutely-positioned SVG behind
the content. The participating elements themselves have **no CSS border or background at
all** — in the demo above, even the closed buttons are drawn this way.

Three steps:

**1. Union the rects into a rectilinear outline.** Because everything is axis-aligned,
you don't need a general polygon-boolean library. Collect the distinct x and y edge
coordinates into a small grid, mark which cells are covered by any rect, walk the
boundary edges into closed loops, and drop collinear points. For the two-to-five rects
involved in a popup, the grid is tiny.

**2. Round every corner with the same construction.** Walk each loop; at every vertex,
trim both adjacent segments by the radius and join them with an arc. The arc's sweep
direction comes from the turn direction:

```js
const sweep = (din.x * dout.y - din.y * dout.x) > 0 ? 1 : 0;
d += `L${p1.x} ${p1.y} A${r} ${r} 0 0 ${sweep} ${p2.x} ${p2.y}`;
```

**The concave corner — the thing that costs CSS implementations
their gnarliest hacks — is not a special case.** A convex corner turns one way, a
concave corner turns the other, and the sweep flag flips automatically. Same six lines
of code.

Two small details do the remaining work:

- **Clamp radii per-vertex** to half of each adjacent segment (`min(r, prev/2, next/2)`),
  so short edges shrink their corners instead of self-intersecting — the same rule
  `border-radius` uses.
- **Weld nearly-collinear edges.** Coordinates within ~1.25px merge into one grid line,
  so layout rounding never produces hairline jogs in the outline. This one constant
  replaces an entire family of `+0.5px` fudges from the CSS version.

**3. Keep it in sync.** Measure with `getBoundingClientRect`, snap to device pixels
(crisp 1px strokes), re-render from `ResizeObserver` and scroll events, and run a
`requestAnimationFrame` loop while an animation is active.

## The same function, on arbitrary boxes

Nothing above is popup-specific — `mergedOutline` doesn't know what a popup is. Here's
the raw machinery on three boxes you can push around (drag to move,
<kbd>shift</kbd>-drag to resize):

<iframe src="/examples/2026-07-15-contiguous-popup/embed-playground.html"
        style="width: 100%; height: 400px; border: none; border-radius: 8px; background: #141519;"
        loading="lazy"
        title="Draggable rect-union playground"></iframe>

Watch the corners as boxes slide past each other: convex corners become concave fillets
and dissolve back, radii shrink automatically as edges get short, and when two edges
almost line up they weld into one. Every frame is just the union, recomputed. This is
also the best intuition for the popup animation — the opening popup is nothing more
than one of these boxes growing out of another.

## Animate the inputs, not the path

The part I'm most pleased with. Path morphing is usually miserable — interpolating
between paths with different numbers of segments is a research topic. But here you
never need to morph the path: **animate the input rectangles and recompute the union
every frame.**

The popup's input rect starts as a sliver tucked inside the trigger and eases out to
its final size. At every instant, the outline is the correct merged shape for the
rects as they currently stand — corners appear and grow naturally as segments get long
enough to hold them, because of the radius clamping. The border visibly *grows around*
the popup, which is the "diving in" feeling this pattern is about. Scrub the timeline
in the demo to watch the shape evolve.

Other things become one-liners in this model:

- **Emphasize the trigger on open** by inflating its input rect a few pixels — "grow
  the border around the button" is literally `inflate(rect, 3)`.
- **A gradient that flows across the whole shape.** Because button and popup are one
  path, one `linearGradient` fills both continuously. The CSS version can't do this at
  all — its "background" is several separate rectangles.
- **One correct shadow.** `drop-shadow` on the merged path. The multi-element version
  gets shadows subtly wrong at the seam, always.
- **Reveal the popup's content** by clipping it with an `inset(... round r)` that tracks
  the animated rect.

## Caveats

- It's JavaScript-driven presentation. Pre-hydration you need a plain-border fallback,
  and a hostile layout (fonts loading, content reflow) can lag the outline by a frame if
  you're not observing aggressively.
- Rotated ancestors are out of scope. Scaled/translated ones work if you measure and
  draw in the same coordinate space.
- Sibling elements need thought: the open shape should paint above its neighbors, and
  dimming non-active siblings turns out to look good *and* dodge visual ambiguity about
  which button owns the popup.

None of these bite for a transient popup, which is exactly the use case.

## Where this goes

The prototype is a single HTML file — view source on the
[full demo](/examples/2026-07-15-contiguous-popup/) to see everything. The geometry
core has no DOM dependencies, which is the point: the plan is to port it into my Rust/Dioxus studio UI
(replacing a few hundred lines of the bridge-and-fillet CSS described above) and a
TypeScript version for work, with thin per-framework glue doing the measuring.

It still surprises me that there's no established library for "draw one outline around
these DOM elements." If you know of one — or know why there isn't — I'd like to hear
about it.
