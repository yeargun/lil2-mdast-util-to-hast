# lil2-mdast-util-to-hast

[mdast-util-to-hast](https://github.com/syntax-tree/mdast-util-to-hast) 13.2.1 rewritten in typed
[LilScript](https://lilscript.eddocu.com): an mdast arena in, a hast arena out, with the same trees as upstream.
Third layer of the **lil2** family (design: `lilscript/docs/lil2/design.md`). It embeds
[lil2-mdast-util-from-markdown](https://github.com/yeargun/lil2-mdast-util-from-markdown) as pinned source.

## Flat data

The hast tree is an arena of parallel arrays: kind, links, tag name, value, start and end offsets (line and
column come from the parser's line table), and properties as one flat list (name, kind, string, number, next).
`markdownToHast(value, allowDangerousHtml)` returns the tree as positional columns, the arena's own arrays and not
copies:

```
[root, kind, parent, firstChild, nextSibling, tagName, value, startOffset, endOffset, flags, meta,
 propHead, propName, propKind, propString, propNumber, propNext, lineStarts, kindNames]
```

CommonMark and GFM handlers (delete, tables, footnotes and the footnote section) are installed by default, as
upstream does.

## Behaviour

`test/differential.test.mjs` compares the hast with upstream's `toHast(fromMarkdown(md))` on 736 documents
(CommonMark spec, entities, edge cases, bench documents), in safe and `allowDangerousHtml` modes. Both trees are
compared as rows of indexed arrays: tag names, properties in order, `data.meta` and positions. All are equal. The
GFM handlers are covered by lil2-remark-gfm's tests.

```sh
npm install && npm run build:dev && npm test
```

## License

MIT; see NOTICE.md.
