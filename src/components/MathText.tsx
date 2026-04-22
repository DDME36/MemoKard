import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

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
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
