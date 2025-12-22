import React, { useState, useRef, useEffect } from 'react';

interface VerticalSplitPaneProps {
    children: [React.ReactNode, React.ReactNode]; // Top (Console) and Bottom (Result)
    initialTopHeight?: number; // percentage
}

export const VerticalSplitPane: React.FC<VerticalSplitPaneProps> = ({ children, initialTopHeight = 40 }) => {
    const [topHeight, setTopHeight] = useState(initialTopHeight);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        isDragging.current = true;
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove);
        document.addEventListener('touchend', handleEnd);
        document.body.style.userSelect = 'none';
        e.preventDefault(); // Prevent text selection
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging.current || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const relativeY = clientY - containerRect.top;

        let newHeightPercentage = (relativeY / containerRect.height) * 100;

        // Constraints (min 10% for each)
        newHeightPercentage = Math.max(10, Math.min(90, newHeightPercentage));

        setTopHeight(newHeightPercentage);
    };

    const handleEnd = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
        document.body.style.userSelect = '';
    };

    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
        };
    }, []);

    return (
        <div ref={containerRef} className="flex flex-col h-full w-full overflow-hidden">
            {/* Top Pane */}
            <div style={{ height: `${topHeight}%` }} className="overflow-hidden flex flex-col min-h-0">
                {children[0]}
            </div>

            {/* Resizer Handle */}
            <div
                className="h-2 w-full bg-slate-800 hover:bg-blue-500 active:bg-blue-500 cursor-row-resize flex items-center justify-center transition-colors flex-shrink-0 z-10 touch-none border-y border-slate-700 hover:border-blue-400"
                onMouseDown={handleStart}
                onTouchStart={handleStart}
            >
                <div className="h-1 w-12 bg-slate-600 rounded-full pointer-events-none" />
            </div>

            {/* Bottom Pane */}
            <div style={{ height: `${100 - topHeight}%` }} className="overflow-hidden flex flex-col min-h-0">
                {children[1]}
            </div>
        </div>
    );
};
