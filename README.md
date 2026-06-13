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
| **DAG preview** | Show topological order of wiki fragments (`--gather`) |

### Why md-fabrication?

- **LLM-aware** — Targets common LLM writing patterns: rigid conjunctions, passive constructions, uniform rhythm
- **Agent-native** — Every command produces `--json` output with structured data and error codes
- **Safe** — `--dry-run` before `--apply`, code blocks are always preserved
- **Follows md-analyzer pattern** — Same TypeScript CLI, `hooks.toml`, session tracking, run logs

---

## Installation

### From npm

```bash
npm install -g @ev3lynx/md-fabrication
md-fabrication --help
```

### From source

```bash
cd micromark/md-fabrication
npm install
npm run build
```

### Quick test

```bash
node md-fabrication.js README.md --json
```

---

## Usage

### Basic CLI

```bash
# Analyze without applying changes
md-fabrication article.md --json

# Apply humanization in-place
md-fabrication article.md --apply --voice casual --json

# Preview changes (colorized diff in terminal)
md-fabrication article.md --dry-run --voice professional

# Check session token budget
md-fabrication README.md --session --budget 50000 --json

# Document graph analysis
md-fabrication ./docs --graph --json
md-fabrication ./docs --orphans
md-fabrication ./docs --image-map
md-fabrication ./docs --backlinks README
```

### Options

| Flag | Description | Example |
|------|-------------|---------|
| `--json` | Output as JSON | `--json` |
| `--apply` | Write changes in-place | `--apply` |
| `--dry-run` | Show diff without writing (colorized) | `--dry-run` |
| `--voice <voice>` | Target voice: casual, professional, technical | `--voice casual` |
| `--session` | Token budget report | `--session` |
| `--budget <n>` | Set token budget limit | `--budget 50000` |
| `--graph` | Build document relationship graph for a directory | `md-fabrication ./docs --graph` |
| `--orphans` | Find orphan documents (no inbound/outbound links) | `md-fabrication ./docs --orphans` |
| `--image-map` | Categorize all images (local/remote/bucket/broken) | `md-fabrication ./docs --image-map` |
| `--backlinks <target>` | Find documents linking to a specific file | `md-fabrication ./docs --backlinks README` |
| `--assemble <dir>` | Compile wiki fragments into article (DAG-based) | `md-fabrication --assemble sources/ --dry-run --json` |
| `--trilogy` | Split assembled article into 3 parts by DAG depth (requires `--dry-run` or `--apply`) | `md-fabrication --assemble sources/ --trilogy --dry-run --json` |
| `--enhance` | Add series navigation, combined TOC, part metadata (with `--trilogy`) | `md-fabrication --assemble sources/ --trilogy --enhance --dry-run` |
| `--lint <dir>` | Validate wiki fragments for issues (broken links, missing frontmatter, cycles) | `md-fabrication --lint sources/ --json` |
| `--gather <dir>` | Preview DAG order of fragments | `md-fabrication --gather sources/ --json` |
| `--edit-docs <dir>` | Infer and prepend frontmatter for fragments missing it | `md-fabrication --edit-docs sources/` |
| `--update-index <dir>` | Regenerate index.md page catalog | `md-fabrication --update-index sources/` |
| `--update-log <dir> <action> <desc>` | Append timestamped entry to log.md | `md-fabrication --update-log sources/ ingest "New Article"` |
| `--link-up <dir>` | Rewire wikilinks and deduplicate headings | `md-fabrication --link-up sources/` |
| `--ingest <file> --target <dir>` | Ingest a raw article into the wiki | `md-fabrication --ingest raw/article.md --target sources/` |

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

To add a new voice (e.g. `storyteller`), add a profile block to `config.yaml` — no code changes needed.

| Voice | Contractions | Transitions | Passive→Active | Conjunctions | Pacing | Repetitive | Vocabulary | Hedge | Conj Starts | Sentence Variety |
|-------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `casual` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `professional` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| `technical` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |

### Examples

```bash
# Analyze an article for fabricate suggestions
md-fabrication article.md --json

# Casual humanize
md-fabrication article.md --apply --voice casual --json

# Professional polish
md-fabrication article.md --apply --voice professional --json

# Preview changes first
md-fabrication article.md --dry-run --voice casual --json

# Track token usage
md-fabrication article.md --session --budget 50000 --json

# Document graph (JSON)
md-fabrication ./docs --graph --json

# Find orphan documents
md-fabrication ./docs --orphans

# Categorize images
md-fabrication ./docs --image-map --json

# Find backlinks to a specific file
md-fabrication ./docs --backlinks README

# Wiki assembly (DAG-based fragment compilation)
md-fabrication --assemble sources/ --dry-run --json
md-fabrication --assemble sources/ --voice casual --apply
md-fabrication --assemble sources/ --trilogy --dry-run --json
md-fabrication --assemble sources/ --trilogy --enhance --dry-run --json

# Lint wiki fragments
md-fabrication --lint sources/ --json

# Preview DAG order
md-fabrication --gather sources/

# Wiki management
md-fabrication --edit-docs sources/
md-fabrication --update-index sources/
md-fabrication --link-up sources/
md-fabrication --update-log sources/ ingest "New Article"
md-fabrication --ingest raw/article.md --target sources/
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

### Fabrication Output (--json)

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
  "tokensUsed": 1500
}
```

### Graph Output (--json --graph)

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
│   └── md-fabrication.ts      # Main source (TypeScript)
├── md-fabrication.js          # Compiled output
├── md-fabrication.d.ts        # Type declarations
├── hooks.toml                 # Configuration
├── config.yaml                # Standalone YAML config (voice profiles)
├── eslint.config.mjs          # ESLint config
├── CHANGELOG.md               # Version history
├── FEATURE-ASSEMBLE.md        # Wiki assembly spec
└── log/                       # Run logs
```

### Dependencies

- `js-tiktoken` — GPT-4 token counting
- `ascii-table3` — Summary rendered as ASCII tables in terminal output

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
md-fabrication article.md --apply --voice casual --json
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
| `MD_FABRICATION_PATH` | Path to md-fabrication.js | `md-fabrication.js` |
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

### Flags

| Flag | Description |
|------|-------------|
| `--graph` | Full document relationship graph with nodes and edges |
| `--orphans` | List files with no inbound or outbound links |
| `--image-map` | Categorize images as local/remote/bucket/broken |
| `--backlinks <target>` | Find all files that link to a specific document |

### Use Cases

- **Content audit** — Find orphan articles that aren't linked from anywhere
- **Site migration** — Map all internal links before restructuring
- **Broken image detection** — Find `![alt](local.png)` references where the file doesn't exist
- **Cross-reference analysis** — Discover which articles reference a specific topic file

### Example

```bash
# Full graph of a docs directory
md-fabrication ./docs --graph --json

# Find orphans (unlinked documents)
md-fabrication ./docs --orphans

# Check all images
md-fabrication ./docs --image-map

# Find what links to a specific article
md-fabrication ./docs --backlinks getting-started
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

---

## License

MIT - See [LICENSE](LICENSE) file.

---

## Links

- **npm:** <https://npmjs.com/package/@ev3lynx/md-fabrication>
- **GitHub:** <https://github.com/Ev3lynx727/micromark>
- **Issues:** <https://github.com/Ev3lynx727/micromark/issues>
