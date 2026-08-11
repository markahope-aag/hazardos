// Vault-native env: populates process.env from 1Password documents at import,
// replacing dotenv's `loadEnv({ path: '.env.local' }); loadEnv()`. Reads DOCS in
// order, non-overriding (first wins), matching the .env.local-over-.env layering.
// Bootstraps the service-account token from ~/.claude/.env.credentials, so
// `node scripts/x.mjs` works with no plaintext .env.local and no wrapper.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const VAULT = 'DevBox .env Files';
const DOCS = ['hazardos__.env.local', 'hazardos.env'];

function opBin() {
  try { execFileSync('op', ['--version'], { stdio: 'ignore' }); return 'op'; } catch {}
  const pkg = path.join(homedir(), 'AppData/Local/Microsoft/WinGet/Packages');
  if (existsSync(pkg)) {
    const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap(e =>
      e.isDirectory() ? walk(path.join(d, e.name)) : e.name === 'op.exe' ? [path.join(d, e.name)] : []);
    const hit = walk(pkg)[0]; if (hit) return hit;
  }
  return 'op';
}

if (!process.env.OP_SERVICE_ACCOUNT_TOKEN) {
  const cred = path.join(homedir(), '.claude', '.env.credentials');
  if (existsSync(cred)) {
    const line = readFileSync(cred, 'utf8').split(/\r?\n/)
      .find(l => /^\s*(export\s+)?OP_SERVICE_ACCOUNT_TOKEN\s*=/.test(l));
    if (line) process.env.OP_SERVICE_ACCOUNT_TOKEN = line.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
  }
}

const op = opBin();
for (const doc of DOCS) {
  let raw;
  try { raw = execFileSync(op, ['document', 'get', doc, '--vault', VAULT], { encoding: 'utf8' }); }
  catch { continue; }  // a missing optional doc (e.g. the .env fallback) is fine
  for (const l of raw.split(/\r?\n/)) {
    const m = l.match(/^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
  }
}
