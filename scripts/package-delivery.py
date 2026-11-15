"""Package reviewed source and build; never include user accounts or secrets."""
from pathlib import Path
from hashlib import sha256
from zipfile import ZipFile, ZIP_DEFLATED
import json

root = Path(__file__).resolve().parent.parent
output = root / 'deliverables'
output.mkdir(exist_ok=True)
archive = output / 'mission-trainer-2026-11-15.zip'
directories = ['src', 'server', 'scripts', 'public', 'app', 'dist', 'docs', 'evidence']
root_files = ['README.md', 'START_APP.cmd', 'package.json', 'pnpm-lock.yaml', 'index.html', 'server.ts', 'tsconfig.json', 'vite.config.ts', '.env.example', '.gitignore', 'metadata.json']
files = [p for directory in directories for p in (root / directory).rglob('*') if p.is_file()]
files += [root / name for name in root_files if (root / name).exists()]
with ZipFile(archive, 'w', ZIP_DEFLATED, compresslevel=9) as zipped:
    for file in sorted(files):
        relative = file.relative_to(root)
        assert not any(part in ['node_modules', '.data', 'artifacts'] for part in relative.parts)
        assert file.name == '.env.example' or not file.name.startswith('.env')
        zipped.write(file, 'nasa-junior-astronaut-mission-trainer/' + relative.as_posix())
with ZipFile(archive) as zipped:
    assert zipped.testzip() is None
digest = sha256(archive.read_bytes()).hexdigest()
manifest_digest = sha256((root / 'evidence/changes-2026-11-15.json').read_bytes()).hexdigest()
(output / 'SHA256SUMS.txt').write_text(f'{digest}  {archive.name}\n{manifest_digest}  evidence/changes-2026-11-15.json\n', encoding='utf-8')
print(json.dumps({'archive': str(archive), 'bytes': archive.stat().st_size, 'files': len(files), 'sha256': digest, 'integrity': 'CRC checked; no accounts, secrets or installed dependencies'}))
