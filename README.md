# Photomancer Lab

Personal site and blog: [lab.photomancer.art](https://lab.photomancer.art/).

Built with [Hugo](https://gohugo.io/) and [HugoTeX](https://github.com/kaisugi/HugoTeX).

## Local preview

```bash
pnpm install
pnpm turbo dev
```

Open [http://localhost:1313](http://localhost:1313).

## Writing

Add posts under `content/post/`. See `themes/hugotex/exampleSite/content/post/` for front matter
examples.

### TypeScript posts

TypeScript-heavy posts can use the `*.post.ts` suffix. These are real TypeScript files that generate
ignored `*.gen.md` files for Hugo.

```ts
import { md, post, ts } from "../../src/ts-post";

post({
  title: "My Checked Post",
  date: "2026-06-10",
});

md`
Markdown prose goes here.
`;

const value = 1 satisfies number;

ts`
const renderedOnly = "this appears as a TypeScript code block";
`;
```

Run the full gate:

```bash
pnpm turbo validate
```

For live writing, `pnpm turbo dev` regenerates TypeScript post Markdown and runs the Hugo server.
Generated front matter fields like `author` and `url` are filled in by the post compiler.

## GitHub Pages

The workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) builds on every push to
`main`. The site is served at:

- **Default:** https://yona-appletree.github.io/photomancer-lab/

**Custom domain** (`lab.photomancer.art`): [static/CNAME](static/CNAME) is copied into the site root
on build. In GoDaddy DNS for `photomancer.art`, add a **CNAME** record: host `lab` →
`yona-appletree.github.io`. After DNS propagates, open the repo **Settings → Pages** and set the
custom domain to `lab.photomancer.art` (or wait for GitHub to pick up the `CNAME` file), then enable
**Enforce HTTPS** when the certificate is ready.

If you create a new repo from this pattern, GitHub Pages must be turned on once. With the GitHub
CLI:

```bash
gh api -X POST repos/OWNER/REPO/pages -f build_type=workflow
```

## License

Content and configuration: see repository license (if any). HugoTeX is MIT.
