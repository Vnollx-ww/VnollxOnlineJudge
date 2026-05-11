import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface CodeLine {
  html: ReactNode;
  indent: number;
  isComment?: boolean;
}

// Define codeLines outside the component to ensure stability
const codeLines: CodeLine[] = [
  { html: <><span className="text-purple-400">class</span> <span className="text-yellow-300">Solution</span> {'{'}</>, indent: 0 },
  { html: <><span className="text-purple-400">public</span> <span className="text-blue-300">int</span> <span className="text-green-300">solve</span>(<span className="text-blue-300">int</span>[] <span className="text-orange-300">nums</span>) {'{'}</>, indent: 1 },
  { html: <><span className="text-blue-300">int</span> <span className="text-orange-300">maxSoFar</span> = nums[0];</>, indent: 2 },
  { html: <><span className="text-blue-300">int</span> <span className="text-orange-300">maxEndingHere</span> = nums[0];</>, indent: 2 },
  { html: <><span className="text-gray-500">// Dynamic Programming</span></>, indent: 2, isComment: true },
  { html: <><span className="text-purple-400">for</span> (<span className="text-blue-300">int</span> i = 1; i &lt; nums.length; i++) {'{'}</>, indent: 2 },
  { html: <><span className="text-orange-300">maxEndingHere</span> = Math.max(nums[i],</>, indent: 3 },
  { html: <>    <span className="text-orange-300">maxEndingHere</span> + nums[i]);</>, indent: 4 },
  { html: <><span className="text-orange-300">maxSoFar</span> = Math.max(<span className="text-orange-300">maxSoFar</span>,</>, indent: 3 },
  { html: <>    <span className="text-orange-300">maxEndingHere</span>);</>, indent: 4 },
  { html: <> {'}'}</>, indent: 2 },
  { html: <><span className="text-purple-400">return</span> <span className="text-orange-300">maxSoFar</span>;</>, indent: 2 },
  { html: <> {'}'}</>, indent: 1 },
  { html: <> {'}'}</>, indent: 0 },
];

const CodeWindow: React.FC = () => {
  const [displayedLines, setDisplayedLines] = useState<CodeLine[]>([]);
  const currentIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);
    
    // Reset state
    setDisplayedLines([]);
    currentIndexRef.current = 0;

    const addLine = () => {
      const current = currentIndexRef.current;
      if (current < codeLines.length) {
        setDisplayedLines(prev => [...prev, codeLines[current]]);
        currentIndexRef.current = current + 1;
        
        const delay = Math.random() * 300 + 100;
        timerRef.current = setTimeout(addLine, delay);
      }
    };

    timerRef.current = setTimeout(addLine, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl bg-[#1e1e2e] border border-gray-700/50">
      {/* Window Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#181825] border-b border-gray-700/50">
        <div className="w-3 h-3 rounded-full bg-red-400/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
        <div className="w-3 h-3 rounded-full bg-green-400/80" />
        <span className="ml-3 text-xs text-gray-400 font-mono">Solution.java</span>
      </div>

      {/* Code Content */}
      <div className="p-4 font-mono text-sm leading-relaxed min-h-[280px]">
        {displayedLines.map((line, idx) => {
          if (!line) return null;
          return (
            <div 
              key={idx} 
              className="flex animate-fade-in"
              style={{ paddingLeft: `${(line.indent || 0) * 16}px` }}
            >
              <span className="w-8 text-right mr-4 text-gray-600 select-none">
                {idx + 1}
              </span>
              <span className={line.isComment ? 'text-gray-500 italic' : 'text-gray-200'}>
                {line.html}
              </span>
            </div>
          );
        })}
        
        {/* Cursor */}
        <div 
          className="inline-block w-2 h-4 bg-acg-accent/80 animate-pulse ml-8"
          style={{ marginLeft: `${(displayedLines.length > 0 ? displayedLines[displayedLines.length - 1]?.indent || 0 : 0) * 16 + 32 + 8}px` }}
        />
      </div>
    </div>
  );
};

export default CodeWindow;

