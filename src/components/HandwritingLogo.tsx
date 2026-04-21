import { motion, type Variants } from 'framer-motion';

interface HandwritingLogoProps {
  gradient: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export default function HandwritingLogo({ gradient, size = 'md', animated = true }: HandwritingLogoProps) {
  const sizes = {
    sm: 'text-xl',
    md: 'text-5xl',
    lg: 'text-6xl'
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.15
      }
    }
  };

  const letterVariants: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.8 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        damping: 10,
        stiffness: 150
      }
    }
  };

  const letters = "MemoKard".split("");

  const textStyle: React.CSSProperties = { 
    fontFamily: "'Caveat', cursive",
    overflow: 'visible',
    lineHeight: 1.2,
  };

  if (!animated) {
    return (
      <div
        className={`${sizes[size]} font-bold tracking-tight bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
        style={textStyle}
      >
        MemoKard&nbsp;
      </div>
    );
  }

  return (
    <motion.div
      className={`${sizes[size]} font-bold tracking-tight bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
      style={textStyle}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {letters.map((letter, i) => (
        <motion.span
          key={i}
          variants={letterVariants}
          className="inline-block"
          style={{ overflow: 'visible' }}
        >
          {letter}
        </motion.span>
      ))}
      <motion.span variants={letterVariants} className="inline-block" style={{ overflow: 'visible' }}>
        &nbsp;
      </motion.span>
    </motion.div>
  );
}
