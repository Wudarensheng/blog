/**
 * 校验 src/ 下所有 `lucide:xxx` / `simple-icons:xxx` 引用是否真实存在。
 * 图标是构建期从 @iconify-json/* 里查表内联的，写错名字会在构建时报错，
 * 这个脚本让错误提前暴露在一次静态检查里。
 *
 *   node scripts/check-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const lucide = require('@iconify-json/lucide/icons.json').icons;
const simple = require('@iconify-json/simple-icons/icons.json').icons;

const SETS = { lucide, 'simple-icons': simple };
const PATTERN = /(?:lucide|simple-icons):[a-z0-9-]+/g;

const refs = new Map();

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (/\.(astro|ts|mts|js|mjs|svelte|md|mdx)$/.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8');
      for (const match of text.matchAll(PATTERN)) {
        if (!refs.has(match[0])) refs.set(match[0], new Set());
        refs.get(match[0]).add(path.relative(process.cwd(), full));
      }
    }
  }
}

walk('src');

const missing = [];
for (const [name, files] of refs) {
  const [prefix, icon] = name.split(':');
  if (!SETS[prefix]?.[icon]) missing.push([name, [...files]]);
}

console.log(`检查了 ${refs.size} 个图标引用。`);

if (missing.length) {
  console.log('\n找不到的图标：');
  for (const [name, files] of missing) {
    console.log(`  ✗ ${name}`);
    for (const file of files) console.log(`      ${file}`);
  }
  process.exit(1);
}

console.log('全部存在 ✓');
