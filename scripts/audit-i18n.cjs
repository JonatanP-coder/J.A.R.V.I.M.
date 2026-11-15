const fs = require('node:fs');
const path = require('node:path');
const parser = require('@babel/parser');
const translations = require('../src/i18n/integrated-en.json');
let checked = 0;
const missing = [];
function inspect(file) {
  const tree = parser.parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  function visit(node) {
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'tx' && node.arguments[0]?.type === 'StringLiteral') {
      const text = node.arguments[0].value;
      checked++;
      if (!translations[text]) missing.push(`${file}:${node.loc.start.line}: ${text}`);
    }
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'start', 'end', 'extra', 'comments', 'tokens'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(child => { if (child?.type) visit(child); });
      else if (value?.type) visit(value);
    }
  }
  visit(tree);
}
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(ts|tsx)$/.test(file)) inspect(file);
  }
}
walk('src');
if (missing.length) { console.error(missing.join('\n')); process.exitCode = 1; }
else console.log(`${checked} integrated UI text calls have English translations.`);
