/**
 * PreToolUse Hook: Chinese Character Count Enforcement
 * Blocks Write/Edit on chapter files if content has fewer than 3000 Chinese characters.
 *
 * Hook input (stdin JSON):
 *   { tool_name, tool_input: { file_path, content, old_string, new_string }, ... }
 *
 * Profile gating: respects ECC_HOOK_PROFILE environment variable.
 *   minimal  -> pass through immediately (no checks)
 *   standard -> enforce minimum character count (default)
 *   strict   -> same as standard
 *
 * Exit codes:
 *   0 = allow through (>= 3000 Chinese chars, or not a chapter file)
 *   2 = block (content < 3000 Chinese chars)
 */

/**
 * Check if this hook should run based on ECC_HOOK_PROFILE.
 * Returns false when profile is 'minimal' (hooks disabled).
 */
function isHookEnabled() {
  const profile = process.env.ECC_HOOK_PROFILE || 'standard';
  return profile !== 'minimal';
}

function countChineseChars(text) {
  if (!text || typeof text !== 'string') return 0;
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // CJK Unified Ideographs: U+4E00–U+9FFF
    // Extension A: U+3400–U+4DBF
    // Extension B: U+20000–U+2A6DF
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x20000 && code <= 0x2a6df)
    ) {
      count++;
    }
  }
  return count;
}

function isChapterFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  // Chapter files: chapters/{N}.md where N is one or more digits
  // e.g. chapters/01.md, chapters/12.md, chapters/123.md
  // NOT: chapters/00-outline.md, chapters/00-characters.md, etc.
  return /chapters\/(\d+)\.md$/i.test(filePath);
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
    // Parse error — fail open, do not block
    process.exit(0);
  }

  const { tool_name, tool_input } = input;

  // Only check Write and Edit tools
  if (!['Write', 'Edit'].includes(tool_name)) {
    process.exit(0);
  }

  const filePath = tool_input?.file_path || '';

  // Only check chapter files
  if (!isChapterFile(filePath)) {
    process.exit(0);
  }

  // Extract the actual content being written
  let content;
  if (tool_name === 'Write') {
    content = tool_input?.content || '';
  } else {
    // Edit: prefer new_string (insertion), fallback to old_string (replacement target)
    content = tool_input?.new_string || tool_input?.old_string || '';
  }

  const chineseCount = countChineseChars(content);
  const MIN_CHINESE_CHARS = 3000;

  if (chineseCount < MIN_CHINESE_CHARS) {
    console.error(
      `[Hook] BLOCKED: Chapter file "${filePath}" has ${chineseCount} Chinese characters. ` +
      `Minimum required: ${MIN_CHINESE_CHARS}. ` +
      `Please expand your content before writing.`
    );
    process.exit(2);
  }

  // Content meets threshold — allow through
  process.exit(0);
}

// Stdin entry point
if (require.main === module) {
  let data = '';
  process.stdin.on('data', chunk => { data += chunk; });
  process.stdin.on('end', () => {
    run(data);
  });
}

module.exports = { run, countChineseChars, isChapterFile };
