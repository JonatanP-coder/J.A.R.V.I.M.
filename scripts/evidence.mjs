import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const baseline = JSON.parse(readFileSync(path.join(root, 'evidence/baseline.json'), 'utf8').replace(/^\uFEFF/, ''));
const before = new Map(baseline.files.map(file => [file.path, file.sha256]));
const files = [];
function walk(directory) { for (const entry of readdirSync(directory, { withFileTypes: true })) { const full = path.join(directory, entry.name); if (entry.isDirectory()) walk(full); else files.push(full); } }
for (const directory of ['src', 'server', 'scripts', 'public', 'docs']) if (existsSync(directory)) walk(directory);
for (const name of ['package.json', 'pnpm-lock.yaml', 'tsconfig.json', 'vite.config.ts', 'index.html', 'server.ts', 'README.md', 'START_APP.cmd', '.env.example', '.gitignore']) if (existsSync(name)) files.push(name);
const manifest = files.map(full => { const relative = path.relative(root, path.resolve(full)).replaceAll('\\', '/'); const sha256 = hash(full); return { path: relative, sha256, status: before.has(relative) ? before.get(relative) === sha256 ? 'unchanged' : 'modified' : 'added', baselineSha256: before.get(relative) || null }; }).sort((a, b) => a.path.localeCompare(b.path));
const protectedFiles = ['src/components/craftBuilders.ts', 'src/components/jwstBuilder.ts', 'src/utils/lunarTextures.ts', 'src/utils/launchPhysics.ts', 'src/utils/roverKinematics.ts'];
const preserved = protectedFiles.map(file => ({ path: file, unchanged: before.get(file) === hash(file) }));
if (preserved.some(file => !file.unchanged)) throw new Error('A protected model or base physics file changed. Investigate before packaging.');
const record = { requestedWorkDate: '2026-11-15', timezone: 'America/Bogota', generatedAtUtc: new Date().toISOString(), baselineManifestSha256: hash('evidence/baseline.json'), originalZipSha256: baseline.originalZipSha256, note: 'Records a received baseline and subsequent source differences. Local timestamps and hashes are not an independent timestamp, proof of authorship, or proof that the original application was created in one day.', preserved, files: manifest };
writeFileSync('evidence/changes-2026-11-15.json', JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({ manifest: 'evidence/changes-2026-11-15.json', modified: manifest.filter(f => f.status === 'modified').length, added: manifest.filter(f => f.status === 'added').length, preserved }));
