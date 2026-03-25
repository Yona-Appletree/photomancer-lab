# Blog Setup Design — Photomancer Lab

## Scope

Set up a Hugo blog at `~/dev/photomancer/lab`, deployed to `lab.photomancer.art`
via GitHub Pages.

## Decisions

- **Domain:** `lab.photomancer.art` (owned on GoDaddy)
- **Author:** Yona Appletree
- **Repo:** `Yona-Appletree/photomancer-lab`, public
- **Theme:** `kaisugi/HugoTeX` (LaTeX-inspired, dark/light, sidenotes)
- **Tags:** typescript, rust, architecture, photography, hardware, leds
- **Deploy:** GitHub Actions → GitHub Pages (`gh-pages` branch)

## File Structure

```
~/dev/photomancer/lab/
├── hugo.toml
├── .gitignore
├── .github/
│   └── workflows/
│       └── deploy.yml
├── content/
│   └── posts/
│       └── hello-world/
│           └── index.md
├── themes/
│   └── hugotex/                  # git submodule → kaisugi/HugoTeX
├── static/
│   └── CNAME                     # lab.photomancer.art
└── docs/
    └── plans/
        └── 2026-03-25-blog-setup/
```

## Architecture

```
 Write markdown     git push       GitHub Actions      GitHub Pages
┌──────────┐    ┌──────────┐    ┌───────────────┐    ┌──────────────┐
│ content/  │───▶│  main    │───▶│ hugo --minify  │───▶│ lab.         │
│ posts/    │    │  branch  │    │ → public/      │    │ photomancer  │
│ foo/      │    │          │    │ → gh-pages      │    │ .art         │
│ index.md  │    └──────────┘    └───────────────┘    └──────────────┘
└──────────┘
                                 GoDaddy DNS:
                                 CNAME lab → yona-appletree.github.io
```

- **Local preview:** `hugo server` (hot reload, drafts)
- **Deploy:** push main → Actions builds → gh-pages branch → served at domain
