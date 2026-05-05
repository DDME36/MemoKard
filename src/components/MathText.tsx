import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
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
  // แปลงข้อความที่มี \n หรือ /n แบบติดมาเป็นตัวอักษร ให้กลายเป็นขึ้นบรรทัดใหม่จริงๆ
  const processedText = (children || '')
    .replace(/\\n/g, '\n') // เปลี่ยน \n เป็นขึ้นบรรทัดใหม่
    .replace(/\/n/g, '\n'); // เปลี่ยน /n เป็นขึ้นบรรทัดใหม่

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={components}
      >
        {processedText}
      </ReactMarkdown>
    </div>
  );
}
