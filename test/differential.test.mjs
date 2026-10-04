// Same hast as upstream mdast-util-to-hast (on upstream's mdast), in safe and dangerous modes, as rows.
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {fromMarkdown} from 'mdast-util-from-markdown'
import {toHast} from 'mdast-util-to-hast'
import {corpus} from './corpus.mjs'
import {fromColumns, fromObjects} from './rows.mjs'
const {markdownToHast, propNames, keywordNames} = await import(new URL(process.env.LIL2_ARTIFACT ?? '../.dev/dist/to-hast.js', import.meta.url))

for (const allowDangerousHtml of [false, true]) {
  test(`hast equals upstream (allowDangerousHtml: ${allowDangerousHtml})`, () => {
    const failures = []
    for (const c of corpus()) {
      const expected = fromObjects(toHast(fromMarkdown(c.markdown), {allowDangerousHtml}))
      try {
        assert.deepStrictEqual(fromColumns(markdownToHast(c.markdown, allowDangerousHtml), propNames, keywordNames), expected)
      } catch (error) {
        failures.push({name: c.name, markdown: c.markdown.slice(0, 160), error: String(error.message).slice(0, 900)})
      }
    }
    if (failures.length) console.log(JSON.stringify({failures: failures.length, first: failures.slice(0, 3)}, null, 1))
    assert.equal(failures.length, 0)
  })
}
