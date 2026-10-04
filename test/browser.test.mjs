// The browser build (the `browser` condition) in real browsers, where named references are decoded by
// the document: same hast as upstream, compared as rows.
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {fromMarkdown} from 'mdast-util-from-markdown'
import {toHast} from 'mdast-util-to-hast'
import {browsers, inBrowser} from './browser.mjs'
import {corpus} from './corpus.mjs'
import {fromColumns, fromObjects} from './rows.mjs'
const artifact = new URL(process.env.LIL2_BROWSER_ARTIFACT ?? '../dist/browser/to-hast.js', import.meta.url)
const cases = corpus()

for (const name of browsers) {
  test(`browser build in ${name}: hast equals upstream`, async () => {
    const out = await inBrowser(name, artifact, (lib, markdowns) => ({
      propNames: lib.propNames, keywordNames: lib.keywordNames,
      trees: markdowns.map(m => [lib.markdownToHast(m, false), lib.markdownToHast(m, true)])
    }), cases.map(c => c.markdown))
    const failures = []
    cases.forEach((c, i) => [false, true].forEach((allowDangerousHtml, m) => {
      try {
        assert.deepStrictEqual(fromColumns(out.trees[i][m], out.propNames, out.keywordNames), fromObjects(toHast(fromMarkdown(c.markdown), {allowDangerousHtml})))
      } catch (error) {
        failures.push({name: c.name, allowDangerousHtml, error: String(error.message).slice(0, 500)})
      }
    }))
    if (failures.length) console.log(JSON.stringify({failures: failures.length, first: failures.slice(0, 3)}, null, 1))
    assert.equal(failures.length, 0)
  })
}
