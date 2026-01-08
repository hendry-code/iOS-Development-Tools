import React, { useState, useRef, useEffect } from 'react';

interface TwoPaneLayoutProps {
    children: [React.ReactNode, React.ReactNode]; // Exactly 2 children
    initialLeftWidth?: number; // percentage, default 33
    minLeftWidth?: number; // percentage, default 20
    maxLeftWidth?: number; // percentage, default 80
}

export const TwoPaneLayout: React.FC<TwoPaneLayoutProps> = ({
    children,
    initialLeftWidth = 33,
    minLeftWidth = 15,
    maxLeftWidth = 85
}) => {
    const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
    const [isVertical, setIsVertical] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    // Detect mobile/vertical layout
    useEffect(() => {
        const checkLayout = () => {
            // Mobile breakpoint (md: 768px in Tailwind)
            setIsVertical(window.innerWidth < 1024); // Switch to vertical on lg instead of md for this specific view? 
            // The original View uses lg:grid-cols-12. So below lg it's stacked.
            // Let's match lg breakpoint (1024px) for consistency.
        };

        checkLayout();
        window.addEventListener('resize', checkLayout);
        return () => window.removeEventListener('resize', checkLayout);
    }, []);

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        isDragging.current = true;
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove);
        document.addEventListener('touchend', handleEnd);
        document.body.style.userSelect = 'none';
        document.body.style.cursor = isVertical ? 'row-resize' : 'col-resize';
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging.current || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();

        let clientPos, containerSize, offset;

        if (isVertical) {
            clientPos = 'touches' in e ? e.touches[0].clientY : e.clientY;
            containerSize = containerRect.height;
            offset = clientPos - containerRect.top;
        } else {
            clientPos = 'touches' in e ? e.touches[0].clientX : e.clientX;
            containerSize = containerRect.width;
            offset = clientPos - containerRect.left;
        }

        const percentage = (offset / containerSize) * 100;
        const clamped = Math.min(Math.max(percentage, minLeftWidth), maxLeftWidth);

        setLeftWidth(clamped);
    };

    const handleEnd = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
    };

    // Clean up
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
        }
    }, []);

    if (isVertical) {
        // Stacked layout (for mobile/tablet) - simpler, maybe no resize or resize height?
        // For simplicity on mobile, usually we just stack them with auto height.
        // But the user might want to resize vertically. Let's support it.
        return (
            <div ref={containerRef} className="flex flex-col h-full w-full overflow-hidden">
                <div style={{ flexBasis: `${leftWidth}%` }} className="flex flex-col min-h-0 overflow-hidden">
                    {children[0]}
                </div>

                {/* Horizontal Resizer */}
                <div
                    className="h-3 w-full bg-slate-800 hover:bg-slate-700 active:bg-blue-500 cursor-row-resize flex items-center justify-center flex-shrink-0 z-10 transition-colors"
                    onTouchStart={handleStart}
                    onMouseDown={handleStart}
                >
                    <div className="w-12 h-1 bg-slate-600 rounded-full" />
                </div>

                <div style={{ flexBasis: `${100 - leftWidth}%` }} className="flex flex-col min-h-0 overflow-hidden">
                    {children[1]}
                </div>
            </div>
        )
    }

    return (
        <div ref={containerRef} className="flex flex-row h-full w-full overflow-hidden">
            <div style={{ flexBasis: `${leftWidth}%` }} className="flex flex-col min-w-0 overflow-hidden">
                {children[0]}
            </div>

            {/* Vertical Resizer */}
            <div
                className="w-3 h-full -ml-1.5 z-10 hover:w-4 hover:-ml-2 bg-transparent hover:bg-blue-500/10 cursor-col-resize flex items-center justify-center flex-shrink-0 group transition-all"
                onMouseDown={handleStart}
            >
                <div className="w-1 h-8 bg-slate-700 group-hover:bg-blue-500 rounded-full transition-colors" />
            </div>

            <div style={{ flexBasis: `${100 - leftWidth}%` }} className="flex flex-col min-w-0 overflow-hidden">
                {children[1]}
            </div>
        </div>
    );
};
