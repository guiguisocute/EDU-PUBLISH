const escapeHtml = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const escapeRegExp = (input: string): string => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightHtmlText = (html: string, query: string): string => {
  const keyword = query.trim();
  if (!keyword) return html;

  const matcher = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
  return html
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (part.startsWith('<') && part.endsWith('>')) return part;
      return part.replace(matcher, '<mark class="rounded-sm bg-amber-200/80 text-foreground px-0.5">$1</mark>');
    })
    .join('');
};

export const renderSimpleMarkdown = (input: string, highlightQuery = ''): string => {
  const safe = escapeHtml(input || '');

  const html = safe
    .replace(/&lt;br\s*\/?&gt;/gi, '<br/>')
    .replace(/&lt;\/br&gt;/gi, '<br/>')
    .replace(/\\n/g, '<br/>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\n/g, '<br/>');

  return highlightHtmlText(html, highlightQuery);
};

export const renderHighlightedText = (input: string, highlightQuery = ''): string => {
  return highlightHtmlText(escapeHtml(input || ''), highlightQuery);
};
