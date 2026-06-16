# Changelog

## [0.6.1] - 2026-06-17

### Added

- Phase 3 cleanup pipeline — collapes multiple spaces, capitalizes orphaned lowercase after sentence-ending punctuation (`. ! ?`)
- `removeBannedWords` transform with dataset-backed severity-gated replace mode (high severity only in `replace` mode)

### Changed

- Pipeline reordered into 3 explicit phases: Phase 1 (Promote: additive enrichment), Phase 2 (Replace: strict pattern fixes), Phase 3 (Cleanup: whitespace + recase)
- `removeBannedWords` moved to Phase 2, running before `applyContractions` and `diversifyVocabulary` — multi-word banned phrases (e.g. "it is important to note that") now caught intact
- `applyContractions` moved from Phase 1 to Phase 2 — prevents contraction of "it is" → "it's" before banned phrase match
- `diversifyVocabulary` moved from Phase 1 to Phase 2 — runs after banned word removal to avoid replacing words that should be deleted

### Fixed

- Multi-word banned phrases broken by Phase 1 transforms running first — contractions were shortening "it is important to note that" to "it's important to note that" before `removeBannedWords` could match
- Double spaces and orphaned lowercase after phrase removal (e.g., ".  this" → ". This")

## [0.6.0] - 2026-06-16

### Added

- 3 new sentence datasets: `repetitive.jsonl` (378 records, upstream: Humanize-Text + Kimble + MS Wordiness), `contractions.jsonl` (133 records, upstream: JamesHight/node-contractions), `banned-words.jsonl` (70 records, upstream: b1rdmania/plain-english-skill)
- `scripts/extract/repetitive-from-plain-english.py` — fetches verbose→concise pairs from 3 upstream sources
- `scripts/extract/contractions-from-upstream.py` — parses JS word-lookup, reverses for contraction direction
- `scripts/extract/banned-words-from-sources.py` — curated AI-slop and plain-English violation lists
- `RepetitiveEntry`, `ContractionEntry`, `BannedWordEntry` types in `src/sentences/types.ts`
- `repetitive`, `contractions`, `bannedWords` exports in `src/sentences/index.ts`
- CLI datasets commands extended from 6→9 datasets (status, check, update)
- `markdownlint` v0.41.0 post-transform validation — `lintMarkdown()` runs after every `fabricateText()`, JSON output includes `lint` field with issue counts
- `--lint-fix` (`--lint`) flag on `fabricate` command — auto-patches markdown syntax issues via `fixMarkdown()`, reports `lintFixed` count in output
- `fixMarkdown()` export — applies markdownlint `fixInfo` in reverse line/column order to avoid offset corruption
- `markdownlint/sync` local type declarations in `src/types/markdownlint.d.ts` — avoids `.mts` resolution issue with `moduleResolution: "node"`
- Pre-fork enhancement phase — stabilize module before forking into articpub-ai
- Real mode transforms for blog (blank-line collapse + H1), newsletter (TL;DR auto-extract + blank collapse), tutorial (Prerequisites section + H1), landing (single blank-line collapse + H1)
- Input validation for `--voice` flag — warns on unknown voice names
- Voice profile type safety — `profile: VoiceProfile` instead of `profile: any` in assembly pipeline
- Commander v13 CLI layer — all subcommands defined with `.command()`, `.argument()`, `.option()`
- Zod v3 runtime validation layer via `src/core/schema.ts` — typed schemas with sensible defaults

### Changed

- Monolithic `src/md-fabrication.ts` completely removed — CLI now exclusively uses modular `src/cli/index.ts`
- CLI migrated from manual `process.argv` to Commander v13 subcommands (14 commands: fabricate, graph, orphans, image-map, backlinks, assemble, lint, edit-docs, update-index, update-log, link-up, gather, ingest, session)
- Hardcoded config fallback synced with `config.yaml` — 8 field-level discrepancies fixed across casual, professional, technical, personal-branding profiles
- Frontmatter parsing switched from naive `line.indexOf(':')` to `yaml.load()`
- `sentencesRestructured` counter now tracks `conjStart + sentStart` (was double-counting `conjunctionSoftened`)
- 17 `any` types replaced with proper interfaces across config, assembly, CLI, wiki, hedging
- Common validation helpers extracted: `requireDir()`, `requireFile()`, `recordRun()`
- Test script updated to use `fabricate` subcommand

### Fixed

- Contractions profile toggle now respected — was applying unconditionally
- 5 empty catch blocks now log errors (session, wiki, assembly)
- `heging.ts` callback type — removed `as any` cast, changed to `(...args: string[]) => string`

### Removed

- Duplicate `countTokens` in `src/core/token-budget.ts` — canonical version in `helpers.ts`
- 4 unused `MD_FABRICATION_*` environment variables from `.env.example`
- `getPositionalArg()`, `getPositionalArgs()`, `getFlagArg()` from `helpers.ts` — replaced by Commander's argument/option parsing
- Manual `showHelp()` function — replaced by Commander's auto-generated `--help`

## [0.5.0] - 2026-06-13

### Added

- Hybrid ESM/CJS module architecture with separate tsconfigs (`tsconfig.esm.json`, `tsconfig.cjs.json`)
- Mode system: blog, changelog, default, landing, newsletter, readme, tutorial — each with dedicated pipeline + exports
- `resolve-root.ts` — shared `PROJECT_ROOT` helper compatible with both ESM and CJS
- 4 missing assembly exports: `assembleFragments`, `enhanceTrilogy`, `assembleTrilogy`, `rewireWikilinks`
- `TREE-SNAPSHOT.md` — project structure snapshot

### Changed

- Version bump from 0.4.0 to 0.5.0
- Monolithic `md-fabrication.ts` refactored into modular `src/core/`, `src/transforms/`, `src/modes/`, `src/cli/`
- `import.meta.url` replaced with shared `resolve-root.ts` for CJS compatibility
- Generated output now at `dist/cjs/` and `dist/esm/` with full `.d.ts` and sourcemaps

### Removed

- Scaffolding Python scripts (`gen.py`, `gen2.py`, `gen_assembly.py`)

## [0.4.0] - 2026-06-09

### Added

- Wiki ingest workflow with new CLI modes:
  - `--edit-docs <dir>` — infer and prepend YAML frontmatter for fragments missing it (title, tags, depends_on, source)
  - `--update-index <dir>` — regenerate `index.md` page catalog organized by tags
  - `--update-log <dir> <action> <desc>` — append timestamped entry to `log.md`
  - `--link-up <dir>` — rewire `[[wikilinks]]` to `[text](#slug)` anchor links, deduplicate duplicate headings with `(A)`, `(B)` suffixes
  - `--gather <dir>` — standalone DAG order preview (cycles detected + reported)
  - `--ingest <file> --target <dir>` — full ingest pipeline: create fragment from raw article, infer frontmatter, update index + log
- Helper functions: `extractFirstHeading()`, `extractWikilinkRefs()`, `editDocs()`, `updateIndex()`, `updateLog()`, `linkUp()`, `ingest()`
- Automatic `raw/` → `sources/` directory inference for `--ingest` when no `--target` specified

### Changed

- Version bump from 0.3.0 to 0.4.0
- `showHelp()` updated with new CLI options and examples
- `main()` extended with 6 new mode handlers

## [0.3.0] - 2026-06-09

### Added

- `--assemble <dir>` — wiki fragment compilation pipeline (DAG-based)
- `parseFragment()` — YAML frontmatter parser using `js-yaml`
- `gatherFragments()` — scan directory for `.md` fragments (excludes `index.md`, `log.md`, `README.md`)
- `buildDepGraph()` — topological sort via `dependency-graph` with cycle detection
- `assembleFragments()` — concatenate fragments in DAG order with `> **Source:**` labels, TOC, and References section
- `generateToc()` — extract heading structure as a bullet list
- `collectReferences()` — aggregate unique `[[wikilinks]]` and `[urls]` across fragments
- Supports `--voice <voice>` for post-assembly humanization pass
- `dependency-graph` dependency added

### Changed

- Version bump from 0.2.0 to 0.3.0
- README.md updated with `--assemble` usage

## [0.2.0] - 2026-06-08

### Added

- `vocabularyDiversity` flag — replace common words with synonyms
- `hedgePhrases` flag — inject softening phrases ("tends to", "often", "typically")
- `conjunctionStarts` flag — begin sentences with "And", "But", "So", "Yet"
- `sentenceVariety` flag — randomize sentence opening patterns
- `diversifyVocabulary()` — synonym replacement for overused words
- `hedgeAbsoluteStatements()` — softens definitive language
- `addConjunctionStarts()` — sentence-initial conjunctions with comma handling
- `varySentenceOpenings()` — shuffle sentence starters
- All 4 flags integrated into `VoiceProfile`, `config.yaml`, `FabricationSummary`, `renderSummaryTable()`, and all 3 voice profiles

### Changed

- Version bump from 0.1.2 to 0.2.0

## [0.1.2] - 2026-06-08

### Added

- Graph/document relationship topology: `LinkRef`, `ImageRef`, `GraphNode`, `Graph`, `ImageMap`, `GraphFileResult` interfaces
- `extractLinks()` -- extract markdown links from body text
- `extractImages()` -- extract image references from body text
- `scanMarkdownFiles()` -- recursive `.md` file scanner with skip-dir support
- `analyzeGraphFile()` -- single-file graph analysis (links, images, frontmatter)
- `buildGraph()` -- build node/edge graph from analyzed files
- `findOrphans()` -- detect documents with no inbound/outbound links
- `findBacklinks()` -- find documents linking to a target
- `buildImageMap()` -- categorize images as local/remote/bucket/broken
- `--graph` flag -- output full document relationship graph
- `--orphans` flag -- list orphan documents
- `--image-map` flag -- show image categorization
- `--backlinks <file>` -- find backlinks to a specific file

### Changed

- Version bump from 0.1.1 to 0.1.2
- Sharpened lint: removed unnecessary initial assignments in `extractImages()` and `analyzeGraphFile()`

## [0.1.1] - 2026-06-08

### Added

- `config.yaml` -- standalone YAML config (tool name, voice defaults, budget, session)
- `eslint.config.mjs` -- TypeScript linting with `@typescript-eslint` recommended rules
- `typecheck` and `lint` npm scripts (`tsc --noEmit`, `eslint src/`)
- `CHANGELOG.md` -- project changelog

### Changed

- Version bump from 0.1.0 to 0.1.1
- `package.json` `files` array includes `config.yaml`, `eslint.config.mjs`, `CHANGELOG.md`
- `devDependencies` added: `eslint`, `@eslint/js`, `typescript-eslint`

## [0.1.0] - 2026-06-08

### Added

- Initial release
- Markdown humanization pipeline: soften conjunctions, passive-to-active, contractions, transitions, pacing, repetition removal
- Voice profiles: casual, professional, technical
- Dry-run mode (`--dry-run`) with diff preview
- Apply mode (`--apply`) to write changes in-place
- JSON output (`--json`)
- Session token budget tracking (`--session`)
- Token counting via `js-tiktoken` (GPT-4 encoding)
- Frontmatter preservation (YAML frontmatter extracted, rewritten, reattached)
- Run logging to `log/<sessionId>.json`
- `hooks.toml` configuration
