// rebrand-to-green.js
//
// Converts Tailwind "blue-NNN" utility classes (bg-blue-600, text-blue-500,
// border-blue-400, ring-blue-500, from-blue-950, hover:bg-blue-50, etc.)
// to the equivalent "emerald-NNN" across all .tsx/.ts/.jsx/.js files in src/.
//
// SAFE: Only matches "blue-" followed by digits (e.g. blue-50, blue-600,
// blue-950). Class names like "badge-blue" (no trailing digits) are left
// untouched.
//
// Run from your project root (where /src lives):
//   node rebrand-to-green.js
//
// Review changes with `git diff` before committing.

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(process.cwd(), 'src');
const PATTERN = /blue-(\d{2,3})/g;
const EXTENSIONS = new Set(['.tsx', '.ts', '.jsx', '.js']);

if (!fs.existsSync(SRC_DIR)) {
  console.error("Error: 'src' folder not found. Run this from your project root.");
  process.exit(1);
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walk(fullPath, files);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = walk(SRC_DIR);
let totalReplacements = 0;
let updatedCount = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.match(PATTERN);
  if (matches) {
    const newContent = content.replace(PATTERN, 'emerald-$1');
    fs.writeFileSync(file, newContent, 'utf8');
    totalReplacements += matches.length;
    updatedCount++;
    console.log(`  updated: ${path.relative(process.cwd(), file)} (${matches.length} replacements)`);
  }
}

console.log('');
console.log(`Done. Replaced ${totalReplacements} occurrence(s) of blue-NNN across ${updatedCount} file(s).`);
console.log("(badge-blue and other non-numeric 'blue' class names were left untouched.)");
