/* ============================================================================
   remark-callouts.mjs
   ----------------------------------------------------------------------------
   把容器语法变成提示块：

     :::note 可选标题
     正文……
     :::

   支持 note / tip / important / warning / caution，分别落到琥珀、正橙、
   正橙三种配色上——正好让橙色系在正文里均匀出现。

   实现要点：不引入任何新依赖，也不注册新的 hast handler。做法是把容器整体
   转成一个 mdast 的 blockquote 节点，再用 `data.hProperties` 挂上 class。
   mdast-util-to-hast 原生支持 hProperties，因此不需要额外配置。

   两种写法都要支持：

   1) 紧凑写法（标记与正文之间没有空行，整块是一个 paragraph）
      :::tip 标题
      正文
      :::

   2) 松散写法（前后留空行，块被拆成多个 paragraph）
      :::tip 标题

      正文

      :::
   ========================================================================== */

/** 匹配独占一行的起始标记 */
const MARKER = /^:::[ \t]*([a-zA-Z]+)[ \t]*(.*)$/;
/** 匹配独占一行的结束标记 */
const CLOSE = /^:::[ \t]*$/;

/**
 * 把正文里所有 CRLF 统一成 LF。
 *
 * 必须做这一步：JS 正则里的 `.` 不匹配 `\r`，而 `$`（不带 m 标志）只匹配
 * 字符串末尾。于是 ":::warning\r" 这种行尾带 CR 的标记行，
 * `(.*)$` 既吃不下 `\r` 也匹配不到末尾，整条规则静默失效。
 * Windows 上检出的 Markdown 全是 CRLF，不归一化就会踩这个坑。
 */
function normalizeLineEndings(node) {
  if (Array.isArray(node.children)) {
    for (const child of node.children) normalizeLineEndings(child);
  } else if (typeof node.value === 'string' && node.value.includes('\r')) {
    node.value = node.value.replace(/\r\n?/g, '\n');
  }
}

const TYPES = new Set(['note', 'tip', 'important', 'warning', 'caution']);

const DEFAULT_TITLE = {
  note: '说明',
  tip: '技巧',
  important: '重要',
  warning: '注意',
  caution: '当心',
};

/** 段落是否为纯文本（只含 text / break），带行内格式的段落不走快速路径 */
function isPlainText(node) {
  return node.children.every((child) => child.type === 'text' || child.type === 'break');
}

/** 段落还原成带换行的纯文本 */
function plainText(node) {
  return node.children
    .map((child) => (child.type === 'break' ? '\n' : (child.value ?? '')))
    .join('');
}

/** 在第一个 text 子节点上切开第一行，返回 [首行, 剩余文本或 null] */
function cutFirstLine(node) {
  const first = node.children[0];
  if (first?.type !== 'text') return null;

  const nl = first.value.indexOf('\n');
  if (nl === -1) return [first.value, null];
  return [first.value.slice(0, nl), first.value.slice(nl + 1)];
}

/**
 * 尝试从一段「首行是标记」的段落里取出提示块内容。
 * 返回 { type, title, body, closed } 或 null。
 */
function parseInline(node) {
  const cut = cutFirstLine(node);
  if (!cut) return null;

  const [head, rest] = cut;
  const match = head.match(MARKER);
  if (!match) return null;

  const type = match[1].toLowerCase();
  if (!TYPES.has(type)) return null;

  // 标记行之后的内容（行内格式保留）
  const body = [];
  if (rest !== null && rest !== '') body.push({ type: 'text', value: rest });
  body.push(...node.children.slice(1));

  // 在尾部找独占一行的 `:::`
  let closed = false;
  const lastIndex = body.length - 1;
  if (lastIndex >= 0) {
    const last = body[lastIndex];
    if (last.type === 'text') {
      const nl = last.value.lastIndexOf('\n');
      if (nl !== -1 && CLOSE.test(last.value.slice(nl + 1).trim())) {
        const before = last.value.slice(0, nl);
        if (before === '') body.pop();
        else body[lastIndex] = { ...last, value: before };
        closed = true;
      } else if (lastIndex > 0 && CLOSE.test(last.value.trim())) {
        body.pop();
        closed = true;
      }
    }
  }

  return { type, title: match[2].trim(), body, closed };
}

/** 造一个提示块节点 */
function buildCallout(type, title, body) {
  return {
    type: 'blockquote',
    data: { hProperties: { className: ['callout', `callout-${type}`] } },
    children: [
      {
        type: 'paragraph',
        data: { hProperties: { className: ['callout-title'] } },
        children: [{ type: 'text', value: title || DEFAULT_TITLE[type] }],
      },
      ...body,
    ],
  };
}

function transform(parent) {
  if (!Array.isArray(parent.children)) return;

  const children = parent.children;
  const output = [];

  for (let i = 0; i < children.length; i += 1) {
    const node = children[i];

    if (node.type === 'paragraph') {
      // 注意：不能要求整段是纯文本 —— 提示块正文里的 **加粗** 会带来 strong 节点。
      // 只要「首行是标记」且「末行是 :::」，中间什么行内格式都可以。
      const parsed = parseInline(node);

      if (parsed) {
        if (parsed.closed) {
          // 紧凑写法：整块就在这一段里
          const body = parsed.body;
          transform({ children: body });
          output.push(buildCallout(parsed.type, parsed.title, body));
          continue;
        }

        // 松散写法：向后找独占一行的 `:::`
        let depth = 0;
        let end = -1;

        for (let j = i + 1; j < children.length; j += 1) {
          const candidate = children[j];
          if (candidate.type !== 'paragraph' || !isPlainText(candidate)) continue;

          const text = plainText(candidate).trim();
          if (CLOSE.test(text)) {
            if (depth === 0) {
              end = j;
              break;
            }
            depth -= 1;
          } else if (parseInline(candidate)) {
            depth += 1;
          }
        }

        if (end > i) {
          const body = parsed.body.concat(children.slice(i + 1, end));
          transform({ children: body });
          output.push(buildCallout(parsed.type, parsed.title, body));
          i = end;
          continue;
        }
      }
    }

    transform(node);
    output.push(node);
  }

  parent.children = output;
}

export default function remarkCallouts() {
  return (tree) => {
    normalizeLineEndings(tree);
    transform(tree);
  };
}
