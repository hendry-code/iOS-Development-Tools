import React, { useEffect, useState } from 'react';
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
    Terminal
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
    setView: (view: ViewMode) => void;
    shouldAnimate: boolean;
    index: number;
    forceDragging?: boolean;
}

// Separate component for the sortable item
const SortableTile: React.FC<SortableTileProps> = ({ tool, setView, shouldAnimate, index, forceDragging }) => {
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
        opacity: isDragging ? 0.3 : 1, // Dim the original item while dragging
    };

    const Icon = tool.icon;

    // Determine dragging state for visual feedback
    const activeDragging = forceDragging || isDragging;

    return (
        <button
            ref={setNodeRef}
            style={{ ...style, ... (shouldAnimate ? { animationDelay: `${index * 0.1}s` } : {}) }}
            {...attributes}
            {...listeners}
            onClick={() => {
                // If we are dragging, don't trigger click. 
                // dnd-kit handles this well usually, but explicit separating might be needed 
                // if we were separating drag handle. With whole card draggable, it's fine.
                if (!activeDragging) {
                    setView(tool.id as ViewMode)
                }
            }}
            className={`group relative p-3 rounded-2xl bg-slate-800/40 border border-slate-700 hover:bg-slate-800/60 transition-all duration-300 text-left hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/10 backdrop-blur-sm ${shouldAnimate ? 'animate-slide-up-fade' : ''} ${activeDragging ? 'shadow-2xl ring-2 ring-indigo-500 scale-105 bg-slate-800' : ''}`}
        >
            <div className={`w-10 h-10 rounded-lg ${tool.color} bg-opacity-20 flex items-center justify-center mb-3 shadow-lg group-hover:shadow-xl transition-all ring-1 ring-white/10`}>
                <Icon className="text-white" size={20} />
            </div>

            <div className="absolute top-3 right-3 text-slate-600 opacity-100 cursor-grab active:cursor-grabbing">
                <GripVertical size={16} />
            </div>

            <h3 className="text-base font-semibold text-slate-100 mb-1 group-hover:text-indigo-400 transition-colors">
                {tool.title}
            </h3>

            <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                {tool.description}
            </p>

            <div className="flex items-center text-[10px] font-medium text-slate-500 group-hover:text-indigo-400 transition-colors">
                Open Tool <ArrowRight size={10} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
        </button>
    );
}

// Component for the drag overlay - needs to look exactly like the tile but without sortable logic
function DragOverlayTile({ tool }: { tool: Tool }) {
    const Icon = tool.icon;
    return (
        <div className={`group relative p-3 rounded-2xl bg-slate-800 border border-slate-700 text-left shadow-2xl ring-2 ring-indigo-500 scale-105 cursor-grabbing`}>
            <div className={`w-10 h-10 rounded-lg ${tool.color} bg-opacity-20 flex items-center justify-center mb-3 shadow-lg ring-1 ring-white/10`}>
                <Icon className="text-white" size={20} />
            </div>

            <div className="absolute top-3 right-3 text-slate-600 opacity-100 cursor-grabbing">
                <GripVertical size={16} />
            </div>

            <h3 className="text-base font-semibold text-slate-100 mb-1">
                {tool.title}
            </h3>

            <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                {tool.description}
            </p>

            <div className="flex items-center text-[10px] font-medium text-slate-500">
                Open Tool <ArrowRight size={10} className="ml-1" />
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
        color: 'bg-blue-500',
    },
    {
        id: 'extract',
        title: 'Extract Catalog',
        description: 'Extract strings from .xcstrings catalog files',
        icon: BookOpen,
        color: 'bg-purple-500',
    },
    {
        id: 'properties',
        title: 'Properties Converter',
        description: 'Convert .properties files to .strings format',
        icon: FileJson,
        color: 'bg-green-500',
    },
    {
        id: 'editor',
        title: 'File Editor',
        description: 'Edit and manage your localization files',
        icon: Edit3,
        color: 'bg-orange-500',
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
        color: 'bg-indigo-500',
    },
    {
        id: 'analyser',
        title: 'Strings Analyser',
        description: 'Deep analysis for .xcstrings and .xml files',
        icon: ScanSearch,
        color: 'bg-indigo-600',
    },
    {
        id: 'xml-converter',
        title: 'XML Converter',
        description: 'Convert .strings, .stringsdict, .xcstrings to Android XML',
        icon: FileCode2,
        color: 'bg-teal-500',
    },
    {
        id: 'json-formatter',
        title: 'JSON Beautifier',
        description: 'Format, validate, and convert JSON data',
        icon: Braces,
        color: 'bg-yellow-500',
    },
    {
        id: 'json-to-swift',
        title: 'JSON to Swift',
        description: 'Convert JSON to Swift Codable structs',
        icon: Code,
        color: 'bg-orange-500',
    },
    {
        id: 'duplicate-finder',
        title: 'Duplicate Value Finder',
        description: 'Find duplicate values across files',
        icon: Copy,
        color: 'bg-teal-600',
    },
    {
        id: 'script-runner',
        title: 'Script Runner',
        description: 'Run JS scripts on text/files',
        icon: Terminal,
        color: 'bg-rose-500',
    },
];

export function Dashboard({ setView }: DashboardProps) {
    const [shouldAnimate, setShouldAnimate] = useState(() => {
        return !sessionStorage.getItem('dashboard_visited');
    });

    const [activeId, setActiveId] = useState<string | null>(null);

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

    return (
        <div className="w-full min-h-screen p-4 md:p-8 flex flex-col items-center justify-center animate-window-open bg-slate-900 text-slate-100 font-sans">
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
                                setView={setView}
                                shouldAnimate={shouldAnimate}
                                index={index}
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
        </div>
    );
}
