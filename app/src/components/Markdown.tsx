import { type ReactNode } from 'react';

interface MarkdownProps {
  text: string;
  className?: string;
}

interface Block {
  type: 'paragraph' | 'list';
  content: string;
}

/**
 * A deliberately tiny Markdown renderer. We support what Claude actually uses
 * in Niklaus's voice: paragraphs (separated by blank lines), unordered lists
 * (`- ` or `* `), and inline **bold**, *italic*, and `code`. No headings, no
 * blockquotes, no links — extend if Claude ever starts using them.
 *
 * The output is real React elements (no innerHTML), so it's safe even if a
 * future change lets some user content leak into the chat.
 */
export default function Markdown({ text, className }: MarkdownProps) {
  const blocks = splitBlocks(text);
  return (
    <div className={className}>
      {blocks.map((b, i) => (
        <RenderedBlock key={i} block={b} index={i} />
      ))}
    </div>
  );
}

function splitBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let buffer: string[] = [];
  let inList = false;

  function flushBuffer() {
    if (buffer.length === 0) return;
    blocks.push({
      type: inList ? 'list' : 'paragraph',
      content: buffer.join('\n'),
    });
    buffer = [];
  }

  for (const raw of lines) {
    const isItem = /^\s*[-*]\s+/.test(raw);
    const isEmpty = raw.trim() === '';
    if (isEmpty) {
      flushBuffer();
      inList = false;
      continue;
    }
    if (isItem) {
      if (!inList) {
        flushBuffer();
        inList = true;
      }
      buffer.push(raw);
    } else {
      if (inList) {
        // Treat as list-item continuation
        buffer.push(raw);
      } else {
        buffer.push(raw);
      }
    }
  }
  flushBuffer();
  return blocks;
}

function RenderedBlock({ block, index }: { block: Block; index: number }) {
  if (block.type === 'list') {
    const items = block.content
      .split(/\n(?=\s*[-*]\s+)/)
      .map((s) => s.replace(/^\s*[-*]\s+/, '').trim())
      .filter(Boolean);
    return (
      <ul className={`${index > 0 ? 'mt-2' : ''} list-disc space-y-1 pl-5`}>
        {items.map((it, i) => (
          <li key={i}>{renderInline(it)}</li>
        ))}
      </ul>
    );
  }
  return (
    <p className={`${index > 0 ? 'mt-2' : ''} whitespace-pre-wrap`}>
      {renderInline(block.content)}
    </p>
  );
}

const INLINE_REGEX =
  /(\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|_([^_\n]+)_|`([^`\n]+)`)/g;

function renderInline(text: string): ReactNode {
  const tokens: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  // reset state across calls
  INLINE_REGEX.lastIndex = 0;
  while ((match = INLINE_REGEX.exec(text)) !== null) {
    if (match.index > cursor) {
      tokens.push(text.slice(cursor, match.index));
    }
    const [full, , bold, italicStar, italicUnder, code] = match;
    if (bold) {
      tokens.push(<strong key={key++}>{bold}</strong>);
    } else if (italicStar || italicUnder) {
      tokens.push(<em key={key++}>{italicStar || italicUnder}</em>);
    } else if (code) {
      tokens.push(
        <code
          key={key++}
          className="rounded bg-paper-deep px-1 text-[0.92em]"
        >
          {code}
        </code>
      );
    }
    cursor = match.index + full.length;
  }
  if (cursor < text.length) tokens.push(text.slice(cursor));
  return tokens;
}
