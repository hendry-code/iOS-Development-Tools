import React, { useState, useRef, useEffect } from 'react';

interface ResizableLayoutProps {
    children: [React.ReactNode, React.ReactNode, React.ReactNode]; // Exactly 3 children
    initialSizes?: [number, number, number]; // percentages
}

export const ResizableLayout: React.FC<ResizableLayoutProps> = ({ children, initialSizes = [25, 45, 30] }) => {
    const [sizes, setSizes] = useState(initialSizes);
    const [isVertical, setIsVertical] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const draggingResizerIndex = useRef<number | null>(null);

    // Detect mobile/vertical layout
    useEffect(() => {
        const checkLayout = () => {
            setIsVertical(window.innerWidth < 768); // md breakpoint
        };

        checkLayout();
        window.addEventListener('resize', checkLayout);
        return () => window.removeEventListener('resize', checkLayout);
    }, []);

    // Resizer logic
    const handleStart = (index: number) => (e: React.MouseEvent | React.TouchEvent) => {
        draggingResizerIndex.current = index;
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove);
        document.addEventListener('touchend', handleEnd);
        // Prevent text selection while dragging
        document.body.style.userSelect = 'none';
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
        if (draggingResizerIndex.current === null || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();

        let clientPos, containerSize, offset;

        if (isVertical) {
            // Mobile/Vertical Logic
            clientPos = 'touches' in e ? e.touches[0].clientY : e.clientY;
            containerSize = containerRect.height;
            offset = clientPos - containerRect.top;
        } else {
            // Desktop/Horizontal Logic
            clientPos = 'touches' in e ? e.touches[0].clientX : e.clientX;
            containerSize = containerRect.width;
            offset = clientPos - containerRect.left;
        }

        // Calculate new percentage
        const percentage = (offset / containerSize) * 100;

        setSizes(prevSizes => {
            const newSizes = [...prevSizes];
            const idx = draggingResizerIndex.current!;

            // If dragging first handle (between panel 0 and 1)
            if (idx === 0) {
                const diff = percentage - newSizes[0];
                // Constraints (min size 10%)
                if (newSizes[0] + diff < 10) return prevSizes;
                if (newSizes[1] - diff < 10) return prevSizes;

                newSizes[0] += diff;
                newSizes[1] -= diff;
            }
            // If dragging second handle (between panel 1 and 2)
            else if (idx === 1) {
                const currentSplitPoint = newSizes[0] + newSizes[1];
                const diff = percentage - currentSplitPoint;

                if (newSizes[1] + diff < 10) return prevSizes;
                if (newSizes[2] - diff < 10) return prevSizes;

                newSizes[1] += diff;
                newSizes[2] -= diff;
            }

            return newSizes as [number, number, number];
        });
    };

    const handleEnd = () => {
        draggingResizerIndex.current = null;
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
        document.body.style.userSelect = '';
    };

    // Clean up event listeners on unmount
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
        };
    }, []);

    // Vertical Divider (Desktop)
    const VerticalHandle = ({ index }: { index: number }) => (
        <div
            className="hidden md:flex w-1.5 hover:w-2 -ml-0.5 hover:-ml-1 bg-slate-800 hover:bg-blue-500 cursor-col-resize items-center justify-center transition-all z-20 flex-shrink-0"
            onMouseDown={handleStart(index)}
        >
            <div className="w-0.5 h-8 bg-slate-600 rounded-full pointer-events-none" />
        </div>
    );

    // Horizontal Divider (Mobile)
    const HorizontalHandle = ({ index }: { index: number }) => (
        <div
            className="flex md:hidden h-2 w-full bg-slate-800 active:bg-blue-500 cursor-row-resize items-center justify-center transition-colors z-20 flex-shrink-0 touch-none"
            onTouchStart={handleStart(index)}
            onMouseDown={handleStart(index)}
        >
            <div className="h-1 w-12 bg-slate-600 rounded-full pointer-events-none" />
        </div>
    );

    return (
        <div ref={containerRef} className="flex flex-col md:flex-row h-full w-full overflow-hidden">
            {/* Panel 1 */}
            <div
                className="flex flex-col min-w-0 min-h-0 overflow-hidden"
                style={{
                    flexBasis: `${sizes[0]}%`,
                    // On mobile, flex-basis works on height if flex-direction is col
                    // On desktop, flex-basis works on width if flex-direction is row
                }}
            >
                {children[0]}
            </div>

            <VerticalHandle index={0} />
            <HorizontalHandle index={0} />

            {/* Panel 2 */}
            <div
                className="flex flex-col min-w-0 min-h-0 overflow-hidden"
                style={{ flexBasis: `${sizes[1]}%` }}
            >
                {children[1]}
            </div>

            <VerticalHandle index={1} />
            <HorizontalHandle index={1} />

            {/* Panel 3 */}
            <div
                className="flex flex-col min-w-0 min-h-0 overflow-hidden"
                style={{ flexBasis: `${sizes[2]}%` }}
            >
                {children[2]}
            </div>
        </div>
    );
};
