# lil2-mdast-util-to-hast

[mdast-util-to-hast](https://github.com/syntax-tree/mdast-util-to-hast) 13.2.1 rewritten in typed
[LilScript](https://lilscript.eddocu.com): an mdast arena in, a hast arena out, with the same trees as upstream.
Third layer of the **lil2** family (design: `lilscript/docs/lil2/design.md`). It embeds
[lil2-mdast-util-from-markdown](https://github.com/yeargun/lil2-mdast-util-from-markdown) as pinned source.

## Flat data, int vocabularies

The hast tree is an arena of parallel arrays: kind, links, tag, value, start and end offsets (line and column come
from the parser's line table), and properties as one flat list (name, kind, string, number, next). Tags are ids into
`tagNames`, property names ids into `propNames`, and enumerated values (alignments, `checkbox`) ids into
`keywordNames`; to-hast never compares a string to find an element (a task-list item, a paragraph) — it reads
int ids and flags. Footnotes and definitions are found by the mdast's identifier ids. The property table carries
each property's JSX key per schema (generated from property-information), and layers that create more properties
(rehype-katex) add theirs with `defineProp`.

`markdownToHast(value, allowDangerousHtml)` returns the tree as positional columns, the arena's own arrays:

```
[root, kind, parent, firstChild, nextSibling, tag, value, startOffset, endOffset, flags, meta,
 propHead, propName, propKind, propString, propNumber, propNext, lineStarts, tagNames]
```

`propNames` and `keywordNames` are exports. CommonMark and GFM handlers (delete, tables, footnotes and the footnote
section) are installed by default, as upstream does. Builds: `dist/` and `dist/browser/` (named references decoded
by the document).

## In a chat app

This package is a layer of [lil2-react-markdown](https://github.com/yeargun/lil2-react-markdown), measured here as a whole: A chat of LLM-style replies (lists, code, tables, math, about 2.5 KB of markdown each), every reply streamed into the
page a few tokens at a time and rendered by React with GFM, math and KaTeX: react-markdown 10.1.0 with remark-gfm,
remark-math and rehype-katex → **this package's `/full` flavor**. Main-thread time, measured with Playwright in
Chromium 151, with Chrome's CPU throttling standing in for phones (4×: Lighthouse's mid-tier mobile; 6×: DevTools'
low-end mobile); median of 2 runs, libraries alternating, each in a fresh tab.

| | short chat (5 replies) | average chat (20 replies) | long chat (60 replies) |
|---|---:|---:|---:|
| CPU while the replies stream, mid-tier phone (4×) | 7.1 s → **3.2 s** (2.2×) | 29.1 s → **11.5 s** (2.5×) | 1.3 min → **31.0 s** (2.5×) |
| CPU while the replies stream, low-end phone (6×) | 11.2 s → **4.7 s** (2.4×) | 45.9 s → **17.7 s** (2.6×) | 2.0 min → **47.4 s** (2.5×) |
| CPU while the replies stream, this machine | 1.6 s → **0.8 s** (2.1×) | 6.8 s → **2.7 s** (2.5×) | 17.6 s → **7.0 s** (2.5×) |
| updates slower than a frame (16.7 ms), low-end phone (6×) | 125 → **6 of 1,053** | 671 → **6 of 4,615** | 1,318 → **67 of 12,897** |
| opening the saved chat, low-end phone (6×) | 417 ms → **317 ms** (1.3×) | 843 ms → **519 ms** (1.6×) | 1.77 s → **960 ms** (1.8×) |

Every streamed update renders exactly react-markdown's DOM ([`test/chat.test.mjs`](https://github.com/yeargun/lil2-react-markdown/blob/main/test/chat.test.mjs), Chromium and Firefox).
Reproduce with `npm run bench:chat` in lil2-react-markdown; the numbers are in [`bench/chat/results/mobile.json`](https://github.com/yeargun/lil2-react-markdown/blob/main/bench/chat/results/mobile.json).
The machine is one core of an AMD EPYC 7763; real phones vary.

## Install

```bash
npm install @itslil/lil2-mdast-util-to-hast
```

TypeScript types are included. One ES module per entry; Node, Deno, Bun and workers get `dist/`, bundlers targeting
browsers get `dist/browser/` through the `browser` condition.

## Use

```ts
import {markdownToHast, propNames, type HastColumns} from '@itslil/lil2-mdast-util-to-hast'
import {H_ELEMENT, P_STRING, TAG_A} from '@itslil/lil2-mdast-util-to-hast/constants'

const tree: HastColumns = markdownToHast('Read [the guide](https://example.com/guide "Guide").')
const [root, kind, , firstChild, nextSibling, tag, , , , , , propHead, propName, propKind, propString, , propNext, , tagNames] = tree

function* walk(node = root): Generator<number> {
  yield node
  for (let child = firstChild[node]; child >= 0; child = nextSibling[child]) yield* walk(child)
}
function attributes(node: number): Record<string, string> {
  const out: Record<string, string> = {}
  for (let p = propHead[node]; p >= 0; p = propNext[p]) if (propKind[p] === P_STRING) out[propNames[propName[p]]] = propString[p]
  return out
}

for (const node of walk()) {
  if (kind[node] === H_ELEMENT) console.log(tagNames[tag[node]]) // p, a
  if (kind[node] === H_ELEMENT && tag[node] === TAG_A) console.log(attributes(node)) // { href: '…', title: 'Guide' }
}
```

`markdownToHast(value, allowDangerousHtml?)` runs mdast-util-from-markdown and mdast-util-to-hast with remark-rehype's
defaults; `allowDangerousHtml` keeps raw HTML as `raw` nodes.

The tree is positional columns, indexed by node id (types: `HastColumns`; `propNames` and `keywordNames` come with
the main entry). Ids are arena slots: walk from `root`, since a node a transform replaced (rehype-katex replaces math
elements) keeps its slot but is no longer linked.

| # | column | per node |
|---|---|---|
| 0 | `root` | the root's id |
| 1 | `kind` | an `H_*` constant: root, element, text, raw, comment, doctype |
| 2–4 | `parent`, `firstChild`, `nextSibling` | node ids, -1 for none |
| 5 | `tag` | an element's tag id: its name is `tagNames[tag]`, compare with `TAG_*` |
| 6 | `value` | text, comment and raw content |
| 7–8 | `startOffset`, `endOffset` | offsets into the source |
| 9 | `flags` | `HN_*` bits |
| 10 | `meta` | a code block's meta string |
| 11 | `propHead` | an element's first property, -1 for none; properties continue along `propNext` |
| 12–16 | `propName`, `propKind`, `propString`, `propNumber`, `propNext` | per property: name id (`propNames`), `P_*` kind, string value, number value (booleans 0/1, keyword ids into `keywordNames`), next |
| 17 | `lineStarts` | the offset each line starts at |
| 18 | `tagNames` | tag names by id |

The constants (`H_*`, `HN_*`, `P_*`, `KW_*`, `TAG_*`, `PROP_*`, and the mdast `K_*`, `N_*`, `ALIGN_*`) come from
`@itslil/lil2-mdast-util-to-hast/constants`, with literal types.

### Which package

| you want | package |
|---|---|
| React elements | [`@itslil/lil2-react-markdown`](https://github.com/yeargun/lil2-react-markdown) (`/gfm`, `/full` for GFM, math, KaTeX) |
| an HTML string, CommonMark | [`@itslil/lil2-micromark`](https://github.com/yeargun/lil2-micromark) |
| an HTML string with GFM, math or KaTeX | `renderToStaticMarkup` of lil2-react-markdown's `/full` flavor (below) |
| mdast (syntax tree) | [`lil2-mdast-util-from-markdown`](https://github.com/yeargun/lil2-mdast-util-from-markdown); with GFM [`lil2-remark-gfm`](https://github.com/yeargun/lil2-remark-gfm), math [`lil2-remark-math`](https://github.com/yeargun/lil2-remark-math), breaks [`lil2-remark-breaks`](https://github.com/yeargun/lil2-remark-breaks) |
| elements from hast columns through any JSX runtime | [`lil2-hast-util-to-jsx-runtime`](https://github.com/yeargun/lil2-hast-util-to-jsx-runtime) |
| hast (HTML tree) | [`lil2-mdast-util-to-hast`](https://github.com/yeargun/lil2-mdast-util-to-hast) and the same three, or [`lil2-rehype-katex`](https://github.com/yeargun/lil2-rehype-katex) with formulas rendered |

Every package is one self-contained ES module with no runtime dependencies (React and KaTeX aside), ships its
TypeScript types, and resolves to a Node build or a browser build through its `exports` conditions.
## Measured (2026-10-04)

The `browser` build against mdast-util-to-hast@13.2.1 bundled for the browser with esbuild and minified by Terser, esbuild and Oxc
(the smallest shown). Each objective is its own LilScript build (effort level 12, `lazy_functions`).

| | lil2 | upstream, best minifier | difference |
|---|---:|---:|---:|
| raw | 58,540 | 73,664 (Terser) | −20.5% |
| gzip (9) | 19,061 | 20,315 (Terser) | −6.2% |
| Brotli (11) | 16,688 | 18,178 (Terser) | −8.2% |

Speed, upstream → lil2: markdown to hast, median per call in a fresh browser context per lane, after checking that both
give the same output (Playwright; Chromium 151, Firefox 153; AMD EPYC 7763 64-Core Processor). Cold rows are the first import and the
first call of a fresh page.

| | Chromium | Firefox |
|---|---:|---:|
| chat (1 KB) | 0.67 → 0.26 ms (0.40×) | 1.11 → 0.54 ms (0.48×) |
| readme (26 KB) | 15.2 → 6.20 ms (0.41×) | 31.0 → 13.0 ms (0.42×) |
| large (222 KB) | 156 → 62.5 ms (0.40×) | 375 → 123 ms (0.33×) |
| import, cold | 4.90 → 5.10 ms | 10.0 → 11.0 ms |
| first call, cold | 11.1 → 10.7 ms | 14.0 → 11.0 ms |

## Behaviour

`test/differential.test.mjs` compares the hast with upstream's `toHast(fromMarkdown(md))` on 736 documents
(CommonMark spec, entities, edge cases, bench documents), in safe and `allowDangerousHtml` modes. Both trees are
compared as rows of indexed arrays: tag names, properties in order, `data.meta` and positions. All are equal, and
`test/browser.test.mjs` checks the browser build in Chromium and Firefox. The GFM handlers are covered by
lil2-remark-gfm's tests.

```sh
npm install && npm run build:dev && npm test
```

## License

MIT; see NOTICE.md.
