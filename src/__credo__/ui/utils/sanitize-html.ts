const ALLOWED_TAGS = new Set([
  'DIV',
  'SPAN',
  'P',
  'B',
  'STRONG',
  'I',
  'EM',
  'U',
  'S',
  'SMALL',
  'SUB',
  'SUP',
  'BR',
]);

const DROP_WITH_CONTENT = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'TEMPLATE',
  'NOSCRIPT',
  'LINK',
  'META',
]);

const ALLOWED_ATTRS = new Set(['style', 'class']);

const CSS_DENY = /url\s*\(|expression\s*\(|@import|javascript:|<|\/\*|behavior\s*:|-moz-binding/i;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeElement(el: Element): void {
  for (const attr of [...el.attributes]) {
    const name = attr.name.toLowerCase();
    if (!ALLOWED_ATTRS.has(name)) {
      el.removeAttribute(attr.name);
      continue;
    }
    if (name === 'style' && CSS_DENY.test(attr.value)) {
      el.removeAttribute(attr.name);
    }
  }
}

function sanitizeNode(node: Node): void {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === 3 /* text */) continue;
    if (child.nodeType !== 1 /* element */) {
      child.remove();
      continue;
    }

    const el = child as Element;
    const tag = el.tagName.toUpperCase();

    if (DROP_WITH_CONTENT.has(tag)) {
      el.remove();
      continue;
    }

    if (!ALLOWED_TAGS.has(tag)) {
      sanitizeNode(el);
      el.replaceWith(...el.childNodes);
      continue;
    }

    sanitizeElement(el);
    sanitizeNode(el);
  }
}

export function sanitizeBrandHtml(html: string | undefined | null): string {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') return escapeHtml(html);

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  sanitizeNode(doc.body);
  return doc.body.innerHTML;
}

export function hasBrandHtml(html: string | undefined | null): boolean {
  return sanitizeBrandHtml(html).trim().length > 0;
}
