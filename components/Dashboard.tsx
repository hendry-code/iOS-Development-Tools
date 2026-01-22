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
    Image as ImageIcon,
    Sparkles
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
}

interface SortableTileProps {
    tool: Tool;
    onTileClick: (id: string, rect: DOMRect) => void;
    shouldAnimate: boolean;
    index: number;
    forceDragging?: boolean;
    isHidden?: boolean;
}

// Premium Tile Component with glassmorphism and glow effects
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
        opacity: isDragging || isHidden ? 0 : 1,
    };

    const Icon = tool.icon;
    const activeDragging = forceDragging || isDragging;

    return (
        <button
            ref={setNodeRef}
            style={{ ...style, ...(shouldAnimate ? { animationDelay: `${index * 0.06}s` } : {}) }}
            {...attributes}
            {...listeners}
            onClick={(e) => {
                if (!activeDragging) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onTileClick(tool.id, rect);
                }
            }}
            className={`
                group relative flex flex-col p-6 h-full min-h-[220px]
                rounded-[28px]
                bg-gradient-to-br from-slate-800/60 via-slate-800/40 to-slate-900/60
                border border-white/[0.08]
                hover:border-white/20
                transition-all duration-500 ease-out
                text-left
                hover:-translate-y-2 hover:scale-[1.02]
                backdrop-blur-xl
                overflow-hidden
                ${shouldAnimate ? 'animate-slide-up-fade' : ''}
                ${activeDragging ? 'shadow-2xl ring-2 ring-white/30 scale-105 z-50' : ''}
            `}
        >
            {/* Animated mesh gradient background */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-[0.08]`} />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-white/[0.08] via-transparent to-transparent" />
            </div>

            {/* Glow effect on hover */}
            <div
                className={`absolute -inset-1 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10`}
                style={{ background: `linear-gradient(135deg, ${tool.glowColor}20, transparent 60%)` }}
            />

            {/* Shimmer effect */}
            <div className="absolute inset-0 overflow-hidden rounded-[28px]">
                <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/[0.03] to-transparent group-hover:animate-shimmer" />
            </div>

            {/* Top highlight line */}
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-5">
                    {/* Icon with enhanced glow */}
                    <div className="relative">
                        <div
                            className="absolute inset-0 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500"
                            style={{ background: `linear-gradient(135deg, ${tool.glowColor}, transparent)` }}
                        />
                        <div className={`
                            relative w-14 h-14 rounded-2xl
                            bg-gradient-to-br ${tool.color}
                            flex items-center justify-center
                            shadow-lg
                            group-hover:scale-110 group-hover:rotate-3 
                            transition-all duration-500 ease-out
                            ring-1 ring-white/20
                        `}>
                            <Icon className="text-white drop-shadow-lg" size={26} strokeWidth={1.5} />
                        </div>
                    </div>

                    <div className="text-white/20 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:rotate-90">
                        <GripVertical size={18} />
                    </div>
                </div>

                <h3 className="text-[17px] font-semibold text-white/90 mb-2 group-hover:text-white transition-colors duration-300 tracking-tight">
                    {tool.title}
                </h3>

                <p className="text-[13px] text-white/40 leading-relaxed line-clamp-2 mb-5 group-hover:text-white/60 transition-colors duration-300">
                    {tool.description}
                </p>

                <div className="mt-auto flex items-center gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-widest text-white/30 group-hover:text-white/60 transition-colors duration-300">
                        Open
                    </span>
                    <div className="w-6 h-6 rounded-full bg-white/[0.05] group-hover:bg-white/10 flex items-center justify-center transition-all duration-300">
                        <ArrowRight size={12} className="text-white/40 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all duration-300" />
                    </div>
                </div>
            </div>

            {/* Corner accent */}
            <div className="absolute bottom-0 right-0 w-24 h-24 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className={`absolute bottom-0 right-0 w-full h-full bg-gradient-to-tl ${tool.color} opacity-[0.06] rounded-tl-full`} />
            </div>
        </button>
    );
}

// Drag overlay tile with premium styling
function DragOverlayTile({ tool }: { tool: Tool }) {
    const Icon = tool.icon;
    return (
        <div className={`
            group relative flex flex-col p-6 h-full min-h-[220px]
            rounded-[28px]
            bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-slate-900/80
            border border-white/20
            shadow-2xl
            scale-105 cursor-grabbing
            text-left
            overflow-hidden
            backdrop-blur-xl
        `}>
            <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-10`} />
            <div
                className="absolute -inset-2 rounded-[36px] blur-2xl -z-10"
                style={{ background: `linear-gradient(135deg, ${tool.glowColor}30, transparent 60%)` }}
            />

            <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-5">
                    <div className="relative">
                        <div
                            className="absolute inset-0 rounded-2xl blur-xl opacity-80"
                            style={{ background: `linear-gradient(135deg, ${tool.glowColor}, transparent)` }}
                        />
                        <div className={`
                            relative w-14 h-14 rounded-2xl
                            bg-gradient-to-br ${tool.color}
                            flex items-center justify-center
                            shadow-lg scale-110 rotate-3
                            ring-1 ring-white/20
                        `}>
                            <Icon className="text-white drop-shadow-lg" size={26} strokeWidth={1.5} />
                        </div>
                    </div>
                    <div className="text-white/40 rotate-90">
                        <GripVertical size={18} />
                    </div>
                </div>

                <h3 className="text-[17px] font-semibold text-white mb-2 tracking-tight">
                    {tool.title}
                </h3>

                <p className="text-[13px] text-white/50 leading-relaxed line-clamp-2 mb-5">
                    {tool.description}
                </p>

                <div className="mt-auto flex items-center gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-widest text-white/50">
                        Open
                    </span>
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                        <ArrowRight size={12} className="text-white/70" />
                    </div>
                </div>
            </div>
        </div>
    );
}

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
            borderRadius: '28px',
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

            <div className={`relative w-full h-full p-6 flex flex-col transition-all duration-300 ${isExpanded ? 'opacity-0 scale-95' : 'opacity-100'}`}>
                <div className="flex justify-between items-start mb-5">
                    <div className="relative">
                        <div
                            className="absolute inset-0 rounded-2xl blur-xl opacity-60"
                            style={{ background: `linear-gradient(135deg, ${tool.glowColor}, transparent)` }}
                        />
                        <div className={`
                            relative w-14 h-14 rounded-2xl
                            bg-gradient-to-br ${tool.color}
                            flex items-center justify-center
                            shadow-lg ring-1 ring-white/20
                        `}>
                            <Icon className="text-white drop-shadow-lg" size={26} strokeWidth={1.5} />
                        </div>
                    </div>
                </div>
                <h3 className="text-[17px] font-semibold text-white mb-2 tracking-tight">
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
        color: 'from-blue-500 to-cyan-400',
        glowColor: '#06b6d4',
    },
    {
        id: 'extract',
        title: 'Extract Catalog',
        description: 'Extract strings from .xcstrings catalog files',
        icon: BookOpen,
        color: 'from-violet-500 to-purple-400',
        glowColor: '#a855f7',
    },
    {
        id: 'properties',
        title: 'Properties Converter',
        description: 'Convert .properties files to .strings format',
        icon: FileJson,
        color: 'from-emerald-500 to-teal-400',
        glowColor: '#14b8a6',
    },
    {
        id: 'editor',
        title: 'File Editor',
        description: 'Edit and manage your localization files',
        icon: Edit3,
        color: 'from-amber-500 to-orange-400',
        glowColor: '#f97316',
    },
    {
        id: 'renamer',
        title: 'Key Renamer',
        description: 'Batch rename keys across multiple files',
        icon: Variable,
        color: 'from-pink-500 to-rose-400',
        glowColor: '#f43f5e',
    },
    {
        id: 'json-converter',
        title: 'JSON Converter',
        description: 'Convert between key-value JSON and .strings files.',
        icon: FileJson,
        color: 'from-yellow-500 to-amber-400',
        glowColor: '#fbbf24',
    },
    {
        id: 'merge',
        title: 'Merge Strings',
        description: 'Smart merge with conflict resolution',
        icon: Merge,
        color: 'from-indigo-500 to-blue-400',
        glowColor: '#6366f1',
    },
    {
        id: 'analyser',
        title: 'Strings Analyser',
        description: 'Deep analysis for .xcstrings and .xml files',
        icon: ScanSearch,
        color: 'from-purple-600 to-violet-400',
        glowColor: '#8b5cf6',
    },
    {
        id: 'xml-converter',
        title: 'XML Converter',
        description: 'Convert .strings, .stringsdict, .xcstrings to Android XML',
        icon: FileCode2,
        color: 'from-teal-500 to-cyan-400',
        glowColor: '#22d3d1',
    },
    {
        id: 'json-formatter',
        title: 'JSON Beautifier',
        description: 'Format, validate, and convert JSON data',
        icon: Braces,
        color: 'from-orange-500 to-yellow-400',
        glowColor: '#f59e0b',
    },
    {
        id: 'json-to-swift',
        title: 'JSON to Swift',
        description: 'Convert JSON to Swift Codable structs',
        icon: Code,
        color: 'from-red-500 to-orange-400',
        glowColor: '#ef4444',
    },
    {
        id: 'duplicate-finder',
        title: 'Duplicate Value Finder',
        description: 'Find duplicate values across files',
        icon: Copy,
        color: 'from-cyan-500 to-teal-400',
        glowColor: '#06b6d4',
    },
    {
        id: 'script-runner',
        title: 'Script Runner',
        description: 'Run JS scripts on text/files',
        icon: Terminal,
        color: 'from-rose-500 to-pink-400',
        glowColor: '#f43f5e',
    },
    {
        id: 'mock-data',
        title: 'Mock Data Generator',
        description: 'Generate realistic mock data (JSON/CSV)',
        icon: Database,
        color: 'from-green-500 to-emerald-400',
        glowColor: '#22c55e',
    },
    {
        id: 'app-icon-generator',
        title: 'App Icon Generator',
        description: 'Generate standard iOS App Icons & Contents.json',
        icon: ImageIcon,
        color: 'from-blue-600 to-indigo-400',
        glowColor: '#6366f1',
    },
];

export function Dashboard({ setView }: DashboardProps) {
    const [shouldAnimate, setShouldAnimate] = useState(() => {
        return !sessionStorage.getItem('dashboard_visited');
    });

    const [activeId, setActiveId] = useState<string | null>(null);
    const [expandingId, setExpandingId] = useState<string | null>(null);
    const [expansionRect, setExpansionRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (shouldAnimate) {
            sessionStorage.setItem('dashboard_visited', 'true');
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
                const toolMap = new Map(initialTools.map(t => [t.id, t]));
                const orderedTools = order
                    .filter(id => toolMap.has(id))
                    .map(id => toolMap.get(id)!);
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
                distance: 8,
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
                localStorage.setItem('dashboard_tile_order', JSON.stringify(newItems.map(t => t.id)));
                return newItems;
            });
        }
        setActiveId(null);
    }

    const handleTileClick = (id: string, rect: DOMRect) => {
        setExpansionRect(rect);
        setExpandingId(id);
        setTimeout(() => {
            setView(id as ViewMode);
        }, 500);
    };

    return (
        <div className={`relative w-full min-h-screen flex flex-col items-center justify-center text-white font-sans transition-opacity duration-500 ${expandingId ? 'opacity-0' : ''}`}>
            {/* Animated background gradients */}
            <div className="fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '1s' }} />
            </div>

            {/* Subtle grid pattern */}
            <div className="fixed inset-0 -z-10 opacity-[0.015]" style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                backgroundSize: '64px 64px'
            }} />

            <div className="relative z-10 w-full p-6 md:p-12">
                {/* Premium Header */}
                <header className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/10 mb-8 backdrop-blur-sm">
                        <Sparkles size={14} className="text-amber-400" />
                        <span className="text-xs font-medium text-white/60 tracking-wider uppercase">Development Suite</span>
                    </div>

                    <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6">
                        <span className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                            Development
                        </span>
                        <br />
                        <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Tools
                        </span>
                    </h1>

                    <p className="text-lg text-white/40 max-w-xl mx-auto font-light leading-relaxed">
                        Professional localization and development utilities crafted for iOS developers.
                    </p>
                </header>

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="w-full max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 px-4">
                        <SortableContext
                            items={tools.map(t => t.id)}
                            strategy={rectSortingStrategy}
                        >
                            {tools.map((tool, index) => (
                                <SortableTile
                                    key={tool.id}
                                    tool={tool}
                                    onTileClick={handleTileClick}
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

                {/* Footer */}
                <footer className="mt-20 text-center">
                    <p className="text-xs text-white/20 tracking-wider">
                        Drag tiles to reorder • Click to open tool
                    </p>
                </footer>
            </div>

            {expandingId && expansionRect && (
                <ExpandingTileOverlay
                    tool={tools.find(t => t.id === expandingId)!}
                    initialRect={expansionRect}
                />
            )}
        </div>
    );
}
