---
name: beat
description: Create or expand a beat sheet for scene-level planning. Use when breaking down a chapter into beats, designing plot structure, or mapping emotional arcs.
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Beat Skill

Generate scene-level beat sheets using narrative structure frameworks.

## Frameworks

### Three-Act Structure
1. Opening image
2. Theme stated
3. Setup (inciting incident)
4. Debate
5. Break into Act II
6. B story begins
7. Fun and games / Midpoint
8. Bad guys close in
9. All is lost
10. Dark night of the soul
11. Break into Act III
12. Finale
13. Final image

### Save the Cat (15 Beats)
1. Opening Image
2. Theme Stated
3. Setup
4. Catalyst
5. Debate
6. Break into Act II
7. B Story
8. Fun and Games
9. Midpoint
10. Bad Guys Close In
11. All Is Lost
12. Dark Night of the Soul
13. Break into Act III
14. Finale
15. Final Image

### Per-Chapter Scene Beats
For each chapter, break down into individual scenes with:
- Scene number
- One-sentence summary
- POV character
- Location
- Emotional beat
- Plot function

## Arguments

- `--framework=three-act|save-the-cat|scenes` — which framework to use
- `--chapter=N` — target a specific chapter (default: all outline chapters)
- `--expand` — expand existing beat sheet with more detail

## Workflow

### Step 1: Load Context

Read:
- `data/{projectId}/outline.json` — chapter structure and key events
- `data/{projectId}/characters.json` — character arcs for emotional beats
- `data/{projectId}/world.json` — locations and faction dynamics
- `data/{projectId}/beats.json` — existing beats (to expand or avoid duplicates)

### Step 2: Select Framework

Ask the user which framework to use, or default to Save the Cat if unspecified.

### Step 3: Generate Beat Sheet

#### For Global Beats (Three-Act / Save the Cat)

Map beats to chapters from `outline.json`:
- Each beat gets a chapter assignment (or spans multiple chapters)
- Each beat includes: beat name, chapter number, scene number, type (setup/turning point/climax), description, POV character, location, emotional beat, plot function

#### For Scene Beats

For each chapter in the outline:
1. Read the chapter's summary and key events from `outline.json`
2. Break it into 2–5 scenes
3. Each scene gets:
   - Scene number within the chapter
   - Summary (1 sentence)
   - POV character
   - Location (reference from `world.json`)
   - Emotional beat (what the POV character feels)
   - Plot function (setup, complication, revelation, climax, transition)
   - Word count target (derived from `style-profile.json` typical scene length if available)

### Step 4: Write to State

**Update `beats.json`:**
```json
{
  "framework": "save-the-cat",
  "globalBeats": [
    {
      "id": "uuid",
      "beat": "Opening Image",
      "chapter": 1,
      "scene": 1,
      "type": "setup",
      "description": "",
      "POV": "character-name",
      "location": "location-name",
      "emotionalBeat": "",
      "plotFunction": "",
      "status": "outline"
    }
  ],
  "sceneBreakdown": {
    "1": [
      {
        "id": "uuid",
        "sceneNum": 1,
        "summary": "",
        "POV": "character-name",
        "location": "location-name",
        "emotionalBeat": "",
        "plotFunction": "setup|complication|revelation|climax|transition",
        "status": "outline",
        "wordTarget": 800
      }
    ]
  }
}
```

**Auto cross-links:**
- If a beat introduces a character for the first time → update that character's `firstAppearance` in `characters.json`
- If a beat is set in a new location → add `firstAppearance` to that location in `world.json`

### Step 5: Output Markdown

**Write to `chapters/00-beats.md`:**
```markdown
# Beat Sheet: {Story Title}

## Framework: Save the Cat

| # | Beat | Chapter | Scene | Type | Description |
|---|------|---------|-------|------|-------------|
| 1 | Opening Image | 1 | 1 | setup | ... |
...

## Scene Breakdown

### Chapter 1

| Scene | POV | Location | Emotion | Function | Words |
|-------|-----|----------|---------|----------|-------|
| 1 | ... | ... | ... | setup | ~800 |
...
```
