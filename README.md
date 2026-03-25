# Photomancer Lab

Personal site and blog: [lab.photomancer.art](https://lab.photomancer.art/).

Built with [Hugo](https://gohugo.io/) and [HugoTeX](https://github.com/kaisugi/HugoTeX).

## Local preview

```bash
hugo server -D
```

Open [http://localhost:1313](http://localhost:1313).

## Writing

Add posts under `content/post/`. See `themes/hugotex/exampleSite/content/post/` for front matter examples.

## GitHub Pages

The workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) builds on every push to `main`. The site is served at:

- **Default:** https://yona-appletree.github.io/photomancer-lab/

**Custom domain** (`lab.photomancer.art`): [static/CNAME](static/CNAME) is copied into the site root on build. In GoDaddy DNS for `photomancer.art`, add a **CNAME** record: host `lab` → `yona-appletree.github.io`. After DNS propagates, open the repo **Settings → Pages** and set the custom domain to `lab.photomancer.art` (or wait for GitHub to pick up the `CNAME` file), then enable **Enforce HTTPS** when the certificate is ready.

If you create a new repo from this pattern, GitHub Pages must be turned on once. With the GitHub CLI:

```bash
gh api -X POST repos/OWNER/REPO/pages -f build_type=workflow
```

## License

Content and configuration: see repository license (if any). HugoTeX is MIT.
