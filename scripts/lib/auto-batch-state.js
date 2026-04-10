/**
 * Novel Writing Plugin — Auto Batch State Helpers
 * Shared utilities for the /novel:auto skill's state management.
 *
 * Provides:
 * - Atomic JSON write (temp + rename)
 * - Chapter batch scanner (finds next N outline chapters)
 * - State update helpers (meta, outline, beats after batch)
 * - Style extraction trigger for new act chapters
 * - Batch summary formatter
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

/**
 * Read a JSON file safely.
 * @param {string} projectDir
 * @param {string} filename
 * @returns {object|null}
 */
function readJson(projectDir, filename) {
  const filePath = path.join(projectDir, filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Atomic JSON write: write to .tmp, then rename to target.
 * @param {string} projectDir
 * @param {string} filename
 * @param {object} data
 */
function writeJson(projectDir, filename, data) {
  const filePath = path.join(projectDir, filename);
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, filePath);
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
 * Scan outline.json for the next N chapters to write.
 *
 * @param {object} outline - Parsed outline.json
 * @param {number} startFrom - Chapter number to start from (1-based)
 * @param {number} batchSize - Number of chapters to collect (max 5)
 * @returns {{chapters: object[], skipped: object[], totalOutline: number}}
 */
function scanBatchChapters(outline, startFrom, batchSize) {
  const result = [];
  const skipped = [];
  let found = 0;

  const totalOutline = (outline.chapters || []).filter(c => c.status === 'outline').length;

  for (const chapter of outline.chapters || []) {
    if (chapter.id < startFrom) continue;

    if (chapter.status === 'outline') {
      if (found < batchSize) {
        result.push(chapter);
        found++;
      } else {
        break;
      }
    } else {
      skipped.push({ id: chapter.id, title: chapter.title, status: chapter.status });
    }
  }

  return { chapters: result, skipped, totalOutline };
}

/**
 * Update meta.json after a batch completes.
 * @param {string} projectDir
 * @param {number} startChapter - First chapter written in this batch
 * @param {number} writtenCount - Number of chapters written
 * @param {number} totalWordsAdded - Total words added in this batch
 */
function updateMetaAfterBatch(projectDir, startChapter, writtenCount, totalWordsAdded) {
  const meta = readJson(projectDir, 'meta.json');
  if (!meta) return;

  meta.activeChapter = startChapter + writtenCount;
  meta.currentWordCount = (meta.currentWordCount || 0) + totalWordsAdded;
  meta.updatedAt = new Date().toISOString();

  writeJson(projectDir, 'meta.json', meta);
}

/**
 * Update outline.json after a batch completes (batch-level, not per-chapter).
 * @param {string} projectDir
 * @param {object[]} writtenChapters - Array of {id, wordCount, sceneCount}
 */
function updateOutlineAfterBatch(projectDir, writtenChapters) {
  const outline = readJson(projectDir, 'outline.json');
  if (!outline) return;

  for (const written of writtenChapters) {
    const chapter = outline.chapters.find(c => c.id === written.id);
    if (chapter) {
      chapter.status = 'draft';
      chapter.wordCount = written.wordCount;
      chapter.sceneCount = written.sceneCount;
      chapter.updatedAt = new Date().toISOString();
    }
  }

  writeJson(projectDir, 'outline.json', outline);
}

/**
 * Update beats.json marking beats as written for given chapters.
 * @param {string} projectDir
 * @param {number[]} chapterNums
 */
function updateBeatsAfterBatch(projectDir, chapterNums) {
  const beats = readJson(projectDir, 'beats.json');
  if (!beats) return;

  const numSet = new Set(chapterNums);
  let changed = false;

  if (beats.globalBeats) {
    for (const beat of beats.globalBeats) {
      if (numSet.has(beat.chapter) && beat.status === 'outline') {
        beat.status = 'written';
        changed = true;
      }
    }
  }

  if (beats.sceneBreakdown) {
    for (const num of chapterNums) {
      const key = String(num);
      if (beats.sceneBreakdown[key]) {
        for (const scene of beats.sceneBreakdown[key]) {
          if (scene.status === 'outline') {
            scene.status = 'written';
            changed = true;
          }
        }
      }
    }
  }

  if (changed) {
    writeJson(projectDir, 'beats.json', beats);
  }
}

/**
 * Extract style profile from the first chapter of a new act.
 * @param {string} projectDir
 * @param {number} chapterNum
 * @param {object} outline - Parsed outline.json
 * @returns {boolean} true if style profile was created
 */
function extractStyleFromNewActChapter(projectDir, chapterNum, outline) {
  const stylePath = path.join(projectDir, 'style-profile.json');
  if (fs.existsSync(stylePath)) return false;

  for (const act of outline.acts || []) {
    if (act.chapters && act.chapters.length > 0) {
      if (act.chapters[0] === chapterNum) {
        const chapterFile = `${String(chapterNum).padStart(2, '0')}.md`;
        const chapterPath = path.join(projectDir, 'chapters', chapterFile);
        if (fs.existsSync(chapterPath)) {
          const prose = fs.readFileSync(chapterPath, 'utf-8');
          const { extractStyleProfile, writeStyleProfile } = require('./style-profile');
          const projectId = projectDir.split(/[\\/]/).pop();
          const profile = extractStyleProfile(prose, projectId, chapterNum);
          writeStyleProfile(projectDir, profile);
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Format a batch summary report.
 * @param {object} params
 * @returns {string}
 */
function formatBatchSummary({
  writtenChapters,
  totalWords,
  durationMs,
  startChapter,
  activeChapter,
  totalOutlineChapters,
  styleExtracted,
  styleUpdated,
}) {
  const durationSec = (durationMs / 1000).toFixed(1);
  const pct = totalOutlineChapters > 0
    ? (((activeChapter - 1) / totalOutlineChapters) * 100).toFixed(1)
    : '0.0';

  const chapterList = writtenChapters
    .map(c => `Chapter ${c.id} (${c.wordCount}w)`)
    .join(', ');

  const lines = [
    '=== Batch Complete ===',
    `Chapters written: ${chapterList}`,
    `Total words added: ${totalWords}`,
    `Active chapter: ${activeChapter}`,
    `Time elapsed: ${durationSec}s`,
    '',
    'State files updated:',
    '  - meta.json (activeChapter, currentWordCount, updatedAt)',
    '  - outline.json (status=draft, wordCount, sceneCount)',
    '  - beats.json (status=written for beats of written chapters)',
  ];

  if (styleExtracted) {
    lines.push('  - style-profile.json (extracted from first act chapter)');
  } else if (styleUpdated) {
    lines.push('  - style-profile.json (updated — awaiting confirmation)');
  }

  lines.push('');
  lines.push(`Progress: ${activeChapter - 1} / ${totalOutlineChapters} chapters (${pct}%)`);

  return lines.join('\n');
}

module.exports = {
  readJson,
  writeJson,
  countChineseChars,
  countSceneBreaks,
  countWords,
  scanBatchChapters,
  updateMetaAfterBatch,
  updateOutlineAfterBatch,
  updateBeatsAfterBatch,
  extractStyleFromNewActChapter,
  formatBatchSummary,
};
