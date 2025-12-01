import { useState, useEffect, useRef } from 'react';
import './CodeWindow.css';

// Define codeLines outside the component to ensure stability
const codeLines = [
  { html: <><span className="token-keyword">class</span> <span className="token-type">Solution</span> {'{'}</>, indent: 0 },
  { html: <><span className="token-keyword">public</span> <span className="token-type">int</span> <span className="token-method">solve</span>(<span className="token-type">int</span>[] <span className="token-variable">nums</span>) {'{'}</>, indent: 1 },
  { html: <><span className="token-type">int</span> <span className="token-variable">maxSoFar</span> = nums[0];</>, indent: 2 },
  { html: <><span className="token-type">int</span> <span className="token-variable">maxEndingHere</span> = nums[0];</>, indent: 2 },
  { html: <><span className="token-comment">// Dynamic Programming</span></>, indent: 2, isComment: true },
  { html: <><span className="token-keyword">for</span> (<span className="token-type">int</span> i = 1; i &lt; nums.length; i++) {'{'}</>, indent: 2 },
  { html: <><span className="token-variable">maxEndingHere</span> = Math.max(nums[i],</>, indent: 3 },
  { html: <>    <span className="token-variable">maxEndingHere</span> + nums[i]);</>, indent: 4 },
  { html: <><span className="token-variable">maxSoFar</span> = Math.max(<span className="token-variable">maxSoFar</span>,</>, indent: 3 },
  { html: <>    <span className="token-variable">maxEndingHere</span>);</>, indent: 4 },
  { html: <> {'}'}</>, indent: 2 },
  { html: <><span className="token-keyword">return</span> <span className="token-variable">maxSoFar</span>;</>, indent: 2 },
  { html: <> {'}'}</>, indent: 1 },
  { html: <> {'}'}</>, indent: 0 },
];

const CodeWindow = () => {
  const [displayedLines, setDisplayedLines] = useState([]);
  const currentIndexRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);
    
    // Reset state
    setDisplayedLines([]);
    currentIndexRef.current = 0;

    const addLine = () => {
      const current = currentIndexRef.current;
      if (current < codeLines.length) {
        // Append next line safely
        setDisplayedLines(prev => [...prev, codeLines[current]]);
        currentIndexRef.current = current + 1;
        
        // Schedule next line
        const delay = Math.random() * 300 + 100;
        timerRef.current = setTimeout(addLine, delay);
      }
    };

    // Start initial timer
    timerRef.current = setTimeout(addLine, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="code-window">
      <div className="window-header">
        <div className="window-dot red"></div>
        <div className="window-dot yellow"></div>
        <div className="window-dot green"></div>
        <span className="window-title">Solution.java</span>
      </div>
      <div className="window-content">
        {displayedLines.map((line, idx) => {
          if (!line) return null; // Defensive check
          return (
            <div key={idx} className="code-line" style={{ paddingLeft: `${(line.indent || 0) * 20}px` }}>
              <span className="line-number">{idx + 1}</span>
              <span className={line.isComment ? 'token-comment' : ''}>{line.html}</span>
            </div>
          );
        })}
        <div className="cursor"></div>
      </div>
    </div>
  );
};

export default CodeWindow;

