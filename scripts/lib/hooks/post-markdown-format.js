/**
 * PostToolUse Hook: Markdown Format Verifier
 * Verifies basic markdown structure after Write/Edit operations.
 * Non-blocking — always exits 0, returns findings as stderr comments.
 *
 * Hook input (stdin JSON):
 *   { tool_name, tool_input: { file_path, content }, tool_result }
 *
 * Profile gating: respects ECC_HOOK_PROFILE environment variable.
 *   minimal  -> pass through immediately (no format checks)
 *   standard -> check markdown structure (default)
 *   strict   -> same as standard
 */

/**
 * Check if this hook should run based on ECC_HOOK_PROFILE.
 * Returns false when profile is 'minimal' (hooks disabled).
 */
function isHookEnabled() {
  const profile = process.env.ECC_HOOK_PROFILE || 'standard';
  return profile !== 'minimal';
}

function run(rawInput) {
  // Gate: skip all checks in minimal profile mode
  if (!isHookEnabled()) {
    process.stdout.write(rawInput);
    process.exit(0);
  }
  let input;
  try {
    input = JSON.parse(rawInput);
  } catch {
    // Parse error — don't block, just pass through
    process.stdout.write(rawInput);
    process.exit(0);
  }

  const { tool_name, tool_input } = input;

  // Only check Write and Edit tools on .md files
  if (!['Write', 'Edit'].includes(tool_name)) {
    process.stdout.write(rawInput);
    process.exit(0);
  }

  const filePath = tool_input?.file_path || '';
  if (!filePath.endsWith('.md')) {
    process.stdout.write(rawInput);
    process.exit(0);
  }

  // Get content
  const content = tool_name === 'Write' ? (tool_input?.content || '') :
                  tool_name === 'Edit' ? (tool_input?.old_string || '') : '';

  const warnings = [];

  // Check heading hierarchy: no skipping H1→H3
  const headings = content.match(/^#{1,6}\s+.+$/gm) || [];
  let prevLevel = 0;
  for (const h of headings) {
    const level = h.match(/^(#+)/)?.[1].length || 0;
    if (prevLevel > 0 && level > prevLevel + 1) {
      warnings.push(`[Hook] Heading level skip: H${prevLevel} → H${level} in ${filePath}`);
    }
    prevLevel = level;
  }

  // Check for consistent scene break format (--- on its own line)
  const badSceneBreaks = content.match(/^[^-\n](-{3,})[^\n]*$/gm) || [];
  if (badSceneBreaks.length > 0) {
    warnings.push(`[Hook] Scene break should be '---' alone on a line in ${filePath}`);
  }

  // Check for trailing whitespace (light check — just flag lines ending with spaces)
  const trailingSpace = content.match(/[ \t]+$/gm) || [];
  if (trailingSpace.length > 5) {
    warnings.push(`[Hook] ${trailingSpace.length} lines have trailing whitespace in ${filePath}`);
  }

  // Report findings to stderr (non-blocking)
  for (const w of warnings) {
    console.error(w);
  }

  // Always pass through
  process.stdout.write(rawInput);
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
