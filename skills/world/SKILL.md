---
name: world
description: Build and query the story world. Use when designing locations, factions, magic systems, or checking world consistency.
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# World Skill

Build and maintain the story world with cross-referencing between locations, factions, characters, and timeline.

## Two Modes

### Query Mode

**`/novel:world [question]`**

When given a question, act as a world database:
1. Load `data/{projectId}/world.json`
2. Load `data/{projectId}/characters.json` and `outline.json` if needed
3. Answer with references to relevant entities
4. Flag consistency issues

Example queries:
- `/novel:world What factions control the northern territories?`
- `/novel:world Where did the main character go in Chapter 5?`
- `/novel:world Summarize the magic system rules`
- `/novel:world Which locations appear in Act I?`
- `/novel:world What is the timeline of major events?`

### Building / Edit Mode

**`/novel:world build [type]`** or **just `/novel:world`**

## Building Components

### 1. Magic System (Optional)

If the story has a magic/tech/supernatural system, define:
- **Name** and description
- **Rules** — what can be done and how
- **Limitations** — costs, restrictions, side effects
- **Source** — where does the power come from

### 2. Factions

**Create a faction:**
```json
{
  "id": "uuid",
  "name": "Faction Name",
  "type": "clan|guild|government|corporation|religious|criminal|other",
  "alignment": "light|neutral|dark",
  "description": "",
  "goals": [],
  "resources": [],
  "keyMembers": ["character-id"],
  "allies": ["faction-id"],
  "enemies": ["faction-id"]
}
```

### 3. Locations

**Create a location:**
```json
{
  "id": "uuid",
  "name": "Location Name",
  "type": "city|region|building|landmark|dimensional|other",
  "parentId": "uuid or null",
  "description": "",
  "significance": "",
  "controlledBy": ["faction-id"],
  "firstAppearance": 1,
  "keyFeatures": [],
  "inhabitants": ["character-id"]
}
```

**Location hierarchy:** Use `parentId` to create nested locations (e.g., a specific tavern inside a city, inside a region).

### 4. Timeline Events

```json
{
  "id": "uuid",
  "year": "Year or era",
  "event": "Event description",
  "chapterRef": 1,
  "relatedCharacters": ["character-id"],
  "relatedLocations": ["location-id"],
  "significance": "major|minor|foreshadowing"
}
```

### 5. Lore Entries

```json
{
  "id": "uuid",
  "name": "Lore Name",
  "category": "history|mythology|technology|culture|religion|other",
  "content": "",
  "relatedTo": {
    "characters": [],
    "locations": [],
    "factions": []
  }
}
```

## Cross-Reference Logic

When adding a character to `characters.json`:
→ Check if they belong to a faction → add ID to faction's `keyMembers` in `world.json`

When adding a location:
→ Ask if it is controlled by a faction → link in `controlledBy`
→ Ask if characters live there → link in `inhabitants`

When adding a timeline event:
→ Link to related characters and locations automatically
→ Set `chapterRef` based on when the event is referenced in `outline.json`

## Writing State

**Update `world.json`** with all new/edited entries.

**Write markdown world bible** to `chapters/00-world.md`:
```markdown
# World Bible

## Magic System
...

## Factions
...

## Locations
...

## Timeline
...

## Lore
...
```

## Consistency Checks

Before saving, verify:
- No circular parentId references in locations
- All faction member references point to existing characters in `characters.json`
- No duplicate location or faction names
- Timeline events reference chapters that exist in `outline.json`
