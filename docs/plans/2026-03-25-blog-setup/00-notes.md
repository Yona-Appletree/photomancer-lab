# Blog Setup Plan — Photomancer Lab

## Scope of Work

Set up a Hugo-based blog at `~/dev/photomancer/lab`:

- Initialize a Hugo site with the HugoTeX theme (`kaisugi/HugoTeX`)
- Configure site metadata, SEO (OpenGraph, Twitter Cards, sitemap, RSS)
- Create a GitHub repo `photomancer-lab` under `Yona-Appletree`
- Set up GitHub Actions for automatic deploy to GitHub Pages on push
- Ensure local preview works with `hugo server`
- Write a first placeholder post to verify the full pipeline

## Current State

- `~/dev/photomancer/lab/` exists but is empty (only `docs/plans/`)
- Hugo is **not installed** — needs `brew install hugo`
- GitHub username: `Yona-Appletree`
- No existing repo named `photomancer-lab` (assumed)
- Theme: `kaisugi/HugoTeX` (MIT, LaTeX-inspired, supports dark/light, sidenotes, OpenGraph/Twitter Cards)

## Questions

### Q1: Custom domain?

**Answer:** `lab.photomancer.art` — domain already owned on GoDaddy. Will set up
a CNAME record pointing to GitHub Pages. Hugo `baseURL` will be
`https://lab.photomancer.art/`. Plan will include DNS setup instructions.

### Q2: Author info for site metadata?

**Answer:** "Yona Appletree" as site author. Professional tone.

### Q3: Repo visibility?

**Answer:** Public. Copyleft attitude — open source is the default.

### Q4: Content categories?

**Answer:** Enable tags from the start. Initial tags: `typescript`, `rust`,
`architecture`, `photography`, `hardware`, `leds`. Skip categories — tags are
flexible and don't impose hierarchy.
