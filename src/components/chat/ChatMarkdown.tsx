import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";

/**
 * Renders assistant chat text as real markdown instead of raw text, so
 * **bold**, lists, and links the model writes actually render instead of
 * showing literal asterisks/dashes in the bubble. Only ever applied to
 * assistant messages — user messages stay plain text, since a user's own
 * input shouldn't be reinterpreted as markup.
 *
 * Every element is restyled to fit inside a compact chat bubble (tight
 * spacing, text-sm) rather than the default browser/typography-plugin
 * spacing, which would look oversized here.
 */
const components: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-0.5 pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-0.5 pl-4 last:mb-0">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2 hover:no-underline"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-black/[0.06] px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-lg bg-black/[0.06] p-2.5 font-mono text-[0.85em] last:mb-0">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-current/20 pl-2.5 opacity-90 last:mb-0">{children}</blockquote>
  ),
  h1: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
  h2: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
  h3: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
};

export function ChatMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown components={components} remarkPlugins={[remarkBreaks]}>
      {text}
    </ReactMarkdown>
  );
}
