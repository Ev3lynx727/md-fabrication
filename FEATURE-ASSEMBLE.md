# Feature Proposal: Wiki → Article Compilation Pipeline

> **Status:** `--assemble` implemented in v0.3.0 — `ingest`, `query`, `lint`, `index.md`, `log.md`, `ASSEMBLE.md`, and trilogy mode are future scope.

Inspired by [Karpathy's pattern for persistent wikis](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

## Three-Layer Architecture

```
raw/           immutable source documents (articles, papers, notes)
   ↓                        ↓
sources/       LLM-maintained wiki — interlinked .md fragments
   ↓                        ↓
schema/        assembly rules (config.yaml, ASSEMBLE.md)
```

**`--assemble` is one operation** on top of this architecture: it compiles the wiki fragments into a deliverable article. But the wiki itself is the persistent artifact — fragments are cross-referenced, kept current, and compounded over time.

---

## Wiki Operations (beyond just assembly)

### Ingest (add a new source → update wiki)

```
1. --edit-docs    infer frontmatter from heading + [[links]]
2. --gather       scan sources, build DAG from depends_on
3. --link-up      merge fragments with wikilink rewire + heading dedup
4. --update-index regenerate index.md (page catalog)
5. --update-log   append entry to log.md
```

Single-source ingest flow (Karpathy's pattern):
1. Drop article into `raw/`
2. Run `md-fabrication --ingest raw/new-article.md`
3. LLM reads source, summarizes, updates `sources/*.md` (creates entity pages, concept pages, cross-references)
4. `index.md` and `log.md` are auto-updated

### Query (ask questions against the wiki)

```
md-fabrication --query "What does the hybrid prototype look like?"
  → reads index.md, finds relevant sources/*.md pages
  → synthesizes answer with [[citations]]
  → optionally files answer back into wiki as a new page
```

### Lint (health-check the wiki)

```
md-fabrication --lint sources/
  → checks for:
    - contradictions between pages
    - stale claims superseded by newer sources
    - orphan pages with no inbound links
    - missing cross-references
    - gaps that could be filled with web search
```

### Assemble (compile wiki → article)

```
md-fabrication --assemble sources/ --voice casual --output ./article.md
  → topo-sort fragments
  → heading dedup + wikilink rewire
  → inject section transitions
  → generate TOC + References
  → fabricateText with voice profile
```

---

## Pipeline (chained internally by `--assemble`)

```
sources/*.md (wiki fragments)
    |
    +-- no frontmatter? -> Step 1: --edit-docs
    |                      infer from heading + [[links]]
    |
    v
 Step 2: --gather
    |  parse frontmatter, build DAG from depends_on
    |  detect cycles, topological sort for merge order
    |
    v
 Step 3: --link-up
    |  wikilink rewiring  [[frag#section]] -> [[#section-frag]]
    |  duplicate heading collapse  ## X -> ## X (A) / ## X (B)
    |  fragment boundary transitions
    |  external URL styling  [text](url) -> <a> block
    |
    v
 Step 4: --assemble
    |  concatenate in topo order
    |  generate TOC from headings
    |  append ## References aggregating all [[links]] + URLs
    |
    v
 md-fabrication output/article.md --voice casual --apply
    |  final humanization pass
    |
    v
 output/article.md  (finished deliverable)
```

---

## Frontmatter Format (per fragment)

```yaml
---
title: "Agentic Workflows in Practice"
tags: [agents, orchestration, ai]
depends_on:
  - schema-design.md
  - tool-vs-skill.md
order: 3
status: draft              # draft | reviewed | final
source: raw/paper-2024.pdf # optional link back to immutable source
---
```

Fragments without `depends_on` -> root nodes.
Fragments without `order` -> sorted lexicographically within DAG level.

---

## Link-Up Semantics

| Source | In fragment | After merge |
|--------|-------------|-------------|
| `[[schema-design]]` | Wikilink to another doc | `[[#schema-design]]` or inlined via anchor |
| `[[schema-design#overview]]` | Wikilink with anchor | `[[#schema-design-overview]]` |
| `[source](https://...)` | External URL | `[source](https://...)` + optional `<a>` style wrapper |
| `## Methodology` | Duplicate heading | `## Methodology (A)` / `## Methodology (B)` |
| `index.md` / `log.md` | Auto-managed catalog | Excluded from assembly |

---

## CLI Interface

```bash
# Wiki management
md-fabrication --ingest raw/article.md        # add source -> update wiki
md-fabrication --query "question"             # search wiki + answer
md-fabrication --lint sources/                # health check

# Assembly (compilation to article)
md-fabrication --assemble sources/            # one-shot compile
md-fabrication --assemble sources/ --voice casual --output ./final.md
md-fabrication --assemble sources/ --dry-run  # DAG preview only

# Standalone sub-steps
md-fabrication --edit-docs sources/
md-fabrication --gather sources/              # + --graph / --orphans
md-fabrication --link-up sources/
```

---

## Schema: ASSEMBLE.md

Following Karpathy's pattern, the schema is a document that configures the LLM/wiki maintainer. It lives alongside `config.yaml` and describes:

```markdown
# ASSEMBLE.md -- Wiki Schema for md-fabrication

## Structure
- sources/*.md   -> wiki fragments with YAML frontmatter
- raw/*          -> immutable source documents (do not edit)
- index.md       -> auto-generated page catalog
- log.md         -> auto-generated append-only changelog

## Conventions
- Every fragment has `title`, `tags`, `depends_on` in frontmatter
- `depends_on` edges define the DAG for topological sort
- [[wikilinks]] use full fragment names (no aliases)
- Entities (people, concepts, tools) get their own page when mentioned in 3+ fragments

## Assembly Rules
- Root fragments (no depends_on) provide the # Title
- Transitions between fragments use the `transitions` system at section level
- Duplicate headings are suffixed with (A), (B), ...
- External URLs in References are rendered as styled HTML blocks
```

The schema evolves with the project -- user and LLM co-author it.



---

## Special Files

### `index.md` -- content catalog

Auto-generated on every ingest. Lists every page with link + one-line summary + metadata. The LLM reads this first when answering queries.

```
## Entities
- [[agentic-workflows]] -- overview of agent orchestration
- [[schema-design]] -- data structure principles

## Concepts
- [[hybrid-prototype]] -- tools + skills combined
- [[dependency-graph]] -- DAG-based fragment ordering

## Sources
- [[raw/paper-2024]] -- academic paper on LLM agents
```

### `log.md` -- chronological record

Append-only. Each entry starts with a parseable prefix for Unix tools:

```
## [2026-06-09] ingest | Agentic Workflows Paper
## [2026-06-09] query | "What is the hybrid prototype?"
## [2026-06-09] assemble | casual voice -> output/article.md
```

`grep "^## \\[" log.md | tail -5` gives the last 5 entries.

---

## Future: Trilogy Mode

```
--assemble sources/ --trilogy
  -> output/part-1-intro.md
  -> output/part-2-body.md
  -> output/part-3-conclusion.md
```

Uses DAG cut levels to split the article into three parts.

---

## Implementation Notes

- Steps 1-4 are pure regex / AST -- no LLM calls
- Frontmatter inference is heuristic (heading + link scan); upgrade to `--ai` flag later
- The existing `fabricateText()` is the final humanization pass; assembly happens *before* it
- `--gather` should support `--graph` / `--orphans` like existing single-dir mode
- Config stays in `config.yaml` under a new `assemble:` section for defaults

---

## Package Recommendations

### DAG & Graph Operations

| Package | Why | Size |
|---------|-----|------|
| **[`dependency-graph`](https://www.npmjs.com/package/dependency-graph)** | Simple `DepGraph` with `addNode`, `addDependency`, `overallOrder()` (topo sort), cycle detection via `DepGraphCycleError`. All we need for the DAG. Zero deps. | ~3 KB |
| [`dependency-graph-analyzer`](https://www.npmjs.com/package/dependency-graph-analyzer) | Heavier -- Tarjan's SCC, GraphViz export, GraphQL API. Only needed if you want rich graph visualization. | ~50 KB |

**Recommended: `dependency-graph`** -- minimal, sufficient, battle-tested (10y+, 50k+ weekly downloads).

### Wikilink Parsing

| Package | Why | Compatibility |
|---------|-----|---------------|
| **[`@braindb/mdast-util-wiki-link`](https://www.npmjs.com/package/@braindb/mdast-util-wiki-link)** | ESM, works with `micromark` + `mdast-util-from-markdown`. Parses `[[Page]]` and `[[Page|Alias]]`. Sits directly on mdast (no `remark` dependency). | micromark v3+ |
| [`remark-wiki-link`](https://www.npmjs.com/package/remark-wiki-link) | Older, CJS-compatible, depends on `remark`. Good if already in remark ecosystem. | remark v12+ |
| [`@flowershow/remark-wiki-link`](https://www.npmjs.com/package/@flowershow/remark-wiki-link) | Obsidian-style with shortest-path matching, `![[embed]]` support. Overkill for simple gathering. | remark v13+ |
| [`@moritzrs/mdast-util-ofm-wikilink`](https://www.npmjs.com/package/@moritzrs/mdast-util-ofm-wikilink) | Full OFM (Obsidian Flavored Markdown) spec. Most complete but heaviest. | micromark v4+ |

**Recommended: `@braindb/mdast-util-wiki-link`** -- light, ESM, no framework lock-in. But since md-fabrication currently uses pure regex (no remark), a **custom regex** `\[\[([^\]|]+)(?:\|([^\]]+))?\]\]` may be simpler and faster for the initial implementation.

### Frontmatter

| Package | Why | Size |
|---------|-----|------|
| Already have **`js-yaml`** | Already depends on this for `config.yaml`. Just add a `---\n...\n---` block parser and feed the inner content to `yaml.load()`. | checkmark |
| [`gray-matter`](https://www.npmjs.com/package/gray-matter) | Full frontmatter parser with YAML/JSON/TOML support, stringify, and section extraction. Adds ~20 KB. | 20 KB |

**Recommended: stick with existing `js-yaml`** -- write a simple 10-line `parseFrontmatter()` helper.

### Markdown AST

| Package | Why | Size |
|---------|-----|------|
| **[`remark`](https://www.npmjs.com/package/remark) + [`unified`](https://www.npmjs.com/package/unified)** | Full markdown AST: heading detection, content restructuring, heading level shifting. Essential for heading dedup and anchor rewiring. | ~30 KB |
| [`unist-util-visit`](https://www.npmjs.com/package/unist-util-visit) | Traverse AST nodes. Simplifies heading discovery and manipulation. | ~5 KB |

**Recommendation:** adopt `remark` + `unist-util-visit` for Step 3 (link-up/merge). The merge step needs AST-awareness for heading dedup and anchor collision avoidance.

### HTML Generation (for styled URL wrapping)

| Package | Why | Size |
|---------|-----|------|
| `remark-rehype` + `rehype-stringify` | Converts markdown AST to HTML AST. Plugin ecosystem. | ~15 KB |
| Simple template strings | If just wrapping external links in `<a>` blocks, a few template literals suffice. | 0 |

**Recommended: template strings** for v1. Styled URL wrapping is just replacing `[text](url)` with an anchor tag.

---

## Dependency Change Summary

| Action | Package | Reason |
|--------|---------|--------|
| **Add** | `dependency-graph` | DAG topo sort + cycle detection |
| **Add** | `remark` + `unist-util-visit` | AST for heading dedup / anchor rewiring |
| **Add (or custom regex)** | `@braindb/mdast-util-wiki-link` | Wikilink parsing |
| **Already have** | `js-yaml` | Frontmatter parsing |
| **Not needed** | `gray-matter` | Can inline frontmatter parsing with `js-yaml` |

### Estimated install size increase

```
Current: 3 deps (ascii-table3, js-tiktoken, js-yaml)  ~ 120 KB
After:   6 deps                                        ~ 200 KB
```
