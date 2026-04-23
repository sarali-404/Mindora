/**
 * Safe JSON parser that handles literal newlines/tabs inside JSON string values.
 * AI responses often contain unescaped control characters that break JSON.parse.
 */
export function safeJSONParse(str) {
  if (typeof str !== 'string') return str;

  // First try standard parse
  try {
    return JSON.parse(str);
  } catch (e) {
    // Fall through to fix
  }

  // Escape literal control characters inside JSON string values
  try {
    let fixed = '';
    let inString = false;
    let escaped = false;

    for (let i = 0; i < str.length; i++) {
      const ch = str[i];

      if (escaped) {
        fixed += ch;
        escaped = false;
        continue;
      }

      if (ch === '\\') {
        fixed += ch;
        escaped = true;
        continue;
      }

      if (ch === '"') {
        inString = !inString;
        fixed += ch;
        continue;
      }

      if (inString) {
        if (ch === '\n') { fixed += '\\n'; continue; }
        if (ch === '\r') { fixed += '\\r'; continue; }
        if (ch === '\t') { fixed += '\\t'; continue; }
      }

      fixed += ch;
    }

    return JSON.parse(fixed);
  } catch (e) {
    return null;
  }
}

/**
 * Extract usable text content from a note/summary item.
 * Handles every storage format:
 *  - Proper object { title, content, keyPoints, sections }
 *  - JSON string of the object
 *  - Broken JSON string with literal newlines
 *  - textContent.content containing the full JSON (old bug)
 *  - Plain markdown string
 */
export function extractTextContent(item, fallbackTitle = '') {
  const empty = { title: fallbackTitle, content: '', keyPoints: [], sections: [], quickReview: '' };
  if (!item) return empty;

  let tc = item.textContent;

  // ──────────── Handle textContent as a string ────────────
  if (typeof tc === 'string') {
    const trimmed = tc.trim();

    // Looks like JSON?
    if (trimmed.startsWith('{')) {
      const parsed = safeJSONParse(trimmed);
      if (parsed && typeof parsed === 'object') {
        tc = parsed; // continue below as object
      } else {
        // Couldn't parse at all → treat string as raw markdown
        return { ...empty, title: fallbackTitle, content: tc };
      }
    } else {
      // Plain text / markdown string
      return { ...empty, title: fallbackTitle, content: tc };
    }
  }

  if (!tc || typeof tc !== 'object') return empty;

  // ──────────── Handle content field containing JSON (possibly multi-level) ────────────
  // The AI occasionally double-encodes: content = '{ "title": ..., "content": "..." }'
  // Loop until content is a plain string, up to 4 levels deep.
  if (tc.content && typeof tc.content === 'string') {
    let current = tc;
    for (let depth = 0; depth < 4; depth++) {
      const trimmed = (current.content || '').trim();
      if (!trimmed.startsWith('{')) break;
      const inner = safeJSONParse(trimmed);
      if (!inner || typeof inner !== 'object' || !inner.content) break;
      current = {
        title: inner.title || current.title || fallbackTitle,
        content: inner.content,
        keyPoints: (inner.keyPoints && inner.keyPoints.length) ? inner.keyPoints : (current.keyPoints || []),
        sections: (inner.sections && inner.sections.length) ? inner.sections : (current.sections || []),
        quickReview: inner.quickReview || current.quickReview || ''
      };
    }
    if (current !== tc) {
      return {
        title: current.title || fallbackTitle,
        content: current.content,
        keyPoints: Array.isArray(current.keyPoints) ? current.keyPoints : [],
        sections: Array.isArray(current.sections) ? current.sections : [],
        quickReview: current.quickReview || ''
      };
    }
  }

  // ──────────── Normal object ────────────
  return {
    title: tc.title || fallbackTitle,
    content: typeof tc.content === 'string' ? tc.content : '',
    keyPoints: Array.isArray(tc.keyPoints) ? tc.keyPoints : [],
    sections: Array.isArray(tc.sections) ? tc.sections : [],
    quickReview: tc.quickReview || ''
  };
}
