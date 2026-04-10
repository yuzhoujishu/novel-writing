/**
 * Novel Writing Plugin — Style Profile Utilities
 * Extract, compare, and apply writing style profiles.
 */

const fs = require('fs');

/**
 * Extract a style profile from chapter prose
 * @param {string} prose - The chapter text
 * @param {string} projectId - Project ID for UUID generation
 * @param {number} sourceChapter - Source chapter number
 * @returns {object} style profile
 */
function extractStyleProfile(prose, projectId, sourceChapter) {
  const sentences = prose.match(/[^.!?]+[.!?]+/g) || [];
  const paragraphs = prose.split(/\n\n+/).filter(p => p.trim().length > 0);

  // Sentence length distribution
  const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
  const avgSentenceLength = sentenceLengths.reduce((a, b) => a + b, 0) / (sentenceLengths.length || 1);
  const sentenceLength = avgSentenceLength < 12 ? 'short' : avgSentenceLength < 20 ? 'medium' : 'long';

  // Paragraph length
  const paragraphLengths = paragraphs.map(p => p.trim().split(/\s+/).length);
  const avgParagraphLength = paragraphLengths.reduce((a, b) => a + b, 0) / (paragraphLengths.length || 1);
  const paragraphLength = avgParagraphLength < 50 ? 'short' : avgParagraphLength < 100 ? 'medium' : 'long';

  // Dialogue ratio
  const dialogueMatches = prose.match(/"[^"]*"/g) || [];
  const dialogueWords = dialogueMatches.join(' ').split(/\s+/).length;
  const totalWords = prose.split(/\s+/).length;
  const dialogueRatio = totalWords > 0 ? dialogueWords / totalWords : 0;

  // Description density (adjective + adverb ratio as proxy)
  const adjAdvPattern = /\b(very|really|extremely|absolutely|completely|totally|utterly|incredibly)\b/gi;
  const adjAdvMatches = prose.match(adjAdvPattern) || [];
  const descriptionDensity = adjAdvMatches.length / (paragraphs.length || 1) > 0.5 ? 'rich' :
                              adjAdvMatches.length / (paragraphs.length || 1) > 0.2 ? 'moderate' : 'sparse';

  // POV and tense
  const firstPersonMatches = prose.match(/\b(I|me|my|mine|myself)\b/gi) || [];
  const thirdPersonMatches = prose.match(/\b(he|she|they|him|her|them|his|her|their)\b/gi) || [];
  const narrativePerspective = firstPersonMatches.length > thirdPersonMatches.length ? 'first' : 'third-limited';

  const pastTenseMatches = prose.match(/\b(was|were|had|did|went|said|thought|saw|heard)\b/gi) || [];
  const presentTenseMatches = prose.match(/\b(is|are|have|do|go|say|think|see|hear)\b/gi) || [];
  const tense = pastTenseMatches.length > presentTenseMatches.length ? 'past' : 'present';

  // Pacing (scene break frequency)
  const sceneBreaks = (prose.match(/^---$/gm) || []).length;
  const pacingRatio = sceneBreaks / (paragraphs.length || 1);
  const pacing = pacingRatio > 0.3 ? 'fast' : pacingRatio > 0.15 ? 'moderate' : 'slow';

  // Extract favorite words (most frequent content words)
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'that', 'which', 'who', 'whom', 'this', 'these', 'those', 'it', 'its', 'he', 'she', 'they', 'them', 'his', 'her', 'their', 'i', 'you', 'we', 'my', 'your', 'our', 'me', 'us', 'from', 'up', 'about', 'into', 'through', 'after', 'before', 'over', 'under', 'again', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'some', 'any', 'no', 'not', 'only', 'just', 'also', 'very', 'so', 'than', 'too', 'most', 'more', 'such', 'even', 'now', 'like', 'back', 'just', 'still', 'well', 'down', 'off', 'out', 'one', 'two', 'first', 'new', 'old', 'himself', 'herself', 'themselves', 'what', 'if', 'because', 'while', 'although', 'though', 'unless', 'until', 'against', 'between', 'among', 'during', 'without', 'within', 'upon', 'along', 'across', 'behind', 'beyond', 'toward', 'towards', 'around', 'near', 'away', 'enough', 'almost', 'already', 'enough', 'rather', 'quite', 'simply', 'however', 'therefore', 'thus', 'hence', 'further', 'another', 'others', 'something', 'anything', 'everything', 'nothing', 'somewhere', 'anywhere', 'everywhere', 'nowhere', 'however', 'whatever', 'whenever', 'wherever']);
  const words = prose.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const wordFreq = {};
  for (const word of words) {
    if (!stopWords.has(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  }
  const favoriteWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word]) => word);

  // Opening techniques
  const firstLine = prose.trim().split(/\n/)[0] || '';
  const openingTechniques = [];
  if (/^\*|^—|^-|^"/.test(firstLine.trim())) openingTechniques.push('dialogue');
  if (/^(He|She|They|I|We|The|A)\s+\w+\s+(was|were|is|are|had|have)/.test(firstLine)) openingTechniques.push('narration');
  if (/^(He|She|They|I|We)/.test(firstLine)) openingTechniques.push('character');
  if (/^In |^The |^A /.test(firstLine)) openingTechniques.push('description');
  if (/\b(thought|wondered|remembered|imagined)\b/i.test(firstLine)) openingTechniques.push('interiority');

  // Closing techniques
  const lastLine = prose.trim().split(/\n/).pop() || '';
  const closingTechniques = [];
  if (/\?$/.test(lastLine.trim())) closingTechniques.push('question');
  if (/\.{3}|—$|\.\.\.$/.test(lastLine.trim())) closingTechniques.push('ellipsis');
  if (/^---$/m.test(prose.slice(-50))) closingTechniques.push('scene_break');
  if (/!(?!\w)/.test(lastLine.trim())) closingTechniques.push('exclamation');

  return {
    authorId: projectId,
    extractedAt: new Date().toISOString(),
    sourceChapter,
    voice: {
      sentenceLength,
      paragraphLength,
      pacing,
      dialogueRatio: Math.round(dialogueRatio * 100) / 100,
      descriptionDensity,
      narrativePerspective,
      tense,
    },
    patterns: {
      openingTechniques,
      closingTechniques,
      transitionPhrases: [],
      favoriteWords,
      sentenceStarters: [],
      avoidedPatterns: [],
    },
    characterization: {
      dialogueTags: 'moderate',
      innerMonologue: 'occasional',
      showDontTell: 'medium',
    },
    genreExpectations: {
      pacingProfile: pacing,
      chapterLength: { min: 2000, max: 5000, typical: Math.round(totalWords) },
      sceneLength: { min: 300, max: 1500, typical: 800 },
    },
  };
}

/**
 * Compare two style profiles for significant drift
 * @param {object} profile1 - First profile
 * @param {object} profile2 - Second profile
 * @returns {object} comparison result
 */
function compareStyleProfiles(profile1, profile2) {
  const differences = [];

  for (const key of Object.keys(profile1.voice)) {
    if (profile1.voice[key] !== profile2.voice[key]) {
      differences.push({
        aspect: `voice.${key}`,
        from: profile1.voice[key],
        to: profile2.voice[key],
        severity: ['dialogueRatio', 'narrativePerspective', 'tense'].includes(key) ? 'high' : 'medium',
      });
    }
  }

  const significantDrift = differences.filter(d => d.severity === 'high').length > 0;

  return { significantDrift, differences };
}

/**
 * Apply style constraints to writing instructions
 * @param {object} profile - Style profile
 * @returns {string} Writing instructions string
 */
function applyStyleConstraints(profile) {
  const voice = profile.voice;
  const patterns = profile.patterns;

  const instructions = [
    `Style constraints from style profile (extracted at ${profile.extractedAt}):`,
    `- Sentence length: ${voice.sentenceLength} (aim for variation, not monotony)`,
    `- Paragraph length: ${voice.paragraphLength}`,
    `- Pacing: ${voice.pacing}`,
    `- Dialogue ratio: ~${Math.round(voice.dialogueRatio * 100)}% of words`,
    `- Description density: ${voice.descriptionDensity}`,
    `- POV: ${voice.narrativePerspective}, tense: ${voice.tense}`,
    `- Opening with: ${patterns.openingTechniques.join(', ') || 'varied'}`,
    `- Closing with: ${patterns.closingTechniques.join(', ') || 'varied'}`,
  ];

  if (patterns.favoriteWords.length > 0) {
    instructions.push(`- Favorite words to use: ${patterns.favoriteWords.slice(0, 5).join(', ')}`);
  }

  if (patterns.avoidedPatterns.length > 0) {
    instructions.push(`- Avoid: ${patterns.avoidedPatterns.join(', ')}`);
  }

  return instructions.join('\n');
}

/**
 * Write a style profile to file
 * @param {string} projectDir - Path to project directory
 * @param {object} profile - Style profile object
 */
function writeStyleProfile(projectDir, profile) {
  const profilePath = `${projectDir}/style-profile.json`;
  const tempPath = `${profileDir}.tmp`;

  fs.writeFileSync(tempPath, JSON.stringify(profile, null, 2), 'utf-8');
  fs.renameSync(tempPath, profilePath);
}

module.exports = {
  extractStyleProfile,
  compareStyleProfiles,
  applyStyleConstraints,
  writeStyleProfile,
};
