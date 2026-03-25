# Plan: Blog Setup — Photomancer's Lab

## 1. Install Hugo

```bash
brew install hugo
```

## 2. Initialize Hugo site

From `~/dev/photomancer/lab`:

```bash
hugo new site . --force
```

`--force` because the directory already has `docs/` in it.

## 3. Add HugoTeX theme as submodule

```bash
git init
git submodule add https://github.com/kaisugi/HugoTeX.git themes/hugotex
```

## 4. Configure `hugo.toml`

```toml
baseURL = "https://lab.photomancer.art/"
languageCode = "en-us"
title = "Photomancer's Lab"
theme = "hugotex"

[params]
  author = "Yona Appletree"
  description = "Notes on software, light, and systems"
  favicon = ""
  math = true

[taxonomies]
  tag = "tags"

[markup]
  [markup.highlight]
    style = "github"
  [markup.goldmark.renderer]
    unsafe = true
```

Adjust based on what HugoTeX actually expects (check its `exampleSite/`
config).

## 5. Create `.gitignore`

```
public/
resources/
.hugo_build.lock
.DS_Store
```

## 6. Add CNAME for custom domain

Create `static/CNAME` containing:

```
lab.photomancer.art
```

Hugo copies `static/` contents to the build root, so GitHub Pages will find
the CNAME file.

## 7. Create first post

```bash
hugo new content posts/hello-world/index.md
```

Edit to add frontmatter and a short intro:

```markdown
---
title: "Hello, World"
date: 2026-03-25
tags: []
draft: false
---

Welcome to Photomancer's Lab.
```

## 8. Verify local preview

```bash
hugo server -D
```

Visit `http://localhost:1313`. Confirm the post renders with the HugoTeX theme.

## 9. Create GitHub repo and push

```bash
gh repo create photomancer-lab --public --source=. --remote=origin
git add -A
git commit -m "feat(blog): initial Hugo site with HugoTeX theme"
git push -u origin main
```

## 10. Add GitHub Actions deploy workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Hugo to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: true
          fetch-depth: 0

      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: "latest"
          extended: true

      - name: Build
        run: hugo --minify

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

Commit and push:

```bash
git add .github/
git commit -m "ci(blog): add GitHub Actions deploy to Pages"
git push
```

## 11. Configure GitHub Pages

Enable Pages with the **GitHub Actions** workflow (once per repo). Example:

```bash
gh api -X POST repos/Yona-Appletree/photomancer-lab/pages -f build_type=workflow
```

Then in `Settings → Pages` (after DNS for the custom domain is working, if needed):

- **Custom domain:** `lab.photomancer.art` (optional until DNS is set)
- **Enforce HTTPS:** ✓ when the certificate is available

GitHub will verify the domain and issue a TLS cert after the CNAME record points at `yona-appletree.github.io`.

## 12. Configure GoDaddy DNS

In GoDaddy DNS settings for `photomancer.art`, add:

| Type  | Name | Value                        | TTL    |
|-------|------|------------------------------|--------|
| CNAME | lab  | yona-appletree.github.io     | 1 hour |

GitHub Pages will handle the rest. DNS propagation may take up to an hour.

Optionally, verify the domain in GitHub (`Settings → Pages → Verified domains`)
for extra security.

## Validate

- [ ] `hugo server` runs locally and renders the hello-world post
- [ ] `git push` triggers the GitHub Actions workflow
- [ ] Actions workflow completes green
- [ ] `lab.photomancer.art` serves the site with HTTPS
- [ ] OpenGraph/Twitter Card meta tags present in page source
- [ ] RSS feed accessible at `/index.xml`
