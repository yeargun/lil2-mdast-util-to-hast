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

## Measured (2026-10-04)

The `browser` build against mdast-util-to-hast@13.2.1 bundled for the browser with esbuild and minified by Terser, esbuild and Oxc
(the smallest shown). Each objective is its own LilScript build (effort level 12, `lazy_functions`).

| | lil2 | upstream, best minifier | difference |
|---|---:|---:|---:|
| raw | 58,540 | 73,664 (Terser) | −20.5% |
| gzip (9) | 19,061 | 20,315 (Terser) | −6.2% |
| Brotli (11) | 16,719 | 18,178 (Terser) | −8.0% |

Speed, upstream → lil2: markdown to hast, median per call in a fresh browser context per lane, after checking that both
give the same output (Playwright; Chromium 151, Firefox 153; AMD EPYC 7763 64-Core Processor). Cold rows are the first import and the
first call of a fresh page.

| | Chromium | Firefox |
|---|---:|---:|
| chat (1 KB) | 0.71 → 0.29 ms (0.41×) | 1.11 → 0.58 ms (0.53×) |
| readme (26 KB) | 16.5 → 6.60 ms (0.40×) | 33.0 → 12.8 ms (0.39×) |
| large (222 KB) | 168 → 69.6 ms (0.42×) | 375 → 125 ms (0.33×) |
| import, cold | 5.00 → 5.10 ms | 10.0 → 11.0 ms |
| first call, cold | 11.5 → 10.9 ms | 13.0 → 11.0 ms |

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
