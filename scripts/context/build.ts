#!/usr/bin/env tsx
// @file scripts/context/build.ts — generate CONTEXT.md from repo state + gap analysis

import { execSync } from 'node:child_process';
import {
  existsSync, readFileSync, writeFileSync, renameSync, readdirSync,
} from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.cwd();
const CHECK = process.argv.includes('--check');

// ---------- types ----------

interface Config {
  output: string;
  annotations: { prefix: string; required: boolean };
  tree: { exclude: string[] };
  scan: { exclude: string[] };
  specs: { behavior: string; contract: string; stack: string; skills: string };
  secretScan: { failOnMatch: boolean };
}

interface Impl {
  name: string; kind: string; file: string; line: number; stub: boolean;
}

interface SpecRef {
  token: string; source: string; file: string; line: number;
}

interface GapItem {
  status: 'DONE' | 'STUB' | 'MISSING';
  name: string; kind: string;
  ref: string; refLine: number;
  impl?: string; implLine?: number;
}

// ---------- shell helpers ----------

function sh(cmd: string): string {
  try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
}

function getCommit(): string { return sh('git rev-parse HEAD') || 'unknown'; }

function getPackageManager(): string {
  for (const [f, pm] of [['pnpm-lock.yaml','pnpm'],['yarn.lock','yarn'],['bun.lockb','bun'],['package-lock.json','npm']] as const) {
    if (existsSync(join(ROOT, f))) return pm;
  }
  return 'unknown';
}

function getFoundry(): string | null {
  const v = sh('forge --version');
  return v ? v.split('\n')[0] : null;
}

// ---------- glob ----------

function globToRegex(glob: string): RegExp {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      if (glob[i + 2] === '/') { re += '(?:[^/]+/)*'; i += 2; }
      else { re += '.*'; i += 1; }
    } else if (c === '*') {
      re += '[^/]*';
    } else if ('\\^$.|?+()[]{}'.includes(c)) {
      re += '\\' + c;
    } else {
      re += c;
    }
  }
  return new RegExp('^' + re + '$');
}

const globCache = new Map<string, RegExp>();
function matchGlob(path: string, pattern: string): boolean {
  let re = globCache.get(pattern);
  if (!re) { re = globToRegex(pattern); globCache.set(pattern, re); }
  return re.test(path);
}

// ---------- file listing ----------

function listFiles(): string[] {
  return sh('git ls-files').split('\n').filter(Boolean);
}

// ---------- annotation extraction ----------

function extractAnnotation(relPath: string, prefix: string): string | null {
  const ext = extname(relPath);
  if (ext === '.json') return null;
  const head = readFileSync(join(ROOT, relPath), 'utf8').split('\n').slice(0, 12);
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped + '\\s+(\\S+)\\s*[—–-]\\s*(.+)$');
  for (const line of head) {
    const m = line.match(re);
    if (m) return m[2].trim();
  }
  return null;
}

// ---------- TODO scan ----------

function findTodos(relPath: string): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  const lines = readFileSync(join(ROOT, relPath), 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/\b(TODO|FIXME|XXX)\b|unimplemented!|todo!/.test(lines[i])) {
      out.push({ line: i + 1, text: lines[i].trim().slice(0, 140) });
    }
  }
  return out;
}

// ---------- impl token extraction ----------

const CODE_EXTS = new Set(['.sol', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.sql']);

function isStubFile(relPath: string): boolean {
  const c = readFileSync(join(ROOT, relPath), 'utf8');
  return /unimplemented!|todo!|throw new Error\(['"]not implemented|TODO:\s*implement/i.test(c);
}

function extractImpl(relPath: string): Impl[] {
  const ext = extname(relPath);
  if (!CODE_EXTS.has(ext)) return [];
  const out: Impl[] = [];
  const stub = isStubFile(relPath);
  const lines = readFileSync(join(ROOT, relPath), 'utf8').split('\n');
  const push = (name: string, kind: string, line: number) =>
    out.push({ name, kind, file: relPath, line, stub });

  // Next.js app router
  const appRoute = relPath.match(/^(.+?)\/app\/(.+)\/route\.(ts|tsx|js|jsx)$/);
  if (appRoute) {
    const route = '/' + appRoute[2].replace(/\([^)]+\)\//g, '');
    push(route, 'route', 1);
  }

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    let m: RegExpMatchArray | null;

    if (ext === '.sol') {
      if ((m = ln.match(/\b(?:function|modifier)\s+(\w+)/))) push(m[1], 'function', i + 1);
      if ((m = ln.match(/\bevent\s+(\w+)/))) push(m[1], 'event', i + 1);
      if ((m = ln.match(/\berror\s+(\w+)/))) push(m[1], 'error', i + 1);
      if ((m = ln.match(/\b(?:contract|interface|library)\s+(\w+)/))) push(m[1], 'contract', i + 1);
      continue;
    }
    if (ext === '.sql') {
      if ((m = ln.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?(\w+)/i))) push(m[1], 'table', i + 1);
      continue;
    }
    // ts/js
    if ((m = ln.match(/export\s+(?:async\s+)?function\s+(\w+)/))) push(m[1], 'function', i + 1);
    if ((m = ln.match(/export\s+(?:const|let|var)\s+(\w+)/))) push(m[1], 'export', i + 1);
    if ((m = ln.match(/export\s+(?:default\s+)?(?:class|interface|type)\s+(\w+)/))) push(m[1], 'export', i + 1);
    if ((m = ln.match(/\.(?:get|post|put|patch|delete|all)\(\s*['"`]([^'"`]+)['"`]/))) push(m[1], 'route', i + 1);
    if ((m = ln.match(/\.command\(\s*['"`]([^'"`]+)['"`]/))) push(m[1], 'command', i + 1);
  }
  return out;
}

// ---------- spec token extraction ----------

function isImplLike(tok: string): boolean {
  if (tok.length < 3 || tok.length > 80) return false;
  if (/\s/.test(tok)) return false;
  if (/^https?:/.test(tok)) return false;
  if (/^\//.test(tok)) return true;
  if (/^[a-z][a-zA-Z0-9]*[A-Z]\w*$/.test(tok)) return true; // camelCase
  if (/^[A-Z][a-zA-Z0-9]+$/.test(tok) && tok.length > 2) return true; // PascalCase
  if (/^[a-z]+(?:_[a-z0-9]+)+$/.test(tok)) return true; // snake_case
  return false;
}

function parseSpec(relPath: string): SpecRef[] {
  if (!existsSync(join(ROOT, relPath))) return [];
  const out: SpecRef[] = [];
  const lines = readFileSync(join(ROOT, relPath), 'utf8').split('\n');
  const source = relPath;
  for (let i = 0; i < lines.length; i++) {
    const re = /`([^`\n]+)`/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(lines[i]))) {
      const tok = m[1].trim();
      if (!isImplLike(tok)) continue;
      out.push({ token: tok, source, file: relPath, line: i + 1 });
    }
  }
  return out;
}

function findSkillFiles(pattern: string): string[] {
  if (!pattern) return [];
  const parts = pattern.split('/');
  const star = parts.indexOf('*');
  if (star < 0) return existsSync(join(ROOT, pattern)) ? [pattern] : [];
  const baseDir = parts.slice(0, star).join('/');
  const tail = parts.slice(star + 1);
  const abs = join(ROOT, baseDir);
  if (!existsSync(abs)) return [];
  const out: string[] = [];
  for (const d of readdirSync(abs, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const rel = [...parts.slice(0, star), d.name, ...tail].join('/');
    if (existsSync(join(ROOT, rel))) out.push(rel);
  }
  return out;
}

// ---------- gap analysis ----------

function analyzeGap(specRefs: SpecRef[], impl: Impl[]): GapItem[] {
  const byName = new Map<string, Impl[]>();
  for (const i of impl) {
    const arr = byName.get(i.name) ?? [];
    arr.push(i);
    byName.set(i.name, arr);
  }
  const items: GapItem[] = [];
  const seen = new Set<string>();
  for (const r of specRefs) {
    const key = `${r.source}|${r.token}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const hits = byName.get(r.token) ?? [];
    if (hits.length === 0) {
      items.push({ status: 'MISSING', name: r.token, kind: 'unknown', ref: r.source, refLine: r.line });
    } else {
      for (const h of hits) {
        items.push({
          status: h.stub ? 'STUB' : 'DONE',
          name: h.name, kind: h.kind,
          ref: r.source, refLine: r.line,
          impl: h.file, implLine: h.line,
        });
      }
    }
  }
  return items;
}

// ---------- tree ----------

function buildTree(paths: string[], annotations: Map<string, string>): string {
  interface N { name: string; children: Map<string, N>; isFile: boolean; path: string; }
  const root: N = { name: '', children: new Map(), isFile: false, path: '' };
  for (const p of paths) {
    const parts = p.split('/');
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      if (!cur.children.has(name)) {
        cur.children.set(name, {
          name, children: new Map(),
          isFile: i === parts.length - 1,
          path: parts.slice(0, i + 1).join('/'),
        });
      }
      cur = cur.children.get(name)!;
    }
  }
  const lines: string[] = [];
  function walk(n: N, prefix: string, last: boolean, isRoot: boolean) {
    if (!isRoot) {
      const conn = last ? '└── ' : '├── ';
      const ann = n.isFile && annotations.get(n.path) ? `  — ${annotations.get(n.path)}` : '';
      lines.push(`${prefix}${conn}${n.name}${n.isFile ? '' : '/'}${ann}`);
    }
    const kids = [...n.children.values()].sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    const np = isRoot ? '' : prefix + (last ? '    ' : '│   ');
    kids.forEach((k, i) => walk(k, np, i === kids.length - 1, false));
  }
  walk(root, '', true, true);
  return lines.join('\n');
}

// ---------- env + configs ----------

function readEnvKeys(): string[] {
  const p = join(ROOT, '.env.example');
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8').split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => /^[A-Z_][A-Z0-9_]*\s*=/.test(l))
    .map((l: string) => l.split('=')[0].trim());
}

function findConfigs(): string[] {
  const cand = [
    'foundry.toml', 'wrangler.toml', 'wrangler.jsonc', 'wrangler.json',
    'tsconfig.json', 'next.config.js', 'next.config.mjs', 'next.config.ts',
    'drizzle.config.ts', 'package.json', 'context.config.json',
  ];
  return cand.filter(c => existsSync(join(ROOT, c)));
}

// ---------- secret scan ----------

function scanSecrets(files: string[]): string[] {
  const patterns = [
    /PRIVATE_KEY\s*=\s*0x[0-9a-fA-F]{20,}/,
    /BOT_TOKEN\s*=\s*\d+:[A-Za-z0-9_-]{20,}/,
    /DATABASE_URL\s*=\s*postgres(ql)?:\/\/[^@\s]*:[^@\s]+@/,
    /api[_-]?key\s*[:=]\s*['"][A-Za-z0-9_-]{20,}['"]/i,
  ];
  const hits = new Set<string>();
  for (const f of files) {
    const c = readFileSync(join(ROOT, f), 'utf8');
    for (const p of patterns) if (p.test(c)) hits.add(f);
  }
  return [...hits];
}

// ---------- next actions ----------

const FOLDER_ORDER = ['contracts', 'database', 'db', 'indexer', 'keeper', 'backend', 'relay', 'web', 'ui', 'bot', 'telegram'];

function deriveNextActions(gap: GapItem[]): string[] {
  const missing = gap.filter(g => g.status !== 'DONE');
  if (missing.length === 0) return ['_Tidak ada gap. Semua token spec sudah ada implementasinya._'];
  const byFolder = new Map<string, GapItem[]>();
  for (const m of missing) {
    const folder = m.impl ? m.impl.split('/')[0] : m.ref.split('/')[0];
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder)!.push(m);
  }
  const out: string[] = [];
  for (const f of FOLDER_ORDER) {
    const items = byFolder.get(f);
    if (!items?.length) continue;
    out.push(`**${f}/**`);
    for (const it of items.slice(0, 15)) {
      const where = it.impl ? `\`${it.impl}:${it.implLine}\`` : `belum ada`;
      out.push(`- [${it.status}] \`${it.name}\` (${it.kind}) — dirujuk di \`${it.ref}:${it.refLine}\` · impl: ${where}`);
    }
    if (items.length > 15) out.push(`- … +${items.length - 15} lainnya`);
  }
  return out;
}

// ---------- generate ----------

function generate(args: {
  commit: string; pm: string; foundry: string | null;
  tree: string; gap: GapItem[]; todos: Map<string, { line: number; text: string }[]>;
  envKeys: string[]; configs: string[];
  warnings: string[];
}): string {
  const L: string[] = [];
  const { commit, pm, foundry, tree, gap, todos, envKeys, configs, warnings } = args;

  L.push('# CONTEXT');
  L.push('');
  L.push('> **AUTO-GENERATED** — jangan edit manual. Regenerate: `npm run context:build`.');
  L.push('');
  L.push('## Header');
  L.push('');
  L.push(`- Commit: \`${commit}\``);
  L.push(`- Node: \`${process.version}\``);
  L.push(`- Package manager: \`${pm}\``);
  L.push(`- Foundry: \`${foundry ?? 'not installed'}\``);
  L.push('');

  L.push('## Tree');
  L.push('');
  L.push('```');
  L.push(tree);
  L.push('```');
  L.push('');

  L.push('## Gap analysis');
  L.push('');
  const counts = { DONE: 0, STUB: 0, MISSING: 0 } as Record<string, number>;
  for (const g of gap) counts[g.status]++;
  L.push(`Total: DONE=${counts.DONE} STUB=${counts.STUB} MISSING=${counts.MISSING}`);
  L.push('');
  const bySpec = new Map<string, GapItem[]>();
  for (const g of gap) {
    if (!bySpec.has(g.ref)) bySpec.set(g.ref, []);
    bySpec.get(g.ref)!.push(g);
  }
  for (const [spec, items] of [...bySpec.entries()].sort()) {
    L.push(`### \`${spec}\``);
    for (const it of items) {
      const impl = it.impl ? ` · \`${it.impl}:${it.implLine}\`` : '';
      L.push(`- [${it.status}] \`${it.name}\` (${it.kind}) — ref \`${spec}:${it.refLine}\`${impl}`);
    }
    L.push('');
  }

  L.push('## Next actions');
  L.push('');
  L.push(...deriveNextActions(gap));
  L.push('');

  L.push('## Env keys');
  L.push('');
  if (envKeys.length === 0) L.push('_Tidak ada `.env.example`._');
  else for (const k of envKeys) L.push(`- \`${k}\``);
  L.push('');

  L.push('## Config files');
  L.push('');
  if (configs.length === 0) L.push('_Tidak ada._');
  else for (const c of configs) L.push(`- \`${c}\``);
  L.push('');

  L.push('## Known TODO');
  L.push('');
  if (todos.size === 0) L.push('_Tidak ada._');
  else {
    for (const [f, items] of [...todos.entries()].sort()) {
      for (const t of items) L.push(`- \`${f}:${t.line}\` — ${t.text}`);
    }
  }
  L.push('');

  if (warnings.length > 0) {
    L.push('## Warnings');
    L.push('');
    for (const w of warnings) L.push(`- ${w}`);
    L.push('');
  }

  return L.join('\n');
}

// ---------- main ----------

function main() {
  const cfgPath = join(ROOT, 'context.config.json');
  if (!existsSync(cfgPath)) {
    console.error('context.config.json tidak ditemukan.');
    process.exit(2);
  }
  const cfg: Config = JSON.parse(readFileSync(cfgPath, 'utf8'));

  const all = listFiles();
  const treeFiles = all.filter(f => !cfg.tree.exclude.some(p => matchGlob(f, p)));
  const scanFiles = all.filter(f => {
    if (extname(f) === '.md') return false;
    if (cfg.scan.exclude.some(p => matchGlob(f, p))) return false;
    return true;
  });

  // annotations
  const annotations = new Map<string, string>();
  for (const f of treeFiles) {
    const a = extractAnnotation(f, cfg.annotations.prefix);
    if (a) annotations.set(f, a);
  }

  // impl + todos + secret scan
  const impl: Impl[] = [];
  const todos = new Map<string, { line: number; text: string }[]>();
  for (const f of scanFiles) {
    impl.push(...extractImpl(f));
    const t = findTodos(f);
    if (t.length) todos.set(f, t);
  }

  // spec refs
  const specRefs: SpecRef[] = [];
  for (const p of [cfg.specs.behavior, cfg.specs.contract, cfg.specs.stack]) {
    if (p) specRefs.push(...parseSpec(p));
  }
  for (const p of findSkillFiles(cfg.specs.skills)) specRefs.push(...parseSpec(p));

  const gap = analyzeGap(specRefs, impl);

  // warnings: file dalam scan scope tanpa @file
  const warnings: string[] = [];
  if (cfg.annotations.required) {
    for (const f of scanFiles) {
      if (!annotations.has(f)) warnings.push(`File tanpa \`@file\` annotation: \`${f}\``);
    }
  }

  // secret scan
  const secrets = scanSecrets(scanFiles);
  if (secrets.length && cfg.secretScan.failOnMatch) {
    console.error('Secret terdeteksi di file:');
    for (const f of secrets) console.error('  - ' + f);
    process.exit(3);
  }

  const content = generate({
    commit: getCommit(),
    pm: getPackageManager(),
    foundry: getFoundry(),
    tree: buildTree(treeFiles, annotations),
    gap, todos,
    envKeys: readEnvKeys(),
    configs: findConfigs(),
    warnings,
  });

  const outPath = join(ROOT, cfg.output);

  if (CHECK) {
    const existing = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
    if (existing !== content) {
      console.error(`${cfg.output} is out of date. Run: npm run context:build`);
      process.exit(1);
    }
    console.log(`${cfg.output} is up to date.`);
    return;
  }

  const tmp = outPath + '.tmp';
  writeFileSync(tmp, content);
  renameSync(tmp, outPath);
  console.log(`Wrote ${cfg.output} (${content.split('\n').length} lines, gap MISSING=${gap.filter(g => g.status === 'MISSING').length}).`);
}

main();