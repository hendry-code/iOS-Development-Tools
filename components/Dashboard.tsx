import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
    Image as ImageIcon,
    Sparkles,
    Layers,
    Languages,
    RefreshCw,
    Wrench,
    Palette,
    Binary
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
    glowColor: string;
    category: 'localization' | 'converters' | 'utilities';
}

interface Category {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    gradient: string;
    borderColor: string;
}

const categories: Category[] = [
    {
        id: 'localization',
        title: 'Localization',
        description: 'Tools for managing strings and translations',
        icon: Languages,
        gradient: 'from-violet-500/20 via-purple-500/10 to-fuchsia-500/5',
        borderColor: 'border-violet-500/20',
    },
    {
        id: 'converters',
        title: 'Converters',
        description: 'Transform between file formats',
        icon: RefreshCw,
        gradient: 'from-cyan-500/20 via-teal-500/10 to-emerald-500/5',
        borderColor: 'border-cyan-500/20',
    },
    {
        id: 'utilities',
        title: 'Utilities',
        description: 'Development productivity tools',
        icon: Wrench,
        gradient: 'from-amber-500/20 via-orange-500/10 to-rose-500/5',
        borderColor: 'border-amber-500/20',
    },
];

// Memoized Background Component
const DashboardBackground = React.memo(() => (
    <>
        <div className="fixed inset-0 -z-10 overflow-hidden">
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-500/15 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[180px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '1s' }} />
        </div>
        <div className="fixed inset-0 -z-10 opacity-[0.012]" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '64px 64px'
        }} />
    </>
));

DashboardBackground.displayName = 'DashboardBackground';

// Sortable Tool Tile Component with glassmorphism
const SortableTile = React.memo<{
    tool: Tool;
    onTileClick: (id: string, rect: DOMRect) => void;
    shouldAnimate: boolean;
    index: number;
    isHidden?: boolean;
    isDragOverlay?: boolean;
}>(({ tool, onTileClick, shouldAnimate, index, isHidden, isDragOverlay }) => {
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
        opacity: isDragging || isHidden ? 0 : 1,
    };

    const Icon = tool.icon;

    // Use a callback for the click handler to prevent inline function creation
    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        if (!isDragging) {
            const rect = e.currentTarget.getBoundingClientRect();
            onTileClick(tool.id, rect);
        }
    }, [isDragging, onTileClick, tool.id]);

    return (
        <button
            ref={setNodeRef}
            style={{ ...style, ...(shouldAnimate ? { animationDelay: `${index * 0.05}s` } : {}) }}
            {...attributes}
            {...listeners}
            onClick={handleClick}
            className={`
                group relative flex flex-col p-5 h-full min-h-[180px]
                rounded-3xl
                bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent
                border border-white/[0.08]
                hover:border-white/20 hover:from-white/[0.1] hover:via-white/[0.05]
                transition-all duration-500 ease-out
                text-left
                hover:-translate-y-1.5 hover:scale-[1.02]
                backdrop-blur-xl
                overflow-hidden
                cursor-grab active:cursor-grabbing
                ${shouldAnimate ? 'animate-slide-up-fade' : ''}
                ${isDragging ? 'shadow-2xl ring-2 ring-white/30 scale-105' : ''}
                ${isDragOverlay ? 'shadow-2xl ring-2 ring-white/30 scale-105 cursor-grabbing' : ''}
            `}
        >
            {/* Glow effect on hover */}
            <div
                className="absolute -inset-1 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl -z-10"
                style={{ background: `linear-gradient(135deg, ${tool.glowColor}15, transparent 60%)` }}
            />

            {/* Shimmer effect */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl">
                <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/[0.02] to-transparent group-hover:animate-shimmer" />
            </div>

            {/* Top highlight line */}
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

            <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    {/* Icon with glow */}
                    <div className="relative">
                        <div
                            className="absolute inset-0 rounded-xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity duration-500"
                            style={{ background: `linear-gradient(135deg, ${tool.glowColor}, transparent)` }}
                        />
                        <div className={`
                            relative w-12 h-12 rounded-xl
                            bg-gradient-to-br ${tool.color}
                            flex items-center justify-center
                            shadow-lg
                            group-hover:scale-110 group-hover:rotate-2
                            transition-all duration-500 ease-out
                            ring-1 ring-white/15
                        `}>
                            <Icon className="text-white drop-shadow-md" size={22} strokeWidth={1.5} />
                        </div>
                    </div>

                    {/* Drag handle indicator */}
                    <div className="text-white/15 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <GripVertical size={16} />
                    </div>
                </div>

                <h3 className="text-[15px] font-semibold text-white/90 mb-1.5 group-hover:text-white transition-colors duration-300 tracking-tight">
                    {tool.title}
                </h3>

                <p className="text-[12px] text-white/35 leading-relaxed line-clamp-2 mb-4 group-hover:text-white/55 transition-colors duration-300">
                    {tool.description}
                </p>

                <div className="mt-auto flex items-center gap-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-white/25 group-hover:text-white/50 transition-colors duration-300">
                        Open
                    </span>
                    <div className="w-5 h-5 rounded-full bg-white/[0.04] group-hover:bg-white/10 flex items-center justify-center transition-all duration-300">
                        <ArrowRight size={10} className="text-white/30 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all duration-300" />
                    </div>
                </div>
            </div>

            {/* Corner accent */}
            <div className="absolute bottom-0 right-0 w-20 h-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className={`absolute bottom-0 right-0 w-full h-full bg-gradient-to-tl ${tool.color} opacity-[0.04] rounded-tl-full`} />
            </div>
        </button>
    );
});

SortableTile.displayName = 'SortableTile';

// Drag Overlay Tile
function DragOverlayTile({ tool }: { tool: Tool }) {
    const Icon = tool.icon;
    return (
        <div className={`
            group relative flex flex-col p-5 h-full min-h-[180px]
            rounded-3xl
            bg-gradient-to-br from-white/[0.1] via-white/[0.05] to-transparent
            border border-white/20
            shadow-2xl
            scale-105 cursor-grabbing
            text-left
            overflow-hidden
            backdrop-blur-xl
        `}>
            <div
                className="absolute -inset-2 rounded-[36px] blur-2xl -z-10"
                style={{ background: `linear-gradient(135deg, ${tool.glowColor}25, transparent 60%)` }}
            />

            <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div className="relative">
                        <div
                            className="absolute inset-0 rounded-xl blur-lg opacity-70"
                            style={{ background: `linear-gradient(135deg, ${tool.glowColor}, transparent)` }}
                        />
                        <div className={`
                            relative w-12 h-12 rounded-xl
                            bg-gradient-to-br ${tool.color}
                            flex items-center justify-center
                            shadow-lg scale-110 rotate-2
                            ring-1 ring-white/20
                        `}>
                            <Icon className="text-white drop-shadow-md" size={22} strokeWidth={1.5} />
                        </div>
                    </div>
                    <div className="text-white/40">
                        <GripVertical size={16} />
                    </div>
                </div>

                <h3 className="text-[15px] font-semibold text-white mb-1.5 tracking-tight">
                    {tool.title}
                </h3>

                <p className="text-[12px] text-white/50 leading-relaxed line-clamp-2 mb-4">
                    {tool.description}
                </p>

                <div className="mt-auto flex items-center gap-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-white/40">
                        Open
                    </span>
                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                        <ArrowRight size={10} className="text-white/60" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Category Section Component with DnD
const CategorySection = React.memo<{
    category: Category;
    tools: Tool[];
    onTileClick: (id: string, rect: DOMRect) => void;
    shouldAnimate: boolean;
    expandingId: string | null;
    baseIndex: number;
    activeId: string | null;
    onDragStart: (event: DragStartEvent) => void;
    onDragEnd: (event: DragEndEvent, categoryId: string) => void;
    sensors: ReturnType<typeof useSensors>;
}>(({ category, tools, onTileClick, shouldAnimate, expandingId, baseIndex, activeId, onDragStart, onDragEnd, sensors }) => {
    const CategoryIcon = category.icon;
    const activeTool = useMemo(() => activeId ? tools.find(t => t.id === activeId) : null, [activeId, tools]);

    const handleDragEndInternal = useCallback((e: DragEndEvent) => {
        onDragEnd(e, category.id);
    }, [onDragEnd, category.id]);

    const itemIds = useMemo(() => tools.map(t => t.id), [tools]);

    return (
        <section
            className={`
                relative rounded-[32px] p-6 md:p-8
                bg-gradient-to-br ${category.gradient}
                border ${category.borderColor}
                backdrop-blur-2xl
                overflow-hidden
                ${shouldAnimate ? 'animate-fade-in' : ''}
            `}
            style={shouldAnimate ? { animationDelay: `${baseIndex * 0.1}s` } : {}}
        >
            {/* Inner glow */}
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />

            {/* Subtle grid pattern */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
                backgroundSize: '24px 24px'
            }} />

            {/* Header */}
            <div className="relative flex items-center gap-4 mb-6">
                <div className="relative">
                    <div className="w-11 h-11 rounded-2xl bg-white/[0.08] flex items-center justify-center ring-1 ring-white/10">
                        <CategoryIcon className="text-white/70" size={20} strokeWidth={1.5} />
                    </div>
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-white/90 tracking-tight">{category.title}</h2>
                    <p className="text-xs text-white/40">{category.description}</p>
                </div>
            </div>

            {/* Tools Grid with DnD */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={onDragStart}
                onDragEnd={handleDragEndInternal}
            >
                <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <SortableContext
                        items={itemIds}
                        strategy={rectSortingStrategy}
                    >
                        {tools.map((tool, index) => (
                            <SortableTile
                                key={tool.id}
                                tool={tool}
                                onTileClick={onTileClick}
                                shouldAnimate={shouldAnimate}
                                index={baseIndex + index}
                                isHidden={expandingId === tool.id}
                            />
                        ))}
                    </SortableContext>
                </div>
                {createPortal(
                    <DragOverlay
                        adjustScale={false}
                        dropAnimation={{
                            duration: 250,
                            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                        }}
                    >
                        {activeTool ? <DragOverlayTile tool={activeTool} /> : null}
                    </DragOverlay>,
                    document.body
                )}
            </DndContext>
        </section>
    );
});

CategorySection.displayName = 'CategorySection';

// Expanding tile animation overlay
function ExpandingTileOverlay({ tool, initialRect }: { tool: Tool; initialRect: DOMRect }) {
    const Icon = tool.icon;
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
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
            opacity: 1,
            position: 'fixed',
            zIndex: 9999,
        }
        : {
            top: initialRect.top,
            left: initialRect.left,
            width: initialRect.width,
            height: initialRect.height,
            borderRadius: '24px',
            position: 'fixed',
            zIndex: 9999,
        };

    return (
        <div
            className={`fixed bg-slate-900 border transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden ${isExpanded ? 'border-transparent' : 'border-white/10'}`}
            style={style}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} transition-opacity duration-500 ${isExpanded ? 'opacity-100' : 'opacity-10'}`}>
                <div className={`absolute inset-0 bg-slate-900 ${isExpanded ? 'opacity-95' : 'opacity-0'} transition-opacity duration-500`} />
            </div>

            <div className={`relative w-full h-full p-5 flex flex-col transition-all duration-300 ${isExpanded ? 'opacity-0 scale-95' : 'opacity-100'}`}>
                <div className="flex justify-between items-start mb-4">
                    <div className="relative">
                        <div
                            className="absolute inset-0 rounded-xl blur-lg opacity-50"
                            style={{ background: `linear-gradient(135deg, ${tool.glowColor}, transparent)` }}
                        />
                        <div className={`
                            relative w-12 h-12 rounded-xl
                            bg-gradient-to-br ${tool.color}
                            flex items-center justify-center
                            shadow-lg ring-1 ring-white/15
                        `}>
                            <Icon className="text-white drop-shadow-md" size={22} strokeWidth={1.5} />
                        </div>
                    </div>
                </div>
                <h3 className="text-[15px] font-semibold text-white mb-1.5 tracking-tight">
                    {tool.title}
                </h3>
            </div>
        </div>
    );
}

const initialTools: Tool[] = [
    // Localization
    {
        id: 'combine',
        title: 'Combine Strings',
        description: 'Merge multiple .strings files into a single file',
        icon: FileCode2,
        color: 'from-blue-500 to-cyan-400',
        glowColor: '#06b6d4',
        category: 'localization',
    },
    {
        id: 'extract',
        title: 'Extract Catalog',
        description: 'Extract strings from .xcstrings catalog files',
        icon: BookOpen,
        color: 'from-violet-500 to-purple-400',
        glowColor: '#a855f7',
        category: 'localization',
    },
    {
        id: 'editor',
        title: 'File Editor',
        description: 'Edit and manage your localization files',
        icon: Edit3,
        color: 'from-amber-500 to-orange-400',
        glowColor: '#f97316',
        category: 'localization',
    },
    {
        id: 'renamer',
        title: 'Key Renamer',
        description: 'Batch rename keys across multiple files',
        icon: Variable,
        color: 'from-pink-500 to-rose-400',
        glowColor: '#f43f5e',
        category: 'localization',
    },
    {
        id: 'merge',
        title: 'Merge Strings',
        description: 'Smart merge with conflict resolution',
        icon: Merge,
        color: 'from-indigo-500 to-blue-400',
        glowColor: '#6366f1',
        category: 'localization',
    },
    {
        id: 'merge-catalogs',
        title: 'Merge String Catalogs',
        description: 'Merge multiple .xcstrings files.',
        icon: Layers,
        color: 'from-violet-600 to-indigo-600',
        glowColor: '#7c3aed',
        category: 'localization',
    },
    {
        id: 'analyser',
        title: 'Strings Analyser',
        description: 'Deep analysis for .xcstrings and .xml files',
        icon: ScanSearch,
        color: 'from-purple-600 to-violet-400',
        glowColor: '#8b5cf6',
        category: 'localization',
    },
    {
        id: 'duplicate-finder',
        title: 'Duplicate Value Finder',
        description: 'Find duplicate values across files',
        icon: Copy,
        color: 'from-cyan-500 to-teal-400',
        glowColor: '#06b6d4',
        category: 'localization',
    },
    // Converters
    {
        id: 'properties',
        title: 'Properties Converter',
        description: 'Convert .properties files to .strings format',
        icon: FileJson,
        color: 'from-emerald-500 to-teal-400',
        glowColor: '#14b8a6',
        category: 'converters',
    },
    {
        id: 'json-converter',
        title: 'JSON Converter',
        description: 'Convert between key-value JSON and .strings files.',
        icon: FileJson,
        color: 'from-yellow-500 to-amber-400',
        glowColor: '#fbbf24',
        category: 'converters',
    },
    {
        id: 'xml-converter',
        title: 'XML Converter',
        description: 'Convert .strings, .stringsdict, .xcstrings to Android XML',
        icon: FileCode2,
        color: 'from-teal-500 to-cyan-400',
        glowColor: '#22d3d1',
        category: 'converters',
    },
    {
        id: 'json-to-swift',
        title: 'JSON to Swift',
        description: 'Convert JSON to Swift Codable structs',
        icon: Code,
        color: 'from-red-500 to-orange-400',
        glowColor: '#ef4444',
        category: 'converters',
    },
    // Utilities
    {
        id: 'json-formatter',
        title: 'JSON Beautifier',
        description: 'Format, validate, and convert JSON data',
        icon: Braces,
        color: 'from-orange-500 to-yellow-400',
        glowColor: '#f59e0b',
        category: 'utilities',
    },
    {
        id: 'script-runner',
        title: 'Script Runner',
        description: 'Run JS scripts on text/files',
        icon: Terminal,
        color: 'from-rose-500 to-pink-400',
        glowColor: '#f43f5e',
        category: 'utilities',
    },
    {
        id: 'mock-data',
        title: 'Mock Data Generator',
        description: 'Generate realistic mock data (JSON/CSV)',
        icon: Database,
        color: 'from-green-500 to-emerald-400',
        glowColor: '#22c55e',
        category: 'utilities',
    },
    {
        id: 'app-icon-generator',
        title: 'App Icon Generator',
        description: 'Generate standard iOS App Icons & Contents.json',
        icon: ImageIcon,
        color: 'from-blue-600 to-indigo-400',
        glowColor: '#6366f1',
        category: 'utilities',
    },
    {
        id: 'color-converter',
        title: 'Color Converter',
        description: 'Convert between HEX, RGB, HSL, Swift, Android & Tailwind',
        icon: Palette,
        color: 'from-fuchsia-500 to-pink-400',
        glowColor: '#d946ef',
        category: 'utilities',
    },
    {
        id: 'encoding-tool',
        title: 'Encoding Tool',
        description: 'Base64, URL, HTML, Hex encoding & JWT decoder',
        icon: Binary,
        color: 'from-indigo-500 to-violet-400',
        glowColor: '#8b5cf6',
        category: 'utilities',
    },
];

// Helper to get saved order for a category
function getSavedCategoryOrder(categoryId: string): string[] | null {
    const saved = localStorage.getItem(`dashboard_order_${categoryId}`);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch {
            return null;
        }
    }
    return null;
}

// Helper to save order for a category
function saveCategoryOrder(categoryId: string, toolIds: string[]) {
    localStorage.setItem(`dashboard_order_${categoryId}`, JSON.stringify(toolIds));
}

export function Dashboard({ setView }: DashboardProps) {
    const [shouldAnimate, setShouldAnimate] = useState(() => {
        return !sessionStorage.getItem('dashboard_visited');
    });

    const [expandingId, setExpandingId] = useState<string | null>(null);
    const [expansionRect, setExpansionRect] = useState<DOMRect | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Initialize tools by category with saved order
    const [toolsByCategory, setToolsByCategory] = useState<Record<string, Tool[]>>(() => {
        const result: Record<string, Tool[]> = {};
        for (const cat of categories) {
            const categoryTools = initialTools.filter(t => t.category === cat.id);
            const savedOrder = getSavedCategoryOrder(cat.id);
            if (savedOrder) {
                const toolMap = new Map(categoryTools.map(t => [t.id, t]));
                const orderedTools = savedOrder
                    .filter(id => toolMap.has(id))
                    .map(id => toolMap.get(id)!);
                const savedSet = new Set(savedOrder);
                const newTools = categoryTools.filter(t => !savedSet.has(t.id));
                result[cat.id] = [...orderedTools, ...newTools];
            } else {
                result[cat.id] = categoryTools;
            }
        }
        return result;
    });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (shouldAnimate) {
            sessionStorage.setItem('dashboard_visited', 'true');
            const timer = setTimeout(() => {
                setShouldAnimate(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [shouldAnimate]);

    const handleTileClick = useCallback((id: string, rect: DOMRect) => {
        // We use functional update or ref if we needed valid activeId without dependency, 
        // but activeId is state. However, we want to avoid re-creating this function 
        // if we can. activeId changes only when dragging.
        // But if we include activeId in dependency, it re-renders.
        // Actually, if we are clicking, activeId should be null.
        // Let's rely on the check inside.
        if (activeId) return;

        setExpansionRect(rect);
        setExpandingId(id);
        setTimeout(() => {
            setView(id as ViewMode);
        }, 500);
    }, [activeId, setView]); // activeId will likely be null when clicking.

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent, categoryId: string) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setToolsByCategory(prev => {
                const categoryTools = [...prev[categoryId]];
                const oldIndex = categoryTools.findIndex(t => t.id === active.id);
                const newIndex = categoryTools.findIndex(t => t.id === over.id);
                const newTools = arrayMove(categoryTools, oldIndex, newIndex);
                saveCategoryOrder(categoryId, newTools.map(t => t.id));
                return {
                    ...prev,
                    [categoryId]: newTools
                };
            });
        }
        setActiveId(null);
    }, []);

    let cumulativeIndex = 0;

    return (
        <div className={`relative w-full min-h-screen flex flex-col items-center text-white font-sans transition-opacity duration-500 ${expandingId ? 'opacity-0' : ''}`}>
            <DashboardBackground />

            <div className="relative z-10 w-full p-4 md:p-8 lg:p-12 pt-12 md:pt-16">
                {/* Premium Header */}
                <header className="text-center mb-12 md:mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6 backdrop-blur-sm">
                        <Sparkles size={14} className="text-amber-400" />
                        <span className="text-xs font-medium text-white/50 tracking-wider uppercase">Development Suite</span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4">
                        <span className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                            Development
                        </span>
                        <br />
                        <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Tools
                        </span>
                    </h1>

                    <p className="text-base md:text-lg text-white/35 max-w-xl mx-auto font-light leading-relaxed">
                        Professional localization and development utilities crafted for iOS developers.
                    </p>
                </header>

                {/* Category Sections */}
                <div className="w-full max-w-7xl mx-auto space-y-6">
                    {categories.map((category) => {
                        const tools = toolsByCategory[category.id] || [];
                        const section = (
                            <CategorySection
                                key={category.id}
                                category={category}
                                tools={tools}
                                onTileClick={handleTileClick}
                                shouldAnimate={shouldAnimate}
                                expandingId={expandingId}
                                baseIndex={cumulativeIndex}
                                activeId={activeId}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                sensors={sensors}
                            />
                        );
                        cumulativeIndex += tools.length;
                        return section;
                    })}
                </div>

                {/* Footer */}
                <footer className="mt-16 md:mt-20 text-center">
                    <p className="text-xs text-white/15 tracking-wider">
                        Drag tiles to reorder • Click to open tool
                    </p>
                </footer>
            </div>

            {expandingId && expansionRect && (
                createPortal(
                    <ExpandingTileOverlay
                        tool={initialTools.find(t => t.id === expandingId)!}
                        initialRect={expansionRect}
                    />,
                    document.body
                )
            )}
        </div>
    );
}
