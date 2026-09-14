#!/usr/bin/env node
//
// Fills the translated dictionaries from the English one.
//
// Adding a string to `en.ts` and running this writes the Dutch and Spanish
// equivalents — no hand-writing, and no key can be forgotten. Translation
// happens here rather than at runtime because a button label does not change
// between renders: paying latency and tokens on every page load to re-translate
// "Save" would be absurd, and it would put a network dependency in front of the
// interface.
//
// The output is a normal source file, so translations arrive as a reviewable
// diff rather than appearing silently in production.
//
//   node scripts/translate.mjs            # fill only missing keys
//   node scripts/translate.mjs --all      # retranslate everything
//
// Requires ANTHROPIC_API_KEY.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'

const here = path.dirname(fileURLToPath(import.meta.url))
const DICT_DIR = path.join(here, '..', 'src', 'lib', 'i18n', 'dictionaries')

const TARGETS = {
  nl: {
    name: 'Dutch (Netherlands)',
    guidance: `Use informal "je", never "u" — Dutch banking apps settled on this and "u" reads as stiff.
Use the vocabulary a Dutch bank statement uses: Saldo, Uitgaven, Inkomsten, Rekeningen, Overboeking.
Keep it short. Dutch runs longer than English and these strings sit in buttons and narrow columns.`,
  },
  es: {
    name: 'Spanish (Spain)',
    guidance: `Use informal "tú", never "usted" — Spanish banking apps address people this way.
Use the vocabulary a Spanish bank statement uses: Saldo, Gastos, Ingresos, Cuentas, Patrimonio.
Keep it short. Spanish runs longer than English and these strings sit in buttons and narrow columns.`,
  },
}

const SYSTEM = `You translate interface strings for a personal finance app.

Rules, in order of importance:

1. Placeholders like {count}, {amount}, {date} are code. Reproduce every one exactly, spelled the same. Never add, drop, rename or translate one. A dropped placeholder renders a sentence with a hole in it.
2. Translate the meaning, not the words. These are interface strings, so what matters is that a native speaker would recognise it as how their own banking app phrases things.
3. Keep the register: plain, direct, calm. No exclamation marks that are not in the source. No marketing tone.
4. Preserve trailing ellipses ("Saving…"), capitalisation style, and any punctuation that carries meaning.
5. Financial terms must be the ones actually used on a bank statement in that country, not literal translations.

Return only a JSON object mapping each key to its translation. No commentary.`

function parseDictionary(source) {
  // The dictionaries are plain object literals, so the exported shape can be
  // read by evaluating just the literal — no TypeScript compiler needed.
  //
  // The literal has to be found by matching braces rather than by taking the
  // last one in the file: en.ts ends with the `Dictionary` *type*, whose
  // closing brace would otherwise swallow the type definition and any
  // `as const` along with it.
  const declaration = source.search(/export const \w+(?::\s*Dictionary)?\s*=/)
  if (declaration === -1) throw new Error('Could not find the dictionary declaration')

  const start = source.indexOf('{', declaration)
  if (start === -1) throw new Error('Could not find the dictionary object literal')

  let depth = 0
  let end = -1
  let inString = null
  let inComment = null // 'line' | 'block'

  for (let i = start; i < source.length; i++) {
    const char = source[i]
    const next = source[i + 1]

    // Comments are skipped before anything else. An apostrophe in prose —
    // "the account's language" — would otherwise open a string that never
    // closes, and every brace after it would be read as being inside it.
    if (inComment === 'line') {
      if (char === '\n') inComment = null
      continue
    }
    if (inComment === 'block') {
      if (char === '*' && next === '/') {
        inComment = null
        i++
      }
      continue
    }

    // Braces inside a string ("{count} accounts") must not affect the depth.
    if (inString) {
      if (char === '\\') i++
      else if (char === inString) inString = null
      continue
    }

    if (char === '/' && next === '/') {
      inComment = 'line'
      i++
      continue
    }
    if (char === '/' && next === '*') {
      inComment = 'block'
      i++
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      inString = char
      continue
    }

    if (char === '{') depth++
    else if (char === '}') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }

  if (end === -1) throw new Error('Unbalanced braces in the dictionary literal')

  const literal = source
    .slice(start, end + 1)
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/,(\s*[}\]])/g, '$1')

  // eslint-disable-next-line no-new-func -- our own source file, not user input
  return new Function(`return (${literal})`)()
}

async function translateSection(client, { locale, sectionName, entries }) {
  const target = TARGETS[locale]

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-opus-5',
    max_tokens: 8192,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low' },
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Translate these interface strings into ${target.name}.

${target.guidance}

Section: "${sectionName}" (for context on where these appear).

${JSON.stringify(entries, null, 2)}`,
      },
    ],
  })

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')

  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`No JSON in the reply for ${locale}.${sectionName}`)
  return JSON.parse(match[0])
}

/** A translation that lost or invented a placeholder is rejected, not shipped. */
function checkPlaceholders(source, translated, locale, section) {
  const problems = []
  for (const [key, english] of Object.entries(source)) {
    const expected = new Set(String(english).match(/\{\w+\}/g) ?? [])
    const actual = new Set(String(translated[key] ?? '').match(/\{\w+\}/g) ?? [])

    const missing = [...expected].filter((p) => !actual.has(p))
    const extra = [...actual].filter((p) => !expected.has(p))
    if (missing.length || extra.length) {
      problems.push(`${locale}.${section}.${key}: missing ${missing} extra ${extra}`)
    }
  }
  return problems
}

function render(locale, dictionary) {
  const header = `import type { Dictionary } from './en'

// ${TARGETS[locale].name}.
//
// Generated by scripts/translate.mjs from en.ts, then committed as source.
// Typed as Dictionary, so a missing key will not compile.
//
// Edit freely — the script only fills in keys that are missing unless run with
// --all, so hand corrections survive.
export const ${locale}: Dictionary = `

  const body = JSON.stringify(dictionary, null, 2)
    // Quote only the keys that need it, matching how the rest of the codebase
    // is written.
    .replace(/^(\s*)"([a-zA-Z_$][\w$]*)":/gm, '$1$2:')
    .replace(/"/g, "'")
    // Re-escape apostrophes that are now inside single-quoted strings.
    .replace(/([a-zA-ZÀ-ÿ])'([a-zA-ZÀ-ÿ])/g, "$1\\'$2")

  return `${header}${body}\n`
}

async function main() {
  const retranslateAll = process.argv.includes('--all')

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set.')
    process.exit(1)
  }

  const english = parseDictionary(readFileSync(path.join(DICT_DIR, 'en.ts'), 'utf8'))
  const client = new Anthropic()
  let failures = 0

  for (const locale of Object.keys(TARGETS)) {
    const file = path.join(DICT_DIR, `${locale}.ts`)
    let existing = {}
    try {
      existing = parseDictionary(readFileSync(file, 'utf8'))
    } catch {
      // First run for this language.
    }

    const result = {}
    for (const [section, entries] of Object.entries(english)) {
      const current = existing[section] ?? {}

      const todo = Object.fromEntries(
        Object.entries(entries).filter(([key]) => retranslateAll || !current[key])
      )

      if (Object.keys(todo).length === 0) {
        result[section] = current
        continue
      }

      process.stdout.write(`${locale}/${section}: ${Object.keys(todo).length} string(s)… `)
      const translated = await translateSection(client, { locale, sectionName: section, entries: todo })

      const problems = checkPlaceholders(todo, translated, locale, section)
      if (problems.length > 0) {
        console.log('REJECTED')
        problems.forEach((p) => console.error(`  ${p}`))
        failures += problems.length
        // Keep whatever was already there rather than writing a broken string.
        result[section] = { ...current, ...entries }
        continue
      }

      console.log('ok')
      result[section] = { ...current, ...translated }
    }

    writeFileSync(file, render(locale, result))
    console.log(`wrote ${path.relative(process.cwd(), file)}`)
  }

  if (failures > 0) {
    console.error(`\n${failures} string(s) failed placeholder validation and were left untranslated.`)
    process.exit(1)
  }

  console.log('\nDone. Review the diff, then run `npm run typecheck`.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
