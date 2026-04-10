---
name: character
description: Create, expand, or query character profiles. Use when introducing a new character, deepening existing ones, or checking character consistency.
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Character Skill

Manage character profiles with full project integration.

## Two Modes

### Query Mode

**`/novel:character [question]`**

When given a question (not a character name), act as a character database:
1. Load `data/{projectId}/characters.json`
2. Search for relevant characters
3. Answer the question using character data
4. Flag any inconsistencies

Example queries:
- `/novel:character Who knows about the secret?`
- `/novel:character List all characters who died in Act II`
- `/novel:character What is the relationship between Elena and Marcus?`
- `/novel:character Which characters have the most appearances?`

### Creation / Edit Mode

**`/novel:character create [name]`** or **just `/novel:character`**

#### Step 1: Resolve Active Project

```bash
node scripts/lib/state-manager.js active
```

#### Step 2: Load Existing State

Read:
- `data/{projectId}/characters.json` — existing characters (to avoid duplicates)
- `data/{projectId}/outline.json` — to update `firstAppearance`/`lastAppearance`
- `data/{projectId}/world.json` — to cross-link factions

#### Step 3: Gather Character Information

If no name provided, ask the user. Then collect:

**Required:**
- Name
- Role: protagonist / antagonist / supporting / major / minor

**Optional (gather progressively):**
- Appearance (age, height, distinguishing features)
- Personality (core trait, secondary traits, flaws)
- Background (origin story, key life events)
- Relationships (existing characters + relationship type)
- Character arc (start → change → end)
- First appearance chapter

#### Step 4: Build Character Profile

Use this schema:

```json
{
  "id": "uuid",
  "name": "Character Name",
  "role": "protagonist|antagonist|supporting|major|minor",
  "importance": 1-10,
  "status": "alive|dead|unknown",
  "firstAppearance": 1,
  "lastAppearance": 15,
  "appearance": {
    "age": "",
    "height": "",
    "features": ""
  },
  "personality": {
    "core": "",
    "traits": [],
    "flaws": []
  },
  "background": {
    "origin": "",
    "keyEvents": []
  },
  "relationships": [
    {
      "targetId": "uuid or null",
      "targetName": "Character Name",
      "type": "ally|rival|family|romantic|neutral",
      "description": ""
    }
  ],
  "characterArc": {
    "start": "",
    "change": "",
    "end": ""
  },
  "tags": []
}
```

#### Step 5: Write to State

**Update `characters.json`**:
- Add new character to the `characters` array
- If a relationship references an existing character, link by ID
- Assign a UUID if not provided

**Update `outline.json`**:
- If `firstAppearance` chapter is known, update that chapter's `characters` array

**Cross-link to `world.json`**:
- If the character belongs to a faction, add their ID to the faction's `keyMembers`
- If the character controls a location, add their ID to the location's `controlledBy`

#### Step 6: Output

**Write markdown character sheet** to `chapters/00-characters/{name}.md`:
```markdown
# Character Name

## Role
...

## Appearance
...

## Personality
...

## Background
...

## Relationships
...

## Character Arc
...
```

Provide a one-paragraph summary of the character.

## Editing Existing Characters

**`/novel:character edit [name]`**

Load `characters.json`, find the character by name, present current data for editing, then update the file and regenerate the markdown sheet.
