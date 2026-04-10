/**
 * Novel Writing Plugin — Beat Sheet Helpers
 * Utilities for creating and managing beat sheet data structures.
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Beat sheet frameworks
 */
const FRAMEWORKS = {
  'three-act': [
    'Opening Image',
    'Theme Stated',
    'Setup',
    'Inciting Incident',
    'Debate',
    'Break into Act II',
    'B Story Begins',
    'Fun and Games / Midpoint',
    'Bad Guys Close In',
    'All Is Lost',
    'Dark Night of the Soul',
    'Break into Act III',
    'Finale',
    'Final Image',
  ],
  'save-the-cat': [
    'Opening Image',
    'Theme Stated',
    'Setup',
    'Catalyst',
    'Debate',
    'Break into Act II',
    'B Story',
    'Fun and Games',
    'Midpoint',
    'Bad Guys Close In',
    'All Is Lost',
    'Dark Night of the Soul',
    'Break into Act III',
    'Finale',
    'Final Image',
  ],
};

/**
 * Beat types for categorization
 */
const BEAT_TYPES = {
  setup: ['Setup', 'Opening Image', 'Theme Stated', 'B Story'],
  turning_point: ['Catalyst', 'Midpoint', 'Break into Act II', 'Break into Act III'],
  climax: ['All Is Lost', 'Dark Night of the Soul', 'Finale'],
  resolution: ['Final Image'],
  development: ['Fun and Games', 'Fun and Games / Midpoint'],
  complication: ['Inciting Incident', 'Bad Guys Close In'],
  debate: ['Debate'],
};

/**
 * Scene plot functions
 */
const PLOT_FUNCTIONS = [
  'setup',       // Introduce situation
  'complication', // Introduce conflict
  'revelation',  // Reveal information
  'climax',      // Peak action/tension
  'transition',  // Move to next scene
  'subplot',     // Advance subplot
  'reflection',  // Character introspection
];

/**
 * Create a new beat entry
 * @param {string} beat - Beat name from framework
 * @param {number} chapter - Chapter number
 * @param {number} scene - Scene number within chapter
 * @param {object} overrides - Override default values
 */
function createBeat(beat, chapter, scene, overrides = {}) {
  const type = Object.entries(BEAT_TYPES).find(([, beats]) => beats.includes(beat))?.[0] || 'setup';
  return {
    id: uuidv4(),
    beat,
    chapter,
    scene,
    type,
    description: overrides.description || '',
    POV: overrides.POV || '',
    location: overrides.location || '',
    emotionalBeat: overrides.emotionalBeat || '',
    plotFunction: overrides.plotFunction || 'setup',
    status: 'outline',
    ...overrides,
  };
}

/**
 * Create a new scene entry for sceneBreakdown
 * @param {number} chapter - Chapter number
 * @param {number} sceneNum - Scene number within chapter
 * @param {object} overrides - Override defaults
 */
function createScene(chapter, sceneNum, overrides = {}) {
  return {
    id: uuidv4(),
    sceneNum,
    summary: overrides.summary || '',
    POV: overrides.POV || '',
    location: overrides.location || '',
    emotionalBeat: overrides.emotionalBeat || '',
    plotFunction: overrides.plotFunction || 'setup',
    status: 'outline',
    wordTarget: overrides.wordTarget || 800,
    ...overrides,
  };
}

/**
 * Generate global beats from a framework, distributed across chapters
 * @param {string} framework - 'three-act' or 'save-the-cat'
 * @param {number} totalChapters - Total chapters in outline
 */
function generateGlobalBeats(framework, totalChapters) {
  const beats = FRAMEWORKS[framework];
  if (!beats) throw new Error(`Unknown framework: ${framework}`);

  // Distribute beats evenly across chapters
  const result = [];
  beats.forEach((beat, i) => {
    const chapter = Math.min(Math.ceil(((i + 1) / beats.length) * totalChapters), totalChapters);
    const scene = 1; // Global beats typically occupy first scene
    result.push(createBeat(beat, chapter, scene));
  });

  return result;
}

/**
 * Split a chapter summary into scene breakdowns
 * @param {object} chapter - Chapter entry from outline.json
 * @param {number} sceneCount - Number of scenes to generate
 */
function splitChapterIntoScenes(chapter, sceneCount) {
  const scenes = [];
  const keyEvents = chapter.keyEvents || [];

  for (let i = 0; i < sceneCount; i++) {
    const plotFn = i === 0 ? 'setup' :
                   i === sceneCount - 1 ? 'climax' :
                   keyEvents[i] ? 'complication' : 'development';

    const scene = createScene(chapter.id, i + 1, {
      summary: keyEvents[i] || `Scene ${i + 1}`,
      POV: chapter.POV || '',
      location: chapter.location || '',
      plotFunction: plotFn,
      wordTarget: Math.round(chapter.wordTarget / sceneCount) || 800,
    });
    scenes.push(scene);
  }
  return scenes;
}

/**
 * Mark a beat as written
 * @param {object} beat - Beat object
 */
function markBeatWritten(beat) {
  return { ...beat, status: 'written' };
}

/**
 * Mark a scene as revised
 * @param {object} scene - Scene object
 */
function markSceneRevised(scene) {
  return { ...scene, status: 'revised' };
}

/**
 * Check if beats.json has gaps (outline beats without corresponding scenes)
 * @param {object} beatsData - Parsed beats.json
 */
function findBeatGaps(beatsData) {
  const gaps = [];
  const outlinedChapterIds = new Set(
    (beatsData.sceneBreakdown ? Object.values(beatsData.sceneBreakdown).flat() : [])
      .map(s => s.sceneNum)
  );

  for (const beat of (beatsData.globalBeats || [])) {
    if (beat.status === 'outline' && !outlinedChapterIds.has(beat.chapter)) {
      gaps.push({ beat: beat.beat, chapter: beat.chapter, missing: 'scene breakdown' });
    }
  }
  return gaps;
}

module.exports = {
  FRAMEWORKS,
  BEAT_TYPES,
  PLOT_FUNCTIONS,
  createBeat,
  createScene,
  generateGlobalBeats,
  splitChapterIntoScenes,
  markBeatWritten,
  markSceneRevised,
  findBeatGaps,
};
