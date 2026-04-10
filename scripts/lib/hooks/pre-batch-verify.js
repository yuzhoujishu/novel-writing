/**
 * Novel Writing Plugin — Pre-Batch Verify Hook
 * Fires before any state-manager.js call to verify the project and outline are valid.
 *
 * Trigger: PreToolUse, matcher: Bash.*state-manager
 * Timeout: 5s, Async: false (blocking)
 *
 * Profile gating: respects ECC_HOOK_PROFILE environment variable.
 *   minimal  -> pass through immediately
 *   standard -> enforce verification
 *   strict   -> same as standard
 *
 * Exit codes:
 *   0 = verified, allow through
 *   2 = verification failed, block
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

const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');

/**
 * Extract the Bash command string from stdin JSON.
 * @param {string} stdin
 * @returns {string|null}
 */
function extractCommand(stdin) {
  try {
    const input = JSON.parse(stdin);
    // Command can be at top level or inside tool_input
    const raw = input.command || input.tool_input?.command || '';
    return typeof raw === 'string' ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Check if any project has a valid outline with chapters.
 * @returns {boolean}
 */
function hasValidOutline() {
  if (!fs.existsSync(DATA_DIR)) return false;
  try {
    const dirs = fs.readdirSync(DATA_DIR).filter(f => {
      try {
        return fs.statSync(path.join(DATA_DIR, f)).isDirectory();
      } catch {
        return false;
      }
    });

    for (const projectId of dirs) {
      const outlinePath = path.join(DATA_DIR, projectId, 'outline.json');
      if (fs.existsSync(outlinePath)) {
        try {
          const outline = JSON.parse(fs.readFileSync(outlinePath, 'utf-8'));
          if (outline.chapters && outline.chapters.length > 0) {
            return true;
          }
        } catch {
          // Skip malformed outline
        }
      }
    }
  } catch {
    // Ignore
  }
  return false;
}

function run(rawInput) {
  // Gate: skip all checks in minimal profile mode
  if (!isHookEnabled()) {
    process.exit(0);
  }

  let stdin = '';
  try {
    stdin = fs.readFileSync('/dev/stdin', 'utf-8').trim();
  } catch {
    process.stdout.write(rawInput);
    process.exit(0);
  }

  const command = extractCommand(stdin);
  if (!command) {
    process.stdout.write(rawInput);
    process.exit(0);
  }

  // Only verify relevant state-manager subcommands
  const verifySubcommands = ['load', 'active', 'meta'];
  const isRelevant = verifySubcommands.some(sub => {
    return command.includes('state-manager.js') && command.includes(sub);
  });

  // Always pass through 'create' — creating a new project should not be blocked
  const isCreate = command.includes('create');

  if (!isRelevant || isCreate) {
    process.stdout.write(rawInput);
    process.exit(0);
  }

  // Verify data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    console.error('[pre-batch-verify] ERROR: data/ directory does not exist.');
    console.error('[pre-batch-verify] No project found. Create one with:');
    console.error('[pre-batch-verify]   node scripts/lib/state-manager.js create "Project Name"');
    process.exit(2);
  }

  // Verify at least one project exists
  let projectDirs;
  try {
    projectDirs = fs.readdirSync(DATA_DIR).filter(f => {
      try {
        return fs.statSync(path.join(DATA_DIR, f)).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    projectDirs = [];
  }

  if (projectDirs.length === 0) {
    console.error('[pre-batch-verify] ERROR: No projects found in data/.');
    console.error('[pre-batch-verify] Create a project with:');
    console.error('[pre-batch-verify]   node scripts/lib/state-manager.js create "Project Name"');
    process.exit(2);
  }

  // For 'load' commands, verify outline exists
  if (command.includes('load') && !hasValidOutline()) {
    console.error('[pre-batch-verify] ERROR: No valid outline.json found with chapters.');
    console.error('[pre-batch-verify] Run /novel:outline first to create your story outline.');
    process.exit(2);
  }

  console.log('[pre-batch-verify] Project and outline verified.');
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
