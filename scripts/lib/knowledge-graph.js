/**
 * Novel Writing Plugin — Knowledge Graph Engine
 * Cross-reference engine for characters, locations, factions, and timeline events.
 */

const fs = require('fs');

/**
 * Load all project state files
 * @param {string} projectDir - Path to project directory
 * @returns {object} All state files
 */
function loadProjectState(projectDir) {
  const files = {};
  for (const file of ['outline.json', 'characters.json', 'world.json', 'beats.json', 'style-profile.json']) {
    const filePath = `${projectDir}/${file}`;
    if (fs.existsSync(filePath)) {
      try {
        files[file] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch {
        files[file] = null;
      }
    }
  }
  return files;
}

/**
 * Find all appearances of a character across the outline and beats
 * @param {string} characterId - Character UUID
 * @param {object} state - Project state
 * @returns {object} Appearance data
 */
function findCharacterAppearances(characterId, state) {
  const appearances = {
    chapters: [],
    scenes: [],
    beats: [],
    timeline: [],
  };

  // Search outline chapters
  const outline = state['outline.json'];
  if (outline?.chapters) {
    for (const chapter of outline.chapters) {
      if (chapter.characters?.includes(characterId)) {
        appearances.chapters.push({
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          summary: chapter.summary,
          POV: chapter.POV,
        });
      }
    }
  }

  // Search beats
  const beats = state['beats.json'];
  if (beats?.globalBeats) {
    for (const beat of beats.globalBeats) {
      if (beat.POV === characterId || beat.description?.includes(characterId)) {
        appearances.beats.push({
          beat: beat.beat,
          chapter: beat.chapter,
          scene: beat.scene,
          description: beat.description,
        });
      }
    }
  }

  if (beats?.sceneBreakdown) {
    for (const [chapterNum, scenes] of Object.entries(beats.sceneBreakdown)) {
      for (const scene of scenes) {
        if (scene.POV === characterId) {
          appearances.scenes.push({
            chapter: parseInt(chapterNum),
            sceneNum: scene.sceneNum,
            summary: scene.summary,
            emotionalBeat: scene.emotionalBeat,
          });
        }
      }
    }
  }

  // Search timeline
  const world = state['world.json'];
  if (world?.timeline) {
    for (const event of world.timeline) {
      if (event.relatedCharacters?.includes(characterId)) {
        appearances.timeline.push({
          year: event.year,
          event: event.event,
          chapterRef: event.chapterRef,
          significance: event.significance,
        });
      }
    }
  }

  return appearances;
}

/**
 * Find all locations used by a character
 * @param {string} characterId - Character UUID
 * @param {object} state - Project state
 * @returns {object} Location data
 */
function findCharacterLocations(characterId, state) {
  const world = state['world.json'];
  if (!world?.locations) return [];

  const locations = [];
  const outline = state['outline.json'];

  // From world.json inhabitants
  for (const location of world.locations) {
    if (location.inhabitants?.includes(characterId)) {
      locations.push({ location, source: 'world.inhabitants' });
    }
  }

  // From outline chapters (by location name match)
  if (outline?.chapters) {
    for (const chapter of outline.chapters) {
      if (chapter.characters?.includes(characterId) && chapter.location) {
        const found = world.locations.find(l => l.name === chapter.location);
        if (found && !locations.find(l => l.location.id === found.id)) {
          locations.push({ location: found, source: 'outline.chapter', chapter: chapter.id });
        }
      }
    }
  }

  return locations;
}

/**
 * Find all characters at a location
 * @param {string} locationId - Location UUID
 * @param {object} state - Project state
 * @returns {array} Characters at this location
 */
function findCharactersAtLocation(locationId, state) {
  const world = state['world.json'];
  const characters = state['characters.json']?.characters || [];

  if (!world?.locations) return [];

  const location = world.locations.find(l => l.id === locationId);
  if (!location) return [];

  // Characters whose home is this location
  const residents = characters.filter(c =>
    location.inhabitants?.includes(c.id)
  );

  // Characters who appear in chapters set at this location
  const outline = state['outline.json'];
  const chaptersHere = outline?.chapters?.filter(ch =>
    ch.location === location.name && ch.characters?.length > 0
  ) || [];

  const chapterCharacters = chaptersHere
    .flatMap(ch => ch.characters || [])
    .map(id => characters.find(c => c.id === id))
    .filter(Boolean);

  // Combine and deduplicate
  const all = [...residents, ...chapterCharacters];
  const seen = new Set();
  return all.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

/**
 * Find relationship paths between two characters
 * @param {string} charId1 - First character UUID
 * @param {string} charId2 - Second character UUID
 * @param {object} state - Project state
 * @returns {array} Relationship paths
 */
function findRelationshipPaths(charId1, charId2, state) {
  const characters = state['characters.json']?.characters || [];
  const char1 = characters.find(c => c.id === charId1);
  const char2 = characters.find(c => c.id === charId2);
  if (!char1 || !char2) return [];

  const paths = [];

  // Direct relationship
  const direct = char1.relationships?.find(r => r.targetId === charId2);
  if (direct) {
    paths.push({ type: 'direct', description: direct.description });
  }

  // Through shared relationships
  for (const rel of (char1.relationships || [])) {
    const intermediate = characters.find(c => c.id === rel.targetId);
    if (!intermediate) continue;
    const backRel = intermediate.relationships?.find(r => r.targetId === charId2);
    if (backRel) {
      paths.push({
        type: 'through_intermediate',
        intermediate: intermediate.name,
        step1: rel.type,
        step2: backRel.type,
        description: `${char1.name} --[${rel.type}]--> ${intermediate.name} --[${backRel.type}]--> ${char2.name}`,
      });
    }
  }

  // Shared faction
  const world = state['world.json'];
  if (world?.factions) {
    for (const faction of world.factions) {
      if (faction.keyMembers?.includes(charId1) && faction.keyMembers?.includes(charId2)) {
        paths.push({ type: 'shared_faction', faction: faction.name, description: `Both belong to ${faction.name}` });
      }
    }
  }

  return paths;
}

/**
 * Query the knowledge graph with a natural language question
 * @param {string} query - Natural language query
 * @param {string} projectDir - Project directory path
 * @returns {string} Answer
 */
function queryKnowledgeGraph(query, projectDir) {
  const state = loadProjectState(projectDir);
  const lowerQuery = query.toLowerCase();
  const characters = state['characters.json']?.characters || [];
  const world = state['world.json'] || {};
  const outline = state['outline.json'];

  // Pattern: "who is X"
  const whoMatch = lowerQuery.match(/who is (.+?)\?*$/);
  if (whoMatch) {
    const name = whoMatch[1].trim();
    const char = characters.find(c => c.name.toLowerCase() === name);
    if (char) {
      const appearances = findCharacterAppearances(char.id, state);
      return `**${char.name}** (${char.role}, importance: ${char.importance}/10)\n\n` +
        `Status: ${char.status}\n` +
        `First appearance: Chapter ${char.firstAppearance}\n` +
        `Core personality: ${char.personality?.core}\n` +
        `Character arc: ${char.characterArc?.start} → ${char.characterArc?.change} → ${char.characterArc?.end}\n` +
        `Appears in ${appearances.chapters.length} chapters, ${appearances.scenes.length} scenes`;
    }
  }

  // Pattern: "relationship between X and Y"
  const relMatch = lowerQuery.match(/relationship between (.+?) and (.+?)\?*$/);
  if (relMatch) {
    const name1 = relMatch[1].trim();
    const name2 = relMatch[2].trim();
    const char1 = characters.find(c => c.name.toLowerCase() === name1);
    const char2 = characters.find(c => c.name.toLowerCase() === name2);
    if (char1 && char2) {
      const paths = findRelationshipPaths(char1.id, char2.id, state);
      if (paths.length === 0) return `No known relationship between ${char1.name} and ${char2.name}.`;
      return paths.map(p => `- **${p.type}**: ${p.description}`).join('\n');
    }
  }

  // Pattern: "which characters are in X"
  const whichCharMatch = lowerQuery.match(/which characters are in (.+?)\?*$/);
  if (whichCharMatch) {
    const locName = whichCharMatch[1].trim();
    const location = world.locations?.find(l => l.name.toLowerCase() === locName);
    if (location) {
      const chars = findCharactersAtLocation(location.id, state);
      if (chars.length === 0) return `No characters known to be at ${location.name}.`;
      return `Characters at ${location.name}:\n` + chars.map(c => `- ${c.name} (${c.role})`).join('\n');
    }
  }

  // Pattern: "chapters set at X"
  const chaptersMatch = lowerQuery.match(/(chapters|locations|scenes) (?:set |at |in )?(.+?)\?*$/);
  if (chaptersMatch && outline) {
    const locName = chaptersMatch[2].trim();
    const location = world.locations?.find(l => l.name.toLowerCase() === locName);
    if (location && outline.chapters) {
      const chapters = outline.chapters.filter(ch => ch.location === location.name);
      if (chapters.length === 0) return `No chapters set at ${location.name}.`;
      return `Chapters set at ${location.name}:\n` + chapters.map(c => `- Ch. ${c.id}: ${c.title}`).join('\n');
    }
  }

  return 'Query not understood. Try: "Who is [character]?", "Relationship between [A] and [B]?", "Which characters are in [location]?", or "Chapters set at [location]?"';
}

module.exports = {
  loadProjectState,
  findCharacterAppearances,
  findCharacterLocations,
  findCharactersAtLocation,
  findRelationshipPaths,
  queryKnowledgeGraph,
};
