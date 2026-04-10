/**
 * Novel Writing Plugin — State Manager
 * Handles project CRUD and active project resolution.
 *
 * Usage:
 *   node state-manager.js create <name> [--genre=<genre>] [--tone=<tone>]
 *   node state-manager.js list
 *   node state-manager.js load <project-id>
 *   node state-manager.js delete <project-id>
 *   node state-manager.js active
 *   node state-manager.js meta <project-id>
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readMeta(projectId) {
  const metaPath = path.join(DATA_DIR, projectId, 'meta.json');
  if (!fs.existsSync(metaPath)) {
    throw new Error(`Project not found: ${projectId}`);
  }
  return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
}

function writeMeta(projectId, meta) {
  const metaPath = path.join(DATA_DIR, projectId, 'meta.json');
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
}

function createProject(name, opts = {}) {
  ensureDataDir();
  const id = uuidv4();
  const projectDir = path.join(DATA_DIR, id);
  fs.mkdirSync(projectDir, { recursive: true });

  const meta = {
    id,
    name,
    genre: opts.genre || 'unknown',
    tone: opts.tone || 'neutral',
    targetWordCount: opts.targetWordCount || 80000,
    currentWordCount: 0,
    activeChapter: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const outline = {
    structure: 'three-act',
    acts: [
      { name: 'Act I', chapters: [], summary: '' },
      { name: 'Act II', chapters: [], summary: '' },
      { name: 'Act III', chapters: [], summary: '' },
    ],
    chapters: [],
  };

  const characters = { characters: [] };
  const world = {
    type: opts.genre || 'unknown',
    magicSystem: { name: '', rules: [], limitations: [], source: '' },
    factions: [],
    locations: [],
    timeline: [],
    lore: [],
  };

  writeMeta(id, meta);
  fs.writeFileSync(path.join(projectDir, 'outline.json'), JSON.stringify(outline, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectDir, 'characters.json'), JSON.stringify(characters, null, 2), 'utf-8');
  fs.writeFileSync(path.join(projectDir, 'world.json'), JSON.stringify(world, null, 2), 'utf-8');

  fs.mkdirSync(path.join(projectDir, 'chapters'), { recursive: true });

  console.log(JSON.stringify({ success: true, projectId: id, name, meta }));
}

function listProjects() {
  ensureDataDir();
  const dirs = fs.readdirSync(DATA_DIR).filter(f => {
    return fs.statSync(path.join(DATA_DIR, f)).isDirectory();
  });

  const projects = dirs.map(id => {
    try {
      const meta = readMeta(id);
      return { id, name: meta.name, genre: meta.genre, updatedAt: meta.updatedAt };
    } catch {
      return null;
    }
  }).filter(Boolean);

  console.log(JSON.stringify({ projects }));
}

function loadProject(projectId) {
  try {
    const meta = readMeta(projectId);
    const projectDir = path.join(DATA_DIR, projectId);

    const files = {};
    for (const file of ['outline.json', 'characters.json', 'world.json', 'beats.json', 'style-profile.json']) {
      const filePath = path.join(projectDir, file);
      if (fs.existsSync(filePath)) {
        files[file] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    }

    const chapters = fs.existsSync(path.join(projectDir, 'chapters'))
      ? fs.readdirSync(path.join(projectDir, 'chapters')).filter(f => f.endsWith('.md'))
      : [];

    console.log(JSON.stringify({ success: true, meta, files, chapterCount: chapters.length }));
  } catch (err) {
    console.error(JSON.stringify({ success: false, error: err.message }));
    process.exit(1);
  }
}

function deleteProject(projectId) {
  const projectDir = path.join(DATA_DIR, projectId);
  if (!fs.existsSync(projectDir)) {
    console.error(JSON.stringify({ success: false, error: 'Project not found' }));
    process.exit(1);
  }
  fs.rmSync(projectDir, { recursive: true });
  console.log(JSON.stringify({ success: true, deleted: projectId }));
}

function getActiveProject() {
  ensureDataDir();
  const dirs = fs.readdirSync(DATA_DIR).filter(f => {
    return fs.statSync(path.join(DATA_DIR, f)).isDirectory();
  });

  if (dirs.length === 0) {
    console.log(JSON.stringify({ activeProject: null }));
    return;
  }

  if (dirs.length === 1) {
    const meta = readMeta(dirs[0]);
    console.log(JSON.stringify({ activeProject: { id: dirs[0], name: meta.name } }));
    return;
  }

  // Multiple projects — return all for user to choose
  const projects = dirs.map(id => {
    try {
      const meta = readMeta(id);
      return { id, name: meta.name };
    } catch {
      return null;
    }
  }).filter(Boolean);

  console.log(JSON.stringify({ multiple: true, projects }));
}

function getMeta(projectId) {
  try {
    const meta = readMeta(projectId);
    console.log(JSON.stringify({ success: true, meta }));
  } catch (err) {
    console.error(JSON.stringify({ success: false, error: err.message }));
    process.exit(1);
  }
}

// CLI routing
const [command, arg, ...rest] = process.argv.slice(2);
const opts = {};
for (const token of rest) {
  if (token.startsWith('--')) {
    const [key, value] = token.slice(2).split('=');
    opts[key] = value;
  }
}

switch (command) {
  case 'create':    createProject(arg, opts); break;
  case 'list':      listProjects(); break;
  case 'load':       loadProject(arg); break;
  case 'delete':     deleteProject(arg); break;
  case 'active':     getActiveProject(); break;
  case 'meta':       getMeta(arg); break;
  default:
    console.error('Usage: node state-manager.js <create|list|load|delete|active> [args]');
    process.exit(1);
}
