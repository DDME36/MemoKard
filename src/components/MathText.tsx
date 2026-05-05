import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark-dimmed.css';

interface MathTextProps {
  children: string;
  /** Custom react-markdown component overrides */
  components?: Record<string, React.ComponentType<any>>;
  /** Additional className for the wrapper */
  className?: string;
}

/**
 * Renders text with Markdown + KaTeX math support.
 * 
 * Syntax guide:
 * - Inline math: `$E = mc^2$`
 * - Block math:  `$$\frac{a}{b}$$`
 * - Markdown:    **bold**, *italic*, `code`, lists, etc.
 */
export default function MathText({ children, components, className }: MathTextProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
