---
name: outline
description: Generate or expand a story outline from a premise. Use when planning a new novel, restructuring existing chapters, or adding new story arcs.
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Outline Skill

Generate a structured story outline and persist it to project state.

## Workflow

### Step 1: Resolve Active Project

Run the following to identify the current project:

```bash
node scripts/lib/state-manager.js active
```

If no project exists, create one first using the state-manager, then continue.

### Step 2: Load Project Context

Read the following files from `data/{projectId}/`:
- `meta.json` — genre, tone, target word count
- `characters.json` — existing characters (to link them to chapters)
- `world.json` — locations and factions (to reference in chapters)

### Step 3: Generate Outline

Ask the user for the following information if not already provided:
- **Story premise** — one-paragraph summary of the central conflict
- **Genre** — fantasy, sci-fi, urban fantasy, literary fiction, romance, thriller, horror, etc.
- **Structure preference** — three-act (default), four-act, five-act, or hero's journey
- **Target word count** — default from `meta.json`

Generate a structured outline that includes:
1. **Act/Part summaries** — one paragraph each describing the dramatic arc
2. **Chapter list** — each chapter with:
   - Chapter number and title
   - One-sentence summary
   - POV character (reference a character ID if characters exist)
   - Primary location (reference a location ID if world exists)
   - Key events (1-3 bullet points)
   - Word count target

### Step 4: Write State Files

**Update `outline.json`:**

```json
{
  "structure": "three-act",
  "acts": [
    { "name": "Act I", "chapters": [1, 2, 3, 4, 5], "summary": "..." },
    { "name": "Act II", "chapters": [6, 7, 8, 9, 10, 11, 12], "summary": "..." },
    { "name": "Act III", "chapters": [13, 14, 15], "summary": "..." }
  ],
  "chapters": [
    {
      "id": 1,
      "title": "Chapter title",
      "summary": "One-sentence summary",
      "status": "outline",
      "wordCount": 0,
      "sceneCount": 0,
      "POV": "character-name",
      "location": "location-name",
      "characters": [],
      "keyEvents": [],
      "createdAt": "ISO timestamp"
    }
  ]
}
```

**Write markdown summary to `chapters/00-outline.md`** for human reference.

### Step 5: Update meta.json

Update `meta.json`:
- Set `updatedAt` to current timestamp
- Update `targetWordCount` if specified by user

## Output Format

After completing the outline, provide a summary table:

| Chapter | Title | POV | Location | Key Events |
|---------|-------|-----|----------|------------|
| 1 | ... | ... | ... | ... |
| 2 | ... | ... | ... | ... |

## Cross-Linking

If characters from `characters.json` are referenced in the outline, link them by adding their ID to the chapter's `characters` array in `outline.json`.

If locations from `world.json` are referenced, add location names to the chapter's `location` field.

## Expansion Mode

If an outline already exists, ask whether to:
- **Replace** — discard current outline and generate fresh
- **Expand** — add new chapters to existing outline
- **Refine** — adjust summaries and structure without changing chapter count
