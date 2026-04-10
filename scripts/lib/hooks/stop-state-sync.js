/**
 * Stop Hook: State Sync Checkpoint
 * Verifies that outline.json word counts match actual chapter file sizes.
 * Non-blocking — findings go to stderr only.
 *
 * Hook input (stdin JSON):
 *   { session_id, transcript_path, cwd, ... }
 *
 * Profile gating: respects ECC_HOOK_PROFILE environment variable.
 *   minimal  -> pass through immediately (no sync check)
 *   standard -> verify state consistency (default)
 *   strict   -> same as standard
 */

const fs = require('fs');
const path = require('path');

/**
 * Check if this hook should run based on ECC_HOOK_PROFILE.
 * Returns false when profile is 'minimal' (hooks disabled).
 */
function isHookEnabled() {
  const profile = process.env.ECC_HOOK_PROFILE || 'standard';
  return profile !== 'minimal';
}

function countWords(text) {
  return (text || '').split(/\s+/).filter(w => w.length > 0).length;
}

function run(rawInput) {
  // Gate: skip all checks in minimal profile mode
  if (!isHookEnabled()) {
    process.exit(0);
  }

  let input;
  try {
    input = JSON.parse(rawInput);
  } catch {
    process.exit(0);
  }

  const cwd = input.cwd || process.cwd();
  const dataDir = path.join(cwd, 'data');

  if (!fs.existsSync(dataDir)) {
    process.exit(0);
  }

  // Find active project (first subdirectory)
  const dirs = fs.readdirSync(dataDir).filter(f => {
    return fs.statSync(path.join(dataDir, f)).isDirectory();
  });

  if (dirs.length === 0) {
    process.exit(0);
  }

  const projectDir = path.join(dataDir, dirs[0]);
  const outlinePath = path.join(projectDir, 'outline.json');
  const chaptersDir = path.join(projectDir, 'chapters');

  if (!fs.existsSync(outlinePath) || !fs.existsSync(chaptersDir)) {
    process.exit(0);
  }

  let outline;
  try {
    outline = JSON.parse(fs.readFileSync(outlinePath, 'utf-8'));
  } catch {
    process.exit(0);
  }

  const chapters = fs.readdirSync(chaptersDir)
    .filter(f => f.endsWith('.md'))
    .sort();

  const warnings = [];

  // Compare outline word counts with actual file sizes
  for (const chapter of (outline.chapters || [])) {
    const chapterFile = chapters.find(f => {
      const num = parseInt(f.replace('.md', ''));
      return num === chapter.id;
    });

    if (!chapterFile) {
      if (chapter.status === 'complete' || chapter.status === 'draft') {
        warnings.push(`[Hook] Chapter ${chapter.id} has status '${chapter.status}' but no file found`);
      }
      continue;
    }

    const filePath = path.join(chaptersDir, chapterFile);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const actualWords = countWords(fileContent);
    const declaredWords = chapter.wordCount || 0;

    // Flag if discrepancy > 20%
    const diff = Math.abs(actualWords - declaredWords);
    const pct = declaredWords > 0 ? diff / declaredWords : 0;

    if (pct > 0.2 && declaredWords > 0) {
      warnings.push(
        `[Hook] Chapter ${chapter.id} word count: outline=${declaredWords}, actual=${actualWords} (${Math.round(pct * 100)}% diff)`
      );
    }
  }

  for (const w of warnings) {
    console.error(w);
  }

  process.exit(0);
}

// Legacy stdin entry
if (require.main === module) {
  let data = '';
  process.stdin.on('data', chunk => { data += chunk; });
  process.stdin.on('end', () => {
    run(data);
  });
}

module.exports = { run };
