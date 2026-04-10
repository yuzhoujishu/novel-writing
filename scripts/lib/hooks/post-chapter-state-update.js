/**
 * Novel Writing Plugin — Post-Chapter State Update Hook
 * Fires on every Write to chapters/{N}.md
 * Updates outline.json, meta.json, and beats.json with real-time state.
 *
 * Trigger: PostToolUse, matcher: Write.*chapters/\d+\.md
 * Timeout: 10s, non-blocking
 *
 * Profile gating: respects ECC_HOOK_PROFILE environment variable.
 *   minimal  -> pass through immediately (no state updates)
 *   standard -> update state files (default)
 *   strict   -> same as standard
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');

/**
 * Check if this hook should run based on ECC_HOOK_PROFILE.
 * Returns false when profile is 'minimal' (hooks disabled).
 */
function isHookEnabled() {
  const profile = process.env.ECC_HOOK_PROFILE || 'standard';
  return profile !== 'minimal';
}

/**
 * Count Chinese characters (CJK range).
 * @param {string} text
 * @returns {number}
 */
function countChineseChars(text) {
  return (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) || []).length;
}

/**
 * Count scene breaks (---) in chapter content.
 * @param {string} text
 * @returns {number}
 */
function countSceneBreaks(text) {
  return (text.match(/^---$/gm) || []).length;
}

/**
 * Count total words (CJK characters + English tokens).
 * @param {string} text
 * @returns {number}
 */
function countWords(text) {
  const chineseChars = countChineseChars(text);
  const englishWords = (
    text
      .replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, ' ')
      .match(/\b\w+\b/g) || []
  ).length;
  return chineseChars + englishWords;
}

/**
 * Extract chapter number from file path like "data/{id}/chapters/03.md".
 * @param {string} filePath
 * @returns {number|null}
 */
function extractChapterNumber(filePath) {
  const match = filePath.match(/chapters[\\\/](\d+)\.md$/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Infer project ID from chapter file path.
 * e.g. ".../data/{projectId}/chapters/01.md" -> {projectId}
 * @param {string} filePath
 * @returns {string|null}
 */
function inferProjectId(filePath) {
  const match = filePath.match(/data[\\\/]([^\\/]+)[\\\/]chapters/i);
  return match ? match[1] : null;
}

/**
 * Find the active project ID when there's only one project.
 * @returns {string|null}
 */
function findActiveProjectId() {
  if (!fs.existsSync(DATA_DIR)) return null;
  const dirs = fs.readdirSync(DATA_DIR).filter(f => {
    try {
      return fs.statSync(path.join(DATA_DIR, f)).isDirectory();
    } catch {
      return false;
    }
  });
  return dirs.length === 1 ? dirs[0] : null;
}

/**
 * Read a JSON file safely.
 * @param {string} filePath
 * @returns {object|null}
 */
function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Write a JSON file atomically (temp + rename).
 * @param {string} filePath
 * @param {object} data
 */
function writeJson(filePath, data) {
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, filePath);
}

/**
 * Update outline.json for a written chapter.
 * @param {string} projectDir
 * @param {number} chapterNum
 * @param {number} wordCount
 * @param {number} sceneCount
 */
function updateOutline(projectDir, chapterNum, wordCount, sceneCount) {
  const outlinePath = path.join(projectDir, 'outline.json');
  const outline = readJson(outlinePath);
  if (!outline) return;

  const chapter = outline.chapters.find(c => c.id === chapterNum);
  if (chapter) {
    chapter.status = 'draft';
    chapter.wordCount = wordCount;
    chapter.sceneCount = sceneCount;
    chapter.updatedAt = new Date().toISOString();
    writeJson(outlinePath, outline);
  }
}

/**
 * Update meta.json with word count delta and timestamp.
 * @param {string} projectDir
 * @param {number} wordCountDelta
 */
function updateMeta(projectDir, wordCountDelta) {
  const metaPath = path.join(projectDir, 'meta.json');
  const meta = readJson(metaPath);
  if (!meta) return;

  meta.currentWordCount = (meta.currentWordCount || 0) + wordCountDelta;
  meta.updatedAt = new Date().toISOString();
  writeJson(metaPath, meta);
}

/**
 * Update beats.json marking beats as 'written' for a chapter.
 * @param {string} projectDir
 * @param {number} chapterNum
 */
function updateBeats(projectDir, chapterNum) {
  const beatsPath = path.join(projectDir, 'beats.json');
  const beats = readJson(beatsPath);
  if (!beats) return;

  let changed = false;

  if (beats.globalBeats) {
    for (const beat of beats.globalBeats) {
      if (beat.chapter === chapterNum && beat.status === 'outline') {
        beat.status = 'written';
        changed = true;
      }
    }
  }

  if (beats.sceneBreakdown) {
    const key = String(chapterNum);
    if (beats.sceneBreakdown[key]) {
      for (const scene of beats.sceneBreakdown[key]) {
        if (scene.status === 'outline') {
          scene.status = 'written';
          changed = true;
        }
      }
    }
  }

  if (changed) {
    writeJson(beatsPath, beats);
  }
}

/**
 * Read chapter content from file (since PostToolUse has tool_result with file content).
 * @param {string} projectDir
 * @param {number} chapterNum
 * @returns {string|null}
 */
function readChapterContent(projectDir, chapterNum) {
  const chapterFile = `${String(chapterNum).padStart(2, '0')}.md`;
  const chapterPath = path.join(projectDir, 'chapters', chapterFile);
  if (!fs.existsSync(chapterPath)) return null;
  try {
    return fs.readFileSync(chapterPath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Main hook execution.
 * Reads the chapter file that was just written and updates all relevant state files.
 */
function run(rawInput) {
  // Gate: skip all updates in minimal profile mode
  if (!isHookEnabled()) {
    process.exit(0);
  }

  let input;
  try {
    input = JSON.parse(rawInput);
  } catch {
    // Cannot parse — skip silently
    process.stdout.write(rawInput);
    process.exit(0);
  }

  // Support both flat and nested tool_input structures
  const rawToolInput = input.tool_input || input;
  const filePath = rawToolInput.file_path || '';

  if (!filePath) {
    process.stdout.write(rawInput);
    process.exit(0);
  }

  const chapterNum = extractChapterNumber(filePath);
  if (chapterNum === null) {
    process.stdout.write(rawInput);
    process.exit(0);
  }

  // Find project ID
  let projectId = inferProjectId(filePath);
  if (!projectId) {
    projectId = findActiveProjectId();
  }
  if (!projectId) {
    console.error('[post-chapter-state-update] Could not determine project ID');
    process.stdout.write(rawInput);
    process.exit(0);
  }

  const projectDir = path.join(DATA_DIR, projectId);
  if (!fs.existsSync(projectDir)) {
    console.error('[post-chapter-state-update] Project directory not found');
    process.stdout.write(rawInput);
    process.exit(0);
  }

  // Get content: try tool_result first (post-tool), fallback to file read
  const toolResult = input.tool_result;
  let content = '';
  if (toolResult && toolResult.output) {
    content = typeof toolResult.output === 'string' ? toolResult.output : '';
  }

  if (!content) {
    // Fallback: read from file
    content = readChapterContent(projectDir, chapterNum) || '';
  }

  if (!content) {
    console.error('[post-chapter-state-update] Could not read chapter content');
    process.stdout.write(rawInput);
    process.exit(0);
  }

  const wordCount = countWords(content);
  const sceneCount = countSceneBreaks(content);
  const chineseChars = countChineseChars(content);

  // Update state files
  updateOutline(projectDir, chapterNum, wordCount, sceneCount);
  updateMeta(projectDir, wordCount);
  updateBeats(projectDir, chapterNum);

  // Report
  console.log(
    `[post-chapter-state-update] Chapter ${chapterNum}: ` +
    `${wordCount} words, ${sceneCount} scenes, ${chineseChars} Chinese chars. ` +
    `State files updated.`
  );

  process.stdout.write(rawInput);
  process.exit(0);
}

// Legacy stdin entry
if (require.main === module) {
  let data = '';
  process.stdin.on('data', chunk => { data += chunk; });
  process.stdin.on('end', () => { run(data); });
}

module.exports = { run };
