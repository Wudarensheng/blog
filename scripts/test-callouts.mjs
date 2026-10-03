/** 直接测试 remark-callouts 的树变换逻辑（不需要 unified）。 */
import remarkCallouts from '../src/plugins/remark-callouts.mjs';

const p = (...children) => ({ type: 'paragraph', children });
const t = (value) => ({ type: 'text', value });
const strong = (value) => ({ type: 'strong', children: [t(value)] });

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
}

function run(children) {
  const tree = { type: 'root', children };
  remarkCallouts()(tree);
  return tree.children;
}

/* --- 1. 紧凑写法 + 行内格式 ------------------------------------------------ */
{
  const out = run([
    p(t(':::tip 关于比例\n中性色占 '), strong('88%'), t('，橙色系占 '), strong('12%'), t('。\n:::')),
  ]);
  const [callout] = out;
  check('紧凑写法被识别', callout?.type === 'blockquote');
  check('class 正确', callout?.data?.hProperties?.className?.join(' ') === 'callout callout-tip');
  check('标题取自行内标题', callout?.children?.[0]?.children?.[0]?.value === '关于比例');
  check('正文保留行内格式', JSON.stringify(callout?.children?.slice(1)).includes('strong'));
  check('闭合标记已剥离', !JSON.stringify(callout).includes(':::'));
}

/* --- 2. 只有类型、没有标题 ------------------------------------------------- */
{
  const out = run([p(t(':::note\n正文\n:::'))]);
  check('缺省标题回退', out[0]?.children?.[0]?.children?.[0]?.value === '说明');
}

/* --- 3. 松散写法（多段落） ------------------------------------------------- */
{
  const out = run([
    p(t(':::warning 注意')),
    p(t('第一段')),
    p(t('第二段')),
    p(t(':::')),
  ]);
  check('松散写法被识别', out[0]?.type === 'blockquote');
  check('松散写法收进了两段', out[0]?.children?.length === 3);
  check('松散写法只产出一个节点', out.length === 1);
}

/* --- 4. 未知类型原样保留 --------------------------------------------------- */
{
  const out = run([p(t(':::unknown\n内容\n:::'))]);
  check('未知类型不改写', out.length === 1 && out[0].type === 'paragraph');
}

/* --- 5. 没有闭合标记 ------------------------------------------------------- */
{
  const out = run([p(t(':::note 标题')), p(t('没有闭合'))]);
  check('未闭合时不吞内容', out.length === 2 && out[0].type === 'paragraph');
}

/* --- 6. 普通引用块不受影响 ------------------------------------------------- */
{
  const out = run([{ type: 'blockquote', children: [p(t('一句引用'))] }]);
  check('普通 blockquote 不受影响', out[0].type === 'blockquote' && !out[0].data);
}

/* --- 7. 三种颜色轮转 ------------------------------------------------------- */
{
  const out = run([
    p(t(':::note\nA\n:::')),
    p(t(':::tip\nB\n:::')),
    p(t(':::warning\nC\n:::')),
  ]);
  const classes = out.map((n) => n.data.hProperties.className[1]).join(',');
  check('三类提示块映射到三种配色', classes === 'callout-note,callout-tip,callout-warning', classes);
}

/* --- 8. CRLF 换行（迁移过来的 Windows 文件全是这种） ---------------------- */
{
  const out = run([
    p(t(':::warning\r\n一定要妥善保管你的双重验证密钥！\r\n:::')),
  ]);
  check('单个 text 节点的 CRLF 也能识别', out[0]?.type === 'blockquote');
  check('CRLF 版标题正确', out[0]?.data?.hProperties?.className?.join(' ') === 'callout callout-warning');
  check('CRLF 版正文保留', JSON.stringify(out[0]).includes('双重验证密钥'));
  check('CRLF 版无残留标记', !JSON.stringify(out[0]).includes(':::'));
}

{
  const out = run([
    p(t(':::important\r\n请按照下方的步骤填写变量\r\n:::')),
    p(t('普通段落')),
  ]);
  check('CRLF + 后续段落互不干扰', out[0]?.type === 'blockquote' && out[1]?.type === 'paragraph');
}

console.log(failures === 0 ? '\n全部通过 ✓\n' : `\n${failures} 项未通过\n`);
process.exit(failures === 0 ? 0 : 1);
