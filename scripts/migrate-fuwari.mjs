/**
 * 只读迁移：把 Fuwari 站点的文章与图片复制到本主题。
 *
 *   node scripts/migrate-fuwari.mjs <Fuwari 站点的根目录>
 *   # 也可以用环境变量：FUWARI_SRC=... node scripts/migrate-fuwari.mjs
 *
 * 例如：
 *   node scripts/migrate-fuwari.mjs ~/sites/my-fuwari-blog
 *
 * 安全约束（写死在代码里，不靠自觉）：
 *   · 源目录只经过 readdir / readFile / cpSync 的读取路径
 *   · 每个写操作都要先断言「目标在本仓库内」且「目标不在源目录内」
 *   · 迁移前后各算一次源目录指纹，不一致直接退出 —— 源目录被改动过就一定看得见
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SRC_ARG = process.argv[2] ?? process.env.FUWARI_SRC;

if (!SRC_ARG) {
  console.error(
    [
      '缺少源目录。',
      '',
      '  node scripts/migrate-fuwari.mjs <Fuwari 站点的根目录>',
      '',
      '传 Fuwari 仓库的根目录（含 src/ 的那一层），例如：',
      '  node scripts/migrate-fuwari.mjs ~/sites/my-fuwari-blog',
    ].join('\n'),
  );
  process.exit(1);
}

if (!fs.existsSync(SRC_ARG)) {
  console.error(`源目录不存在：${SRC_ARG}`);
  process.exit(1);
}

const SRC_ROOT = path.resolve(SRC_ARG);
const SRC = path.join(SRC_ROOT, 'src');
const DEST_ROOT = path.resolve('.');

if (!fs.existsSync(SRC)) {
  console.error(`在源目录里找不到 src/：${SRC}`);
  process.exit(1);
}

/**
 * 任何写操作都要先过这一关。
 * 两条不变式：只能写进本仓库；绝不能写回源目录。
 * 后者才是真正危险的情况 —— 迁移脚本反向污染被迁移的站点。
 */
function assertWritable(target) {
  const resolved = path.resolve(target);
  if (!resolved.startsWith(DEST_ROOT + path.sep)) {
    throw new Error(`拒绝写入仓库之外的路径: ${resolved}`);
  }
  if (resolved === SRC_ROOT || resolved.startsWith(SRC_ROOT + path.sep)) {
    throw new Error(`拒绝写入源目录: ${resolved}`);
  }
  return resolved;
}

function writeFile(target, content) {
  const safe = assertWritable(target);
  fs.mkdirSync(path.dirname(safe), { recursive: true });
  fs.writeFileSync(safe, content);
  return safe;
}

/* ------------------------------------------------------------------ 文章 --- */

/** Fuwari frontmatter 字段 → 本主题字段 */
const KEEP = new Set([
  'title',
  'published',
  'updated',
  'description',
  'tags',
  'category',
  'series',
  'draft',
]);
const DROP = new Set(['image', 'lang', 'prevTitle', 'prevSlug', 'nextTitle', 'nextSlug']);

function transformFrontmatter(block, file) {
  const lines = block.split(/\r?\n/);
  const kept = [];
  const seen = new Set();
  const dropped = [];

  for (const line of lines) {
    const m = line.match(/^(\w+):/);
    if (!m) {
      // 续行（YAML 多行值）——原样保留
      if (kept.length && line.trim()) kept[kept.length - 1] += `\n${line}`;
      continue;
    }
    const key = m[1];
    if (KEEP.has(key)) {
      kept.push(line.replace(/\s+$/, ''));
      seen.add(key);
    } else {
      dropped.push(key);
    }
  }

  const unexpected = dropped.filter((k) => !DROP.has(k));
  if (unexpected.length) {
    console.warn(`  ⚠ ${file}: 丢弃了未预期的字段 ${unexpected.join(', ')}`);
  }
  if (!seen.has('title')) throw new Error(`${file}: 缺少 title`);
  if (!seen.has('published')) throw new Error(`${file}: 缺少 published`);
  if (!seen.has('description')) kept.push("description: ''");
  if (!seen.has('tags')) kept.push('tags: []');
  if (!seen.has('category')) kept.push("category: '未分类'");
  if (!seen.has('draft')) kept.push('draft: false');

  return kept.join('\n');
}

/**
 * 标题层级归一化。
 *
 * Fuwari 的正文习惯用 `#` 当章节标题（文章标题由 frontmatter 单独渲染），
 * 而本主题的文章标题本身就是 <h1>。直接搬过来会出现「一页两个 h1」，
 * 目录也只认 h2/h3，等于所有章节都进不了目录。
 *
 * 处理办法：找出每篇正文里最浅的标题层级，整体平移到 h2 起步。
 * 只改行首的 # 个数，正文一字不动；代码块内的 # 注释会被跳过。
 */
function normalizeHeadings(body) {
  const lines = body.split('\n');

  let min = Infinity;
  let inFence = false;
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(/^(#{1,6})\s+/);
    if (m) min = Math.min(min, m[1].length);
  }

  if (!Number.isFinite(min) || min >= 2) return { body, shift: 0 };

  const shift = 2 - min;
  let fence = false;
  const out = lines.map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fence = !fence;
      return line;
    }
    if (fence) return line;
    const m = line.match(/^(#{1,6})(\s+.*)$/);
    if (!m) return line;
    return '#'.repeat(Math.min(6, m[1].length + shift)) + m[2];
  });

  return { body: out.join('\n'), shift };
}

function migratePosts() {
  const srcDir = path.join(SRC, 'content', 'posts');
  const outDir = path.join(DEST_ROOT, 'src', 'content', 'posts');
  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.md'));

  console.log(`\n[文章] 源目录 ${files.length} 篇`);
  const report = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(srcDir, file), 'utf8');
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!m) throw new Error(`${file}: 找不到 frontmatter`);

    const fm = transformFrontmatter(m[1], file);
    // 统一换行 + 归一化标题层级
    const normalized = m[0].length ? raw.slice(m[0].length).replace(/\r\n?/g, '\n') : '';
    const { body, shift } = normalizeHeadings(normalized.replace(/^\n+/, ''));
    const content = `---\n${fm}\n---\n\n${body}`;

    writeFile(path.join(outDir, file), content);

    const title = m[1].match(/^title:\s*(.+)$/m)?.[1] ?? '?';
    report.push(`  ✓ ${file}  ${title.trim()}${shift ? `  （标题下移 ${shift} 级）` : ''}`);
  }

  console.log(report.join('\n'));
  return files.length;
}

/* ------------------------------------------------------------------ 图片 --- */

function migrateImages() {
  const srcDir = path.join(SRC, 'assets', 'images', 'posts');
  const outDir = path.join(DEST_ROOT, 'src', 'assets', 'images', 'posts');

  if (!fs.existsSync(srcDir)) {
    console.log('\n[图片] 源目录不存在，跳过');
    return 0;
  }

  const files = fs.readdirSync(srcDir);
  let bytes = 0;
  for (const file of files) {
    const from = path.join(srcDir, file);
    const to = assertWritable(path.join(outDir, file));
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to); // 只读源、只写目标
    bytes += fs.statSync(from).size;
  }

  console.log(`\n[图片] 复制 ${files.length} 个文件，共 ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  return files.length;
}

/* ------------------------------------------------------------------ 执行 --- */

console.log(`源（只读）: ${SRC}`);
console.log(`目标（可写）: ${DEST_ROOT}`);

/** 源目录指纹：迁移前后各算一次，用来证明源数据一个字节都没被动过 */
function fingerprint(dir) {
  const entries = [];
  (function walk(d) {
    const items = fs
      .readdirSync(d, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const e of items) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else {
        const hash = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
        entries.push(`${path.relative(dir, full)}:${hash}`);
      }
    }
  })(dir);
  return entries;
}

const before = fingerprint(SRC);

const posts = migratePosts();
const images = migrateImages();

const after = fingerprint(SRC);
const untouched = before.length === after.length && before.every((h, i) => h === after[i]);

console.log(`\n[源目录完整性] 迁移前 ${before.length} 个文件 → 迁移后 ${after.length} 个`);
console.log(untouched ? '  ✓ 指纹完全一致，源数据未被修改' : '  ✗ 指纹发生变化，请立即检查！');

console.log(`\n完成：${posts} 篇文章、${images} 张图片。`);
process.exit(untouched ? 0 : 1);
