# md-fabrication

> Humanize LLM-generated markdown into natural, readable prose — tone, pacing, transitions, voice.

**md-fabrication** is a lightweight, agent-ready content humanization tool designed for AI publishing workflows. It takes raw LLM-generated `.md` and makes it read human — varies sentence length, adds natural transitions, adjusts pacing, and applies consistent voice.

Part of the [micromark](https://github.com/Ev3lynx727/micromark) monorepo alongside `@ev3lynx/md-analyzer` and `@ev3lynx/articpub-ai`.

---

## Quick Overview

| Feature | Description |
|---------|-------------|
| **Conjunction softening** | Replace "Firstly, Secondly, Thirdly..." with natural alternatives |
| **Passive → Active** | Convert passive constructions to active voice |
| **Natural transitions** | Add "However,", "That said,", "Meanwhile," between paragraphs |
| **Voice control** | casual / professional / technical |
| **Contractions** | "do not" → "don't" (casual voice only) |
| **Pacing** | Break up long consecutive sentences |
| **Vocabulary diversity** | Replace overused words with synonyms |
| **Hedge phrases** | Soften absolute statements ("always" → "often") |
| **Conjunction starts** | Begin sentences with "And", "But", "So", "Yet" |
| **Sentence variety** | Randomize sentence opening patterns |
| **Dry-run** | Preview changes without writing (colorized diff) |
| **Session tracking** | Token budget via `/tmp/md-fabrication-session.json` |
| **Table output** | Summary rendered as ASCII table via `ascii-table3` |
| **Document graph** | Analyze document relationships, backlinks, orphans |
| **Image map** | Categorize images (local/remote/bucket/broken) |
| **Wiki assembly** | Compile DAG-ordered `.md` fragments into an article (`--assemble`) |
| **Fragment lint** | Validate wiki fragments for broken links, cycles, missing frontmatter (`--lint`) |
| **DAG preview** | Show topological order of wiki fragments |
| **Zod validation** | All CLI inputs validated through typed Zod schemas |

### Why md-fabrication?

- **LLM-aware** — Targets common LLM writing patterns: rigid conjunctions, passive constructions, uniform rhythm
- **Agent-native** — Every command produces `--json` output with structured data and error codes
- **Safe** — `--dry-run` before `--apply`, code blocks are always preserved
- **Commander + Zod** — All 14 subcommands with typed argument/option parsing, validated at runtime through Zod v3 schemas

---

## Installation

### From npm

```bash
npm install -g @ev3lynx/md-fabrication
  mdfab --help
```

### From source

```bash
cd micromark/md-fabrication
npm install
npm run build
```

### Python dependencies (datasets)

Some extraction scripts (for `mdfab datasets --update`) require Python packages:

```bash
cd micromark/md-fabrication/scripts
pip install -r requirements.txt
```

### Quick test

```bash
node dist/cjs/cli/index.js fabricate README.md --json --dry-run

# Or if installed globally:
mdfab fabricate README.md --dry-run --json
```

---

## Usage

### Commands

All operations are invoked as subcommands. Every subcommand supports `--json` for structured output and `--help` for usage details. Use `mdfab` as shorthand.

| Command | Description |
|---------|-------------|
| `fabricate` (alias `f`) | Humanize a markdown file with voice + mode transforms + lint auto-fix |
| `graph` | Build document relationship graph for a directory |
| `orphans` | Find orphan documents (no inbound/outbound links) |
| `image-map` | Categorize all images (local/remote/bucket/broken) |
| `backlinks <doc> <dir>` | Find documents linking to a specific file |
| `assemble` | Compile wiki fragments into article (DAG-based) |
| `lint` | markdownlint on single files; fragment lint + markdownlint per `.md` on directories |
| `datasets` | Manage sentence datasets (fetch, extract, status) |
| `edit-docs` | Infer and prepend frontmatter for fragments missing it |
| `update-index` | Regenerate index.md page catalog |
| `update-log` | Append timestamped entry to log.md |
| `link-up` | Rewire wikilinks and deduplicate headings |
| `gather` | Preview DAG order of fragments |
| `ingest` | Ingest a raw article into the wiki |
| `session` | Show token budget report |

### `fabricate` Options

| Flag | Description | Example |
|------|-------------|---------|
| `-v, --voice <voice>` | Target voice: casual, professional, technical, personal-branding | `--voice personal-branding` |
| `-m, --mode <mode>` | Mode transform: default, readme, blog, changelog, newsletter, tutorial, landing | `--mode blog` |
| `-d, --dry-run` | Show diff without writing (colorized) | `--dry-run` |
| `-a, --apply` | Write changes in-place | `--apply` |
| `-j, --json` | Output as JSON | `--json` |
| `-b, --budget <n>` | Set token budget limit | `--budget 50000` |
| `-s, --session` | Token budget report | `--session` |
| `-l, --lint-fix` | Auto-fix markdownlint issues after transforms | `--lint-fix` |

### `assemble` Options

| Flag | Description |
|------|-------------|
| `-v, --voice <voice>` | Post-assembly humanization voice |
| `-d, --dry-run` | Preview assembled content |
| `-a, --apply` | Write output file to `../output/assembled.md` |
| `-t, --trilogy` | Split into 3 parts by DAG depth (requires `--dry-run` or `--apply`) |
| `-e, --enhance` | Add series nav, combined TOC, part metadata (with `--trilogy`) |
| `-j, --json` | Output as JSON |

### `lint` Options

| Flag | Description |
|------|-------------|
| `-f, --fix` | Auto-fix markdownlint issues in-place |
| `-j, --json` | Output structured JSON |

**Single file mode** — runs `markdownlint` on one `.md` and returns issues with error/warning counts.

**Directory mode** — runs fragment lint (broken links, missing frontmatter, cycles) + `markdownlint` per `.md` file.

#### Lint JSON output (single file)

```json
{
  "file": "doc.md",
  "issues": [
    { "lineNumber": 3, "ruleNames": ["MD047"], "ruleDescription": "File should end with a newline", "errorRange": [3, 1], "fixInfo": { "insertText": "\n" } }
  ],
  "errorCount": 1,
  "warningCount": 0,
  "fixed": 0,
  "durationMs": 12
}
```

#### Directory JSON output

```json
{
  "directory": "sources/",
  "fragmentIssues": { "cycles": [], "brokenLinks": [], "missingFrontmatter": ["old-notes.md"] },
  "markdownlintIssues": { "totalErrors": 3, "totalWarnings": 7, "files": 12 },
  "errors": 3,
  "warnings": 7,
  "infos": 0,
  "durationMs": 145
}
```

### `datasets` Options

| Flag | Description |
|------|-------------|
| `-s, --status` | Show record counts and timestamps per dataset |
| `-c, --check` | Dry-run: check upstream availability without writing |
| `-u, --update` | Fetch sources, extract sentences, write JSONL, copy to `dist/` |

### `ingest` Options

| Flag | Description |
|------|-------------|
| `-t, --target <dir>` | Target fragments directory (default: `../sources` relative to file) |
| `-j, --json` | Output as JSON |

### `session` Options

| Flag | Description |
|------|-------------|
| `-b, --budget <n>` | Token budget limit |
| `-j, --json` | Output as JSON |

### Voices

Voices are config-driven — defined in `config.yaml` under `voice.profiles`. Each profile toggles which transformations run:

```yaml
voice:
  default: professional
  profiles:
    casual:
      contractions: true
      transitions: true
      passiveToActive: true
      conjunctionSoftening: true
      pacing: true
      repetitivePhrases: true
      vocabularyDiversity: true
      hedgePhrases: true
      conjunctionStarts: true
      sentenceVariety: true
    professional:
      contractions: false
      transitions: true
      passiveToActive: true
      conjunctionSoftening: true
      pacing: true
      repetitivePhrases: true
      vocabularyDiversity: true
      hedgePhrases: true
      conjunctionStarts: false
      sentenceVariety: true
    technical:
      contractions: false
      transitions: false
      passiveToActive: true
      conjunctionSoftening: false
      pacing: false
      repetitivePhrases: true
      vocabularyDiversity: true
      hedgePhrases: false
      conjunctionStarts: false
      sentenceVariety: false
```

To add a new voice, add a profile block to `config.yaml` — no code changes needed.

| Voice | Contractions | Transitions | Passive→Active | Conjunctions | Pacing | Repetitive | Vocabulary | Hedge | Conj Starts | Sentence Variety |
|-------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `casual` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `professional` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| `technical` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `personal-branding` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Personal Branding Voice

The `personal-branding` voice encodes the **CTO+CEO+Storyteller blend** — authoritative without being stiff, narrative without being casual. Designed for engineering thought leadership and technical memoir.

All transformations active except contractions: short punchy sentences, active voice, conjunction starts for narrative flow, hedge phrases for strategic softening, natural transitions between ideas.

```bash
# Polish an article for personal brand / thought leadership
mdfab fabricate article.md --apply --voice personal-branding --json

# Preview changes first
mdfab fabricate article.md --dry-run --voice personal-branding
```

### Examples

```bash
# Analyze an article for humanization suggestions
mdfab fabricate article.md --json

# Casual humanize
mdfab fabricate article.md --apply --voice casual --json

# Professional polish
mdfab fabricate article.md --apply --voice professional --json

# Preview changes first
mdfab fabricate article.md --dry-run --voice casual --json

# Personal-branding polish
mdfab fabricate article.md --apply --voice personal-branding --json

# Apply transforms + auto-fix markdown issues
mdfab fabricate article.md --apply --lint-fix --json

# Mode transforms + markdownlint
mdfab fabricate article.md --apply --mode blog --lint-fix

# Lint a single file with auto-fix
mdfab lint doc.md --fix

# Lint an entire directory (fragment lint + markdownlint)
mdfab lint sources/ --json

# Dataset management
mdfab datasets --status
mdfab datasets --update

# Track token usage
mdfab session --budget 50000 --json

# Document graph (JSON)
mdfab graph ./docs --json

# Find orphan documents
mdfab orphans ./docs

# Categorize images
mdfab image-map ./docs --json

# Find backlinks to a specific file
mdfab backlinks README ./docs

# Wiki assembly (DAG-based fragment compilation)
mdfab assemble sources/ --dry-run --json
mdfab assemble sources/ --voice casual --apply
mdfab assemble sources/ --trilogy --dry-run --json
mdfab assemble sources/ --trilogy --enhance --dry-run --json

# Lint wiki fragments (directory mode)
mdfab lint sources/ --json

# Single file lint with auto-fix
mdfab lint assembled.md --json --fix

# Preview DAG order
mdfab gather sources/

# Wiki management
mdfab edit-docs sources/
mdfab update-index sources/
mdfab link-up sources/
mdfab update-log sources/ ingest "New Article"
mdfab ingest raw/article.md --target sources/
```

---

## Transformations

| Transformation | Example | Modes |
|---|---|---|
| **Conjunction softening** | "Firstly..." → "First..." | All voices |
| **Passive → Active** | "was built" → "built" | All voices |
| **Natural transitions** | _blank line_ → "However, ..." | All voices |
| **Contractions** | "do not" → "don't" | Casual only |
| **Pacing** | Split long consecutive sentences | All voices |
| **Repetitive phrase removal** | "In order to" → "To" | All voices |
| **Vocabulary diversity** | "important" → "critical" | All voices |
| **Hedge phrases** | "always" → "often" | Casual, Professional |
| **Conjunction starts** | _new paragraph_ → "And ..." | Casual only |
| **Sentence variety** | "The ..." → "Notably, ..." | Casual, Professional |

### Fabrication Output (`fabricate --json`)

```json
{
  "file": "article.md",
  "fileName": "article",
  "voice": "casual",
  "totalChanges": 23,
  "changesApplied": false,
  "summary": {
    "sentencesRestructured": 3,
    "transitionsAdded": 4,
    "contractionsApplied": 3,
    "passiveToActive": 1,
    "conjunctionSoftened": 2,
    "pacingAdjusted": 2,
    "vocabularyDiversified": 3,
    "hedgePhrasesInjected": 2,
    "conjunctionStartsAdded": 1,
    "sentenceOpeningsVaried": 2
  },
  "tokensUsed": 1500,
  "lint": {
    "issues": [],
    "errorCount": 0,
    "warningCount": 0
  },
  "lintFixed": 0
}
```

### Graph Output (`graph --json`)

```json
{
  "graph": {
    "nodes": {
      "README": { "inbound": [], "outbound": ["API"], "images": [] },
      "API": { "inbound": ["README"], "outbound": [], "images": [] }
    },
    "edges": [
      { "source": "README", "target": "API", "type": "link" }
    ]
  },
  "stats": { "totalFiles": 2, "totalNodes": 2, "totalEdges": 1, "orphans": 0 }
}
```

---

## Architecture

```text
md-fabrication/
├── src/
│   ├── cli/
│   │   └── index.ts              # Commander v13 CLI (14 subcommands)
│   ├── core/
│   │   ├── assembly.ts           # Wiki fragment assembly pipeline
│   │   ├── config.ts             # Config loading (YAML + defaults)
│   │   ├── frontmatter.ts        # Frontmatter parse/infer
│   │   ├── graph.ts              # Document graph analysis
│   │   ├── helpers.ts            # Common validation utilities
│   │   ├── index.ts              # Core barrel exports
│   │   ├── lint.ts               # Fragment linting
│   │   ├── resolve-root.ts       # Project root resolution
│   │   ├── schema.ts             # Zod v3 runtime validation
│   │   ├── session.ts            # Token budget tracking
│   │   ├── types.ts              # Shared type definitions
│   │   └── wiki.ts               # Wiki management (ingest, index, log, link-up, edit-docs)
│   ├── modes/                    # Mode transforms (blog, newsletter, etc.)
│   │   ├── blog.ts
│   │   ├── changelog.ts
│   │   ├── default.ts
│   │   ├── index.ts
│   │   ├── landing.ts
│   │   ├── newsletter.ts
│   │   ├── readme.ts
│   │   └── tutorial.ts
│   ├── transforms/               # Text transformation modules
│   │   ├── conjunction-starts.ts
│   │   ├── conjunctions.ts
│   │   ├── contractions.ts
│   │   ├── fabricate.ts          # fabricateText() orchestration
│   │   ├── hedging.ts
│   │   ├── index.ts
│   │   ├── pacing.ts
│   │   ├── passive.ts
│   │   ├── repetitive.ts
│   │   ├── sentence-variety.ts
│   │   ├── transitions.ts
│   │   └── vocabulary.ts
│   └── index.ts                  # Entry point
├── config.yaml                   # Voice profiles (YAML)
├── eslint.config.mjs             # ESLint config
├── CHANGELOG.md                  # Version history
└── log/                          # Run logs
```

### Dependencies

- `commander` ^13 — Subcommand-based CLI with typed argument/option parsing
- `zod` ^3 — Runtime schema validation for all CLI inputs
- `js-tiktoken` — GPT-4 token counting
- `ascii-table3` — Summary rendered as ASCII tables in terminal output
- `yaml` — Frontmatter parsing

### Key Functions

| Function | Description |
|----------|-------------|
| `softenConjunctions()` | Replace rigid "Firstly, Secondly..." patterns |
| `passiveToActive()` | Convert "was built" → "built" |
| `applyContractions()` | Contract "do not" → "don't" (casual voice) |
| `addTransitions()` | Insert natural transitions between paragraphs |
| `adjustPacing()` | Break up long consecutive sentences |
| `removeRepetitivePhrases()` | Replace verbose phrases with concise alternatives |
| `diversifyVocabulary()` | Replace overused words with synonyms |
| `hedgeAbsoluteStatements()` | Soften definitive language ("always" → "often") |
| `addConjunctionStarts()` | Begin sentences with "And", "But", "So", "Yet" |
| `varySentenceOpenings()` | Randomize sentence opening patterns |
| `fabricateText()` | Orchestrate all transformations in sequence |
| `loadSession()` / `saveSession()` | Token budget tracking |
| `requireDir()` / `requireFile()` | Commander post-parse validation helpers |
| `recordRun()` | Log run to session file |
| `extractLinks()` | Extract markdown links from body text |
| `extractImages()` | Extract image references from body text |
| `scanMarkdownFiles()` | Recursive `.md` file scanner with skip-dir support |
| `analyzeGraphFile()` | Single-file graph analysis (links, images, frontmatter) |
| `buildGraph()` | Build node/edge graph from analyzed files |
| `findOrphans()` | Detect documents with no inbound/outbound links |
| `findBacklinks()` | Find documents linking to a target |
| `buildImageMap()` | Categorize images as local/remote/bucket/broken |
| `gatherFragments()` | Scan directory for `.md` wiki fragments with frontmatter |
| `buildDepGraph()` | Build DAG from `depends_on` edges with cycle detection |
| `assembleFragments()` | Topo-sort + concatenate + TOC + References |
| `splitTrilogy()` | Split fragments into 3 parts by DAG depth |
| `enhanceTrilogy()` | Add series navigation, combined TOC, part metadata |
| `assembleTrilogy()` | Compile trilogy: split + assemble + enhance + humanize |
| `lintDirectory()` | Validate fragments for broken links, missing frontmatter, cycles |
| `editDocs()` | Infer and prepend frontmatter for fragments missing it |
| `updateIndex()` | Regenerate index.md page catalog |
| `updateLog()` | Append timestamped entry to log.md |
| `linkUp()` | Rewire wikilinks and deduplicate headings |
| `ingest()` | Full ingest pipeline: create fragment, infer frontmatter, update index + log |

---

## Integration with articpub-ai

`md-fabrication` is the humanization stage in the articpub pipeline:

```text
pub research → pub draft → pub fabricate → pub verify → pub post
```

When `pub fabricate` is called, it delegates to `md-fabrication`:

```bash
# Internal invocation
mdfab fabricate article.md --apply --voice casual --json
```

---

## Configuration

### config.yaml (Voice Profiles)

```yaml
voice:
  default: professional
  profiles:
    casual:
      contractions: true
      transitions: true
      passiveToActive: true
      conjunctionSoftening: true
      pacing: true
      repetitivePhrases: true
      vocabularyDiversity: true
      hedgePhrases: true
      conjunctionStarts: true
      sentenceVariety: true
    professional:
      contractions: false
      transitions: true
      passiveToActive: true
      conjunctionSoftening: true
      pacing: true
      repetitivePhrases: true
      vocabularyDiversity: true
      hedgePhrases: true
      conjunctionStarts: false
      sentenceVariety: true
    technical:
      contractions: false
      transitions: false
      passiveToActive: true
      conjunctionSoftening: false
      pacing: false
      repetitivePhrases: true
      vocabularyDiversity: true
      hedgePhrases: false
      conjunctionStarts: false
      sentenceVariety: false
```

Add a new voice by extending `voice.profiles` — no code changes required.

### hooks.toml

```toml
[tool.md-fabrication.config]
default_voice = "professional"
default_budget = 50000
max_tokens = 100000
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MD_FABRICATION_PATH` | Path to CLI entry point | `dist/cjs/cli/index.js` |
| `MD_FABRICATION_DEFAULT_VOICE` | Default voice | `professional` |
| `MD_FABRICATION_MAX_TOKENS` | Max token limit | `100000` |
| `MD_FABRICATION_DEFAULT_BUDGET` | Default budget | `50000` |

---

## Session & Logging

### Session File

Location: `/tmp/md-fabrication-session.json`

```json
{
  "sessionId": "session-1234567890",
  "calls": 3,
  "totalTokens": 4500,
  "filesProcessed": 3,
  "startTime": "2026-06-08T12:00:00.000Z"
}
```

### Run Logs

Location: `{project}/log/{sessionId}.json`

```json
[
  {
    "timestamp": "2026-06-08T12:00:00.000Z",
    "sessionId": "session-1234567890",
    "file": "article.md",
    "voice": "casual",
    "changes": 12,
    "changesApplied": false,
    "tokensUsed": 1500,
    "durationMs": 320,
    "mode": "analyze"
  }
]
```

---

## Document Graph Analysis

Analyze relationships between markdown files in a directory — track link topology, find orphans, detect broken images.

### Subcommands

| Command | Description |
|---------|-------------|
| `graph <dir>` | Full document relationship graph with nodes and edges |
| `orphans <dir>` | List files with no inbound or outbound links |
| `image-map <dir>` | Categorize images as local/remote/bucket/broken |
| `backlinks <doc> <dir>` | Find all files that link to a specific document |

### Use Cases

- **Content audit** — Find orphan articles that aren't linked from anywhere
- **Site migration** — Map all internal links before restructuring
- **Broken image detection** — Find `![alt](local.png)` references where the file doesn't exist
- **Cross-reference analysis** — Discover which articles reference a specific topic file

### Examples

```bash
# Full graph of a docs directory
mdfab graph ./docs --json

# Find orphans (unlinked documents)
mdfab orphans ./docs

# Check all images
mdfab image-map ./docs

# Find what links to a specific article
mdfab backlinks getting-started ./docs
```

---

## Table Output

When not using `--json`, the summary is rendered as an ASCII table:

```text
+--------------------------+-------+
|     Transformation       | Count |
+--------------------------+-------+
| Sentences Restructured   |     3 |
| Transitions Added        |     4 |
| Contractions Applied     |     3 |
| Passive → Active         |     1 |
| Conjunctions Softened    |     2 |
| Pacing Adjusted          |     2 |
| Vocabulary Diversified   |     3 |
| Hedge Phrases Injected   |     2 |
| Conjunction Starts       |     1 |
| Sentence Openings Varied |     2 |
+--------------------------+-------+
```

---

## Colorized Diff

The `--dry-run` output shows removed lines in **red** and added lines in **green** using ANSI escape codes for easy visual scanning.

---

## Error Handling

| Error | Description |
|-------|-------------|
| `file_not_found` | Specified `.md` file does not exist |
| `dir_not_found` | Directory specified for graph mode does not exist |
| `no_positional_arg` | Missing required file or directory argument |
| `scan_error` | Error reading a file during directory scan (non-fatal) |
| `cycle_detected` | Dependency cycle found in `depends_on` graph (assemble/lint) |
| `no_fragments` | No `.md` files found in assemble/gather/lint target directory |
| `unknown_command` | Unknown subcommand entered at CLI |
| `validation_error` | Zod schema validation failure — typed error with field paths |
| `missing_required_arg` | Commander caught missing positional argument |

---

## License

MIT - See [LICENSE](LICENSE) file.

---

## Links

- **npm:** <https://npmjs.com/package/@ev3lynx/md-fabrication>
- **GitHub:** <https://github.com/Ev3lynx727/micromark>
- **Issues:** <https://github.com/Ev3lynx727/micromark/issues>
