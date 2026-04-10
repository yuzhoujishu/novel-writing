---
name: auto
description: Autonomous batch writing loop — write up to 5 consecutive chapters with full state sync. Use when you want to generate a block of chapters without manual intervention between each.
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Auto Batch Skill

Sequentially write up to 5 consecutive chapters with real-time state synchronization.

## Arguments

- `--batch=N` — number of chapters to write (default: 5, max: 5)
- `--start=N` — override starting chapter number (default: from `meta.json.activeChapter`)

## Core Principle

**Sequential only.** Never write multiple chapters in parallel. Each chapter informs the next through shared context loaded at the start of the batch.

## Workflow

### Phase 1: Pre-Batch Verification

#### Step 1a: Resolve Active Project

```bash
node scripts/lib/state-manager.js active
```

If no project exists, abort with: "No active project. Create one with `node scripts/lib/state-manager.js create \"项目名称\"`"

#### Step 1b: Load Project

```bash
node scripts/lib/state-manager.js load {projectId}
```

If `outline.json` has zero chapters (`outline.chapters.length === 0`), abort with: "No outline found. Run `/novel:outline` first."

#### Step 1c: Determine Batch Scope

Read `meta.json` and `outline.json`. Determine chapters to write:

1. Start from `activeChapter` in `meta.json` (or `--start=N` override)
2. Scan `outline.json.chapters` sequentially
3. Include only chapters where `status === 'outline'`
4. Stop when either 5 chapters collected OR no more outline chapters remain
5. If `--start=N` is given, override but still skip `complete`/`draft`/`revision` chapters

Report batch scope before starting:

```
Batch plan:
- Chapter 3: "归途" (outline) — ~3500 words
- Chapter 4: "重逢" (outline) — ~3000 words
(2 of 5 — only 2 outline chapters remain)
```

### Phase 2: Load Full Context (Once, Before Loop)

Read ALL state files from `data/{projectId}/`:

1. `meta.json` — project name, genre, tone, target word count, `activeChapter`
2. `outline.json` — chapter structure, act breaks, key events, word count targets
3. `characters.json` — character details, relationships, character arcs
4. `world.json` — locations, factions, lore, timeline, magic system
5. `style-profile.json` — if exists, for voice preservation
6. `beats.json` — if exists, for beat-level scene guidance
7. Last 1-2 existing chapter files — for callback continuity

### Phase 3: Sequential Chapter Writing

For each chapter in the batch (in order):

#### Display Chapter Context

```
=== Writing Chapter {N}: "{title}" ===
Summary: {summary}
POV: {POV character}
Location: {location}
Key events: {keyEvents list}
Word target: ~{wordTarget} words
```

#### Build Writing Context

Assemble the full writing prompt from all loaded state:

```
CONTEXT FOR CHAPTER {N}:

--- STORY OUTLINE ---
Act: {actName}

--- CHAPTER BRIEF ---
{chapter.summary}
Key events to include:
  - {keyEvent 1}
  - {keyEvent 2}

--- CHARACTERS IN THIS CHAPTER ---
{character.name}: {character arc description}

--- WORLD ---
Location: {location.description}

--- STYLE PROFILE ---
{sentence_length: mixed, dialogue_ratio: ~30%, description_density: moderate}
Opening: {technique from style-profile}
Closing: {technique from style-profile}

--- RECENT CHAPTERS (callback) ---
Previous chapter {N-1} ended with:
{last 2 paragraphs of previous chapter}
```

#### Write the Chapter

Write to `chapters/{N}.md`:
- File: `01.md`, `02.md` ... (zero-padded)
- H1: `# 第{N}章 {title}`
- The `pre-chapter-chinese-count` hook will verify >= 3000 Chinese characters
- The `post-chapter-state-update` hook will auto-update state files after Write

#### Progress Report (After Each Chapter)

```
Chapter {N} written: {word count} words
Status: draft
Next: Chapter {N+1} / {batch total}
```

#### Abort on Failure

If the Write tool fails or the hook blocks:
```
[ABORT] Chapter {N} failed: {reason}
Batch stopped. {X} of {Y} chapters completed.
Completed: {list}
Failed at: Chapter {N}
Retry with: /novel:auto --start={N} --batch={remaining}
```

### Phase 4: Final State Sync

After the batch completes or aborts:

1. **Update `meta.json`:**
   - `activeChapter = startChapter + writtenCount`
   - `currentWordCount += totalWrittenWords`
   - `updatedAt = now`

2. **Update `outline.json`:**
   - All written chapters: `status = 'draft'`, `wordCount`, `sceneCount` set

3. **Update `beats.json`** (if exists):
   - Written chapter beats: `status = 'written'`

4. **Update `style-profile.json`** (conditional):
   - If first chapter of a new act was written AND style profile doesn't exist:
     - Extract from the chapter prose
   - If first chapter of a new act was written AND style profile exists:
     - Ask: "New act chapter written. Update style profile? (y/n)"

### Phase 5: Batch Summary Report

```
=== Batch Complete ===
Chapters written: Chapter 3 (3542w), Chapter 4 (3108w)
Total words added: 6650
Active chapter: 5
Time elapsed: {duration}s
State files updated:
  - meta.json
  - outline.json
  - beats.json
Progress: 4 / 15 chapters (26.7%)
```

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| `--batch=0` or negative | Error: "Batch size must be between 1 and 5" |
| `--start=N` beyond outline | Error: "Chapter {N} does not exist in outline" |
| `--start=N` on `complete` chapter | Skip with warning, find next outline chapter |
| 0 outline chapters remain | "All chapters have been drafted. No outline chapters remaining." |
| Hook blocks a chapter write | Abort batch, report partial results |
| Project does not exist | Error: "No active project. Create one with state-manager.js create" |
| `style-profile.json` doesn't exist when writing first chapter | Auto-extract after first chapter |
| `beats.json` doesn't exist | Skip beat updates silently |
| `activeChapter` past outline length | Error: "No outline chapters beyond Chapter {N}" |

## State Invariants

After successful batch:
1. `meta.json.activeChapter` points to chapter AFTER the last written one
2. `meta.json.currentWordCount` is sum of all chapter word counts
3. `outline.json.chapters[i].status === 'draft'` for all written chapters
4. `outline.json.chapters[i].wordCount > 0` for all written chapters
5. `meta.json.updatedAt` is always most recent
