---
name: chapter
description: Write a chapter from the outline and style profile. Use when drafting a new chapter or continuing from a previous one.
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Chapter Skill

Write a novel chapter with full awareness of story state and writing style.

## Workflow

### Step 1: Resolve Active Project

```bash
node scripts/lib/state-manager.js active
```

### Step 2: Load Full Context

Read all state files from `data/{projectId}/`:
- `meta.json` — project name, genre, tone, target word count
- `outline.json` — chapter structure, act breaks, key events
- `characters.json` — character details, relationships, character arcs
- `world.json` — locations, factions, lore, timeline
- `style-profile.json` — if exists, for voice preservation (see Phase 3)
- `chapters/` directory — existing chapter files

### Step 3: Determine Target Chapter

- If `--continue` flag is given, find the first chapter with status `draft` or `outline`
- If a chapter number is given, target that specific chapter
- Default: next uncompleted chapter in sequence

Display the chapter's outline entry before writing:
- Summary
- POV character
- Key events to include
- Word count target (typically 2,000–5,000 words)

### Step 4: Write the Chapter

Follow these guidelines:

**Structure:**
- Open with a hook — action, image, dialogue, or question
- Develop scenes that advance the chapter's key events
- End with either: a cliffhanger, a revelation, a decision, or a scene transition
- Include chapter length markers every ~500 words

**Character Consistency:**
- Check `characters.json` for the POV character's voice, personality, and speech patterns
- Verify relationships are consistent with `characters.json`
- Reference other characters by their established names and roles

**World Consistency:**
- Check `world.json` for location descriptions, faction dynamics, and lore
- Maintain internal geography logic
- Use established terminology (magic system names, titles, place names)

**Style:**
- If `style-profile.json` exists, apply its voice characteristics:
  - Sentence length and rhythm
  - Dialogue ratio and tag usage
  - Description density
  - Opening/closing techniques
- If no style profile exists yet, write naturally — the first chapter will be used to extract it

### Step 5: Save Output

**Write to `chapters/{num}.md`**:
- File format: `01.md`, `02.md`, etc.
- Include chapter number and title as H1
- Include word count at the bottom as a comment

**Update `outline.json`**:
- Set chapter `status` to `draft`
- Set `wordCount` to actual word count of the chapter
- Set `sceneCount` to number of scene breaks (---)

### Step 6: First Draft Style Extraction (Auto-triggered)

If this is the **first chapter written** (i.e., `style-profile.json` does not exist):

After writing, analyze the chapter prose and create `style-profile.json`:
- Sentence length variation
- Paragraph length tendency
- Dialogue ratio
- Description density
- Favorite words/phrases
- Opening technique used
- Closing technique used
- POV and tense

This enables style-preserving writing for subsequent chapters.

## Arguments

- `--continue` — write the next uncompleted chapter
- `--num=N` — write chapter N specifically
- `--light` — shorter chapter (1,500–2,500 words)
- `--full` — longer chapter (4,000–6,000 words)

## Error Handling

- If `outline.json` has no chapters, prompt user to run `/novel:outline` first
- If the target chapter already exists and is `complete`, warn before overwriting
- If character/location references don't exist in state files, flag them for creation
