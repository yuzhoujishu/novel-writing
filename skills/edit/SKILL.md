---
name: edit
description: Revise and edit existing prose while preserving the author's style. Use when polishing a draft, improving pacing, or fixing consistency issues.
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Edit Skill

Style-preserving prose revision with three edit levels.

## Arguments

- `--level=light|medium|heavy` — edit intensity (required)
- `--chapter=N` — which chapter to edit (default: current active chapter)
- `--focus=area` — focus area: pacing, dialogue, description, consistency, grammar

## Workflow

### Step 1: Load Context

Load in order:
1. `data/{projectId}/chapters/{n}.md` — the chapter to edit
2. `data/{projectId}/style-profile.json` — voice constraints
3. `data/{projectId}/characters.json` — character consistency
4. `data/{projectId}/world.json` — world consistency
5. `data/{projectId}/outline.json` — chapter goals and key events

### Step 2: Read the Chapter

Read the full chapter content and analyze:
- Current word count
- Scene structure (how many --- scene breaks)
- Dialogue-to-narration ratio
- Description density
- POV consistency
- Tense consistency

### Step 3: Apply Edit Level

#### `--level=light`

Polish without restructuring:
- Fix grammar, punctuation, and spelling errors
- Tighten wordy sentences
- Eliminate repeated words/phrases
- Smooth awkward transitions
- Ensure POV consistency
- Verify character name consistency throughout

**Do NOT rewrite paragraphs or restructure scenes.**

#### `--level=medium`

Improve quality with targeted changes:
- Everything from light level
- Strengthen weak openings and endings
- Deepen dialogue (make it more distinct per character)
- Add or trim description where pacing demands
- Improve scene transitions
- Ensure emotional beats land
- Check for "telling vs showing"

**Avoid wholesale rewrites. Target specific paragraphs, not the entire chapter.**

#### `--level=heavy`

Structural revision:
- Everything from medium level
- Restructure scenes if pacing demands it
- Rewrite underperforming sections
- Strengthen thematic resonance
- Ensure each scene has a clear purpose
- Verify the chapter meets its outline goals

**Heavy edits require user confirmation before proceeding with major rewrites.**

### Step 4: Style Preservation

Read `style-profile.json` and enforce:
- Sentence length variation (don't homogenize to one rhythm)
- Dialogue tag frequency (don't change established patterns)
- Description density (match the original)
- Favorite words — do not remove them unless they are errors
- Opening/closing techniques — preserve
- POV and tense — absolutely maintain

### Step 5: Write Changes

**Update `chapters/{n}.md`** with the revised prose.

**Update `outline.json`**:
- Set chapter `status` to `revision` during editing
- Set back to `draft` when complete

### Step 6: Edit Report

Provide a structured report:

```
## Edit Report: Chapter N — "{title}"

### Changes Made
| Type | Count | Example |
|------|-------|---------|
| Grammar fixes | X | ... |
| Sentence tightens | X | ... |
| Dialogue improvements | X | ... |
| Description changes | X | ... |
| Structural changes | X | ... |

### Word Count
Before: X words → After: Y words (ΔZ)

### Style Compliance
[✓] Sentence length preserved
[✓] POV consistent
[✓] Character voices consistent

### Remaining Issues
- None / [list any unresolved issues]
```

## Error Cases

- If chapter file does not exist → error, suggest `/novel:chapter --num=N` first
- If `style-profile.json` does not exist → proceed without style constraints, note this
- If user requests `--level=heavy` — always confirm before major rewrites
