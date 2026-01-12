import React, { useEffect, useState, useRef } from 'react';
import { ViewMode } from '../types';
import {
    FileCode2,
    BookOpen,
    Edit3,
    Merge,
    Variable,
    FileJson,
    ArrowRight,
    Braces,
    ScanSearch,
    GripVertical,
    Code,
    Copy,
    Terminal,
    Database,
    Image as ImageIcon
} from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DashboardProps {
    setView: (view: ViewMode) => void;
}

interface Tool {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    color: string;
}

interface SortableTileProps {
    tool: Tool;
    onTileClick: (id: string, rect: DOMRect) => void;
    shouldAnimate: boolean;
    index: number;
    forceDragging?: boolean;
    isHidden?: boolean;
}

// Separate component for the sortable item
const SortableTile: React.FC<SortableTileProps> = ({ tool, onTileClick, shouldAnimate, index, forceDragging, isHidden }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: tool.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging || isHidden ? 0 : 1, // Hide if dragging or if it's the expanding tile
    };

    const Icon = tool.icon;

    // Determine dragging state for visual feedback
    const activeDragging = forceDragging || isDragging;

    return (
        <button
            ref={setNodeRef}
            style={{ ...style, ...(shouldAnimate ? { animationDelay: `${index * 0.05}s` } : {}) }}
            {...attributes}
            {...listeners}
            onClick={(e) => {
                if (!activeDragging) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onTileClick(tool.id, rect);
                }
            }}
            className={`
                group relative flex flex-col p-5 h-full
                rounded-3xl
                bg-slate-800/40 border border-slate-700/50
                hover:bg-slate-800/80 hover:border-slate-600/50
                transition-all duration-300
                text-left
                hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50
                backdrop-blur-sm
                overflow-hidden
                ${shouldAnimate ? 'animate-slide-up-fade' : ''}
                ${activeDragging ? 'shadow-2xl ring-2 ring-indigo-500 scale-105 bg-slate-800 z-50' : ''}
            `}
        >
            {/* Ambient Background Gradient on Hover */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${tool.color}`} />

            <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div className={`
                        w-14 h-14 rounded-2xl
                        bg-gradient-to-br ${tool.color}
                        flex items-center justify-center
                        shadow-lg shadow-black/20
                        group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 ease-out
                    `}>
                        <Icon className="text-white drop-shadow-md" size={28} />
                    </div>

                    <div className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <GripVertical size={20} />
                    </div>
                </div>

                <h3 className="text-lg font-bold text-slate-100 mb-2 group-hover:text-white transition-colors">
                    {tool.title}
                </h3>

                <p className="text-sm text-slate-400 leading-relaxed line-clamp-2 mb-4 group-hover:text-slate-300 transition-colors">
                    {tool.description}
                </p>

                <div className="mt-auto flex items-center text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-indigo-400 transition-colors">
                    <span className="mr-2">Open Tool</span>
                    <div className="bg-slate-700/50 p-1 rounded-full group-hover:bg-indigo-500/20 transition-colors">
                        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                </div>
            </div>
        </button>
    );
}

// Component for the drag overlay - needs to look exactly like the tile but without sortable logic
function DragOverlayTile({ tool }: { tool: Tool }) {
    const Icon = tool.icon;
    return (
        <div className={`
            group relative flex flex-col p-5 h-full
            rounded-3xl
            bg-slate-800 border border-indigo-500/50
            shadow-2xl shadow-indigo-500/20
            scale-105 cursor-grabbing
            text-left
            overflow-hidden
        `}>
            <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${tool.color}`} />

            <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div className={`
                        w-14 h-14 rounded-2xl
                        bg-gradient-to-br ${tool.color}
                        flex items-center justify-center
                        shadow-lg shadow-black/20
                        scale-110 rotate-3
                    `}>
                        <Icon className="text-white drop-shadow-md" size={28} />
                    </div>

                    <div className="text-slate-500">
                        <GripVertical size={20} />
                    </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">
                    {tool.title}
                </h3>

                <p className="text-sm text-slate-300 leading-relaxed line-clamp-2 mb-4">
                    {tool.description}
                </p>

                <div className="mt-auto flex items-center text-xs font-bold uppercase tracking-wider text-indigo-400">
                    <span className="mr-2">Open Tool</span>
                    <div className="bg-indigo-500/20 p-1 rounded-full">
                        <ArrowRight size={12} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Component for the expanding animation
function ExpandingTileOverlay({ tool, initialRect }: { tool: Tool; initialRect: DOMRect }) {
    const Icon = tool.icon;
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        // Trigger expansion next frame
        requestAnimationFrame(() => {
            setIsExpanded(true);
        });
    }, []);

    const style: React.CSSProperties = isExpanded
        ? {
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            borderRadius: 0,
            opacity: 1, // Keep content visible for smooth transition
            position: 'fixed',
            zIndex: 9999,
        }
        : {
            top: initialRect.top,
            left: initialRect.left,
            width: initialRect.width,
            height: initialRect.height,
            borderRadius: '1.5rem', // Matching rounded-3xl (24px)
            position: 'fixed',
            zIndex: 9999,
        };

    return (
        <div
            className={`fixed bg-slate-900 border transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${isExpanded ? 'border-transparent' : 'border-slate-700/50'}`}
            style={style}
        >
            {/* Background gradient that expands to fill screen */}
            <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} transition-opacity duration-500 ${isExpanded ? 'opacity-100' : 'opacity-10'}`}>
                <div className={`absolute inset-0 bg-slate-900 ${isExpanded ? 'opacity-95' : 'opacity-0'} transition-opacity duration-500`} />
            </div>

            <div className={`relative w-full h-full p-5 flex flex-col transition-all duration-300 ${isExpanded ? 'opacity-0 scale-95' : 'opacity-100'}`}>
                <div className="flex justify-between items-start mb-4">
                    <div className={`
                        w-14 h-14 rounded-2xl
                        bg-gradient-to-br ${tool.color}
                        flex items-center justify-center
                        shadow-lg shadow-black/20
                    `}>
                        <Icon className="text-white drop-shadow-md" size={28} />
                    </div>
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">
                    {tool.title}
                </h3>
            </div>
        </div>
    );
}

const initialTools: Tool[] = [
    {
        id: 'combine',
        title: 'Combine Strings',
        description: 'Merge multiple .strings files into a single file',
        icon: FileCode2,
        color: 'from-blue-500 to-cyan-500',
    },
    {
        id: 'extract',
        title: 'Extract Catalog',
        description: 'Extract strings from .xcstrings catalog files',
        icon: BookOpen,
        color: 'from-purple-500 to-indigo-500',
    },
    {
        id: 'properties',
        title: 'Properties Converter',
        description: 'Convert .properties files to .strings format',
        icon: FileJson,
        color: 'from-emerald-500 to-green-500',
    },
    {
        id: 'editor',
        title: 'File Editor',
        description: 'Edit and manage your localization files',
        icon: Edit3,
        color: 'from-orange-500 to-amber-500',
    },
    {
        id: 'renamer',
        title: 'Key Renamer',
        description: 'Batch rename keys across multiple files',
        icon: Variable,
        color: 'from-pink-500 to-rose-500',
    },
    {
        id: 'json-converter',
        title: 'JSON Converter',
        description: 'Convert between key-value JSON and .strings files.',
        icon: FileJson,
        color: 'from-yellow-400 to-amber-500',
    },
    {
        id: 'merge',
        title: 'Merge Strings',
        description: 'Smart merge with conflict resolution',
        icon: Merge,
        color: 'from-indigo-500 to-violet-600',
    },
    {
        id: 'analyser',
        title: 'Strings Analyser',
        description: 'Deep analysis for .xcstrings and .xml files',
        icon: ScanSearch,
        color: 'from-violet-600 to-indigo-600',
    },
    {
        id: 'xml-converter',
        title: 'XML Converter',
        description: 'Convert .strings, .stringsdict, .xcstrings to Android XML',
        icon: FileCode2,
        color: 'from-teal-400 to-emerald-500',
    },
    {
        id: 'json-formatter',
        title: 'JSON Beautifier',
        description: 'Format, validate, and convert JSON data',
        icon: Braces,
        color: 'from-yellow-500 to-orange-500',
    },
    {
        id: 'json-to-swift',
        title: 'JSON to Swift',
        description: 'Convert JSON to Swift Codable structs',
        icon: Code,
        color: 'from-orange-500 to-red-500',
    },
    {
        id: 'duplicate-finder',
        title: 'Duplicate Value Finder',
        description: 'Find duplicate values across files',
        icon: Copy,
        color: 'from-teal-500 to-cyan-600',
    },
    {
        id: 'script-runner',
        title: 'Script Runner',
        description: 'Run JS scripts on text/files',
        icon: Terminal,
        color: 'from-rose-500 to-red-600',
    },
    {
        id: 'mock-data',
        title: 'Mock Data Generator',
        description: 'Generate realistic mock data (JSON/CSV)',
        icon: Database,
        color: 'from-green-500 to-emerald-600',
    },
    {
        id: 'app-icon-generator',
        title: 'App Icon Generator',
        description: 'Generate standard iOS App Icons & Contents.json',
        icon: ImageIcon,
        color: 'from-blue-600 to-indigo-600',
    },
];

export function Dashboard({ setView }: DashboardProps) {
    const [shouldAnimate, setShouldAnimate] = useState(() => {
        return !sessionStorage.getItem('dashboard_visited');
    });

    const [activeId, setActiveId] = useState<string | null>(null);

    // Animation state
    const [expandingId, setExpandingId] = useState<string | null>(null);
    const [expansionRect, setExpansionRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (shouldAnimate) {
            // Mark as visited immediately to ensure we don't animate again if user navigates away quickly
            sessionStorage.setItem('dashboard_visited', 'true');

            // Wait for all staggered animations to complete (10 items * 0.1s + ~0.5s duration + buffer)
            const timer = setTimeout(() => {
                setShouldAnimate(false);
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [shouldAnimate]);

    const [tools, setTools] = useState<Tool[]>(() => {
        const savedOrder = localStorage.getItem('dashboard_tile_order');
        if (savedOrder) {
            try {
                const order: string[] = JSON.parse(savedOrder);
                // Create a map for quick lookup
                const toolMap = new Map(initialTools.map(t => [t.id, t]));

                // Reconstruct the array based on saved order, filtering out any unknown IDs (e.g. if tools were removed)
                const orderedTools = order
                    .filter(id => toolMap.has(id))
                    .map(id => toolMap.get(id)!);

                // Add any new tools that weren't in the saved order
                const savedSet = new Set(order);
                const newTools = initialTools.filter(t => !savedSet.has(t.id));

                return [...orderedTools, ...newTools];
            } catch (e) {
                console.error("Failed to parse saved dashboard order", e);
                return initialTools;
            }
        }
        return initialTools;
    });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require movement of 8px before drag starts to prevent accidental drags on click
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string);
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setTools((items) => {
                const oldIndex = items.findIndex((t) => t.id === active.id);
                const newIndex = items.findIndex((t) => t.id === over.id);

                const newItems = arrayMove(items, oldIndex, newIndex) as Tool[];

                // Persist new order
                localStorage.setItem('dashboard_tile_order', JSON.stringify(newItems.map(t => t.id)));

                return newItems;
            });
        }
        setActiveId(null);
    }

    const handleTileClick = (id: string, rect: DOMRect) => {
        setExpansionRect(rect);
        setExpandingId(id);

        // Wait for expansion animation to cover the screen before switching view
        // Animation duration set to 500ms in ExpandingTileOverlay
        setTimeout(() => {
            setView(id as ViewMode);
        }, 500);
    };

    return (
        <div className={`w-full min-h-screen p-4 md:p-8 flex flex-col items-center justify-center bg-slate-900 text-slate-100 font-sans transition-opacity duration-500 ${expandingId ? 'opacity-0' : ''}`}>
            <header className="text-center mb-16">
                <h1 className="text-5xl sm:text-7xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight mb-6 drop-shadow-2xl">
                    Development Tools
                </h1>
                <p className="text-xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
                    Professional localization and development utilities.
                </p>
            </header>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="w-full max-w-7xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-4">
                    <SortableContext
                        items={tools.map(t => t.id)}
                        strategy={rectSortingStrategy}
                    >
                        {tools.map((tool, index) => (
                            <SortableTile
                                key={tool.id}
                                tool={tool}
                                onTileClick={handleTileClick}
                                setView={setView} // Kept for compatibility but unused in SortableTile now
                                shouldAnimate={shouldAnimate}
                                index={index}
                                isHidden={expandingId === tool.id}
                            />
                        ))}
                    </SortableContext>
                </div>
                <DragOverlay>
                    {activeId ? (
                        <DragOverlayTile tool={tools.find(t => t.id === activeId)!} />
                    ) : null}
                </DragOverlay>
            </DndContext>

            {expandingId && expansionRect && (
                <ExpandingTileOverlay
                    tool={tools.find(t => t.id === expandingId)!}
                    initialRect={expansionRect}
                />
            )}
        </div>
    );
}

// Helper for type compatibility if needed, though handleTileClick replaces direct setView

