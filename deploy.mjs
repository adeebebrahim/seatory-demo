// Build the site and publish dist/ to the gh-pages branch (served by GitHub Pages).
// Usage:  node deploy.mjs
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const run = (cmd, cwd = ROOT) => execSync(cmd, { cwd, stdio: 'inherit' });
const out = (cmd) => execSync(cmd, { cwd: ROOT }).toString().trim();

const remote = out('git remote get-url origin');
const name = out('git config user.name');
const email = out('git config user.email');

run('node build.mjs');
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
fs.rmSync(path.join(DIST, '.git'), { recursive: true, force: true });
run('git init -q -b gh-pages', DIST);
run('git config core.longpaths true', DIST);
run('git add -A', DIST);
run(`git -c user.name="${name}" -c user.email="${email}" commit -q -m "Deploy ${new Date().toISOString()}"`, DIST);
run(`git push -q --force "${remote}" gh-pages`, DIST);
fs.rmSync(path.join(DIST, '.git'), { recursive: true, force: true });
console.log('\nPublished. GitHub Pages usually updates within a minute.');
