import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, RefreshCw, Database, Settings2, BookOpen, Save, FolderOpen, Upload, Table, Code, Trash2, X } from 'lucide-react';
import { generateMockData, SchemaField, AVAILABLE_TYPES, MockDataType, OutputFormatType } from '../services/mockDataGenerator';
import { SCHEMA_PRESETS } from '../services/mockDataPresets';
import { schemaStore, SavedSchema, inferSchemaFromJSON } from '../services/mockDataSchemaStore';
import { CodeBlock } from './CodeBlock';
import { SchemaBuilderItem } from './SchemaBuilderItem';
import { TwoPaneLayout } from './TwoPaneLayout';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MockDataGeneratorViewProps {
    onBack: () => void;
}

const OUTPUT_FORMATS: { value: OutputFormatType; label: string }[] = [
    { value: 'json', label: 'JSON' },
    { value: 'csv', label: 'CSV' },
    { value: 'yaml', label: 'YAML' },
    { value: 'xml', label: 'XML' },
    { value: 'swift', label: 'Swift' },
    { value: 'sql', label: 'SQL' },
];

// ─── Table Preview Component ─────────────────────────────────────────────────

const DataTablePreview: React.FC<{ output: string; format: OutputFormatType }> = ({ output, format }) => {
    const parsedData = useMemo(() => {
        if (format !== 'json') return null;
        try {
            const data = JSON.parse(output);
            if (!Array.isArray(data) || data.length === 0) return null;
            return data;
        } catch {
            return null;
        }
    }, [output, format]);

    if (!parsedData) {
        return (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                Table preview is only available for JSON format.
            </div>
        );
    }

    const headers = Object.keys(parsedData[0]);

    const formatCell = (value: any): string => {
        if (value === null || value === undefined) return '—';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    return (
        <div className="h-full flex flex-col bg-slate-900/50 rounded-lg border border-slate-700/50 overflow-hidden">
            <div className="flex justify-between items-center px-4 py-2 bg-slate-800/50 rounded-t-lg border-b border-slate-700/50">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Table Preview</span>
                <span className="text-xs text-slate-500">{parsedData.length} rows</span>
            </div>
            <div className="flex-grow overflow-auto custom-scrollbar">
                <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-800/90 backdrop-blur-sm">
                            <th className="px-3 py-2 text-left text-slate-400 font-medium border-b border-slate-700 w-10">#</th>
                            {headers.map(h => (
                                <th key={h} className="px-3 py-2 text-left text-slate-400 font-medium border-b border-slate-700 whitespace-nowrap font-mono">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {parsedData.slice(0, 100).map((row: any, i: number) => (
                            <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                <td className="px-3 py-1.5 text-slate-600">{i + 1}</td>
                                {headers.map(h => (
                                    <td key={h} className="px-3 py-1.5 text-slate-300 max-w-[200px] truncate whitespace-nowrap" title={formatCell(row[h])}>
                                        {row[h] === null ? <span className="text-slate-600 italic">null</span> : formatCell(row[h])}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const MockDataGeneratorView: React.FC<MockDataGeneratorViewProps> = ({ onBack }) => {
    // Schema state
    const [fields, setFields] = useState<SchemaField[]>([
        { id: '1', name: 'id', type: 'uuid' },
        {
            id: '2',
            name: 'user',
            type: 'object',
            children: [
                { id: '2_1', name: 'fullName', type: 'name' },
                { id: '2_2', name: 'email', type: 'email' },
            ]
        },
        { id: '3', name: 'isActive', type: 'boolean' },
    ]);

    // Config state
    const [count, setCount] = useState<number>(10);
    const [format, setFormat] = useState<OutputFormatType>('json');
    const [seed, setSeed] = useState<string>('');
    const [output, setOutput] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [outputView, setOutputView] = useState<'code' | 'table'>('code');

    // UI state
    const [showPresets, setShowPresets] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [showLoadDialog, setShowLoadDialog] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [saveSchemaName, setSaveSchemaName] = useState('');
    const [importJSON, setImportJSON] = useState('');
    const [importError, setImportError] = useState('');
    const [savedSchemas, setSavedSchemas] = useState<SavedSchema[]>([]);

    // Load saved schemas on mount
    useEffect(() => {
        setSavedSchemas(schemaStore.getAll());
    }, []);

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    // Live generation
    useEffect(() => {
        const timer = setTimeout(() => {
            handleGenerate();
        }, 500);
        return () => clearTimeout(timer);
    }, [fields, count, format, seed]);

    const handleGenerate = () => {
        setIsGenerating(true);
        setTimeout(() => {
            const seedNum = seed ? parseInt(seed) : undefined;
            const data = generateMockData(fields, count, format, seedNum);
            setOutput(data);
            setIsGenerating(false);
        }, 0);
    };

    // ─── Tree Helpers ────────────────────────────────────────────────────────

    const updateFieldRecursive = (
        currentFields: SchemaField[],
        targetId: string,
        updates: Partial<SchemaField>
    ): SchemaField[] => {
        return currentFields.map(field => {
            if (field.id === targetId) {
                return { ...field, ...updates };
            }
            if (field.children) {
                return { ...field, children: updateFieldRecursive(field.children, targetId, updates) };
            }
            return field;
        });
    };

    const removeFieldRecursive = (currentFields: SchemaField[], targetId: string): SchemaField[] => {
        return currentFields
            .filter(field => field.id !== targetId)
            .map(field => {
                if (field.children) {
                    return { ...field, children: removeFieldRecursive(field.children, targetId) };
                }
                return field;
            });
    };

    const addChildRecursive = (currentFields: SchemaField[], parentId: string, newChild: SchemaField): SchemaField[] => {
        return currentFields.map(field => {
            if (field.id === parentId) {
                return { ...field, children: [...(field.children || []), newChild] };
            }
            if (field.children) {
                return { ...field, children: addChildRecursive(field.children, parentId, newChild) };
            }
            return field;
        });
    };

    const insertAfterRecursive = (currentFields: SchemaField[], targetId: string, newField: SchemaField): SchemaField[] => {
        const result: SchemaField[] = [];
        for (const field of currentFields) {
            result.push(field);
            if (field.id === targetId) {
                result.push(newField);
            }
            if (field.children) {
                const updatedField = result[result.length - (field.id === targetId ? 2 : 1)];
                if (updatedField.children) {
                    updatedField.children = insertAfterRecursive(field.children, targetId, newField);
                }
            }
        }
        return result;
    };

    // ─── Actions ─────────────────────────────────────────────────────────────

    const updateField = (id: string, updates: Partial<SchemaField>) => {
        setFields(prev => updateFieldRecursive(prev, id, updates));
    };

    const removeField = (id: string) => {
        setFields(prev => removeFieldRecursive(prev, id));
    };

    const addRootField = () => {
        const newField: SchemaField = {
            id: Date.now().toString(),
            name: `field_${Math.floor(Math.random() * 1000)}`,
            type: 'lorem'
        };
        setFields([...fields, newField]);
    };

    const addChildField = (parentId: string) => {
        const newField: SchemaField = {
            id: Date.now().toString(),
            name: `subField_${Math.floor(Math.random() * 1000)}`,
            type: 'lorem'
        };
        setFields(prev => addChildRecursive(prev, parentId, newField));
    };

    // Deep clone a field tree with fresh IDs
    const deepCloneField = (field: SchemaField): SchemaField => {
        const newId = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const cloned: SchemaField = { ...field, id: newId };
        if (cloned.children) {
            cloned.children = cloned.children.map(c => deepCloneField(c));
        }
        return cloned;
    };

    const cloneField = (field: SchemaField) => {
        const cloned = deepCloneField(field);
        // Try to insert after the original at root level
        const rootIdx = fields.findIndex(f => f.id === field.id);
        if (rootIdx !== -1) {
            const newFields = [...fields];
            newFields.splice(rootIdx + 1, 0, cloned);
            setFields(newFields);
        } else {
            // It's a nested field — use recursive insert
            setFields(prev => insertAfterRecursive(prev, field.id, cloned));
        }
    };

    // Drag-and-drop reorder (root level only)
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setFields(prev => {
                const oldIndex = prev.findIndex(f => f.id === active.id);
                const newIndex = prev.findIndex(f => f.id === over.id);
                if (oldIndex !== -1 && newIndex !== -1) {
                    return arrayMove(prev, oldIndex, newIndex);
                }
                return prev;
            });
        }
    };

    // Schema management
    const handleSaveSchema = () => {
        if (!saveSchemaName.trim()) return;
        schemaStore.save(saveSchemaName.trim(), fields);
        setSavedSchemas(schemaStore.getAll());
        setShowSaveDialog(false);
        setSaveSchemaName('');
    };

    const handleLoadSchema = (schema: SavedSchema) => {
        setFields(JSON.parse(JSON.stringify(schema.fields)));
        setShowLoadDialog(false);
    };

    const handleDeleteSchema = (id: string) => {
        schemaStore.remove(id);
        setSavedSchemas(schemaStore.getAll());
    };

    const handleLoadPreset = (preset: typeof SCHEMA_PRESETS[0]) => {
        setFields(JSON.parse(JSON.stringify(preset.fields)));
        setShowPresets(false);
    };

    const handleImportJSON = () => {
        setImportError('');
        try {
            const inferred = inferSchemaFromJSON(importJSON);
            if (inferred.length === 0) {
                setImportError('Could not infer any fields from the provided JSON.');
                return;
            }
            setFields(inferred);
            setShowImportDialog(false);
            setImportJSON('');
        } catch (e: any) {
            setImportError(e.message || 'Invalid JSON');
        }
    };

    const groupedTypes = AVAILABLE_TYPES.reduce((acc, curr) => {
        if (!acc[curr.group]) acc[curr.group] = [];
        acc[curr.group].push(curr);
        return acc;
    }, {} as Record<string, typeof AVAILABLE_TYPES>);

    const languageMap: Record<OutputFormatType, string> = {
        json: 'json',
        csv: 'plaintext',
        yaml: 'yaml',
        xml: 'xml',
        swift: 'swift',
        sql: 'sql',
    };

    const extensionMap: Record<OutputFormatType, string> = {
        json: 'json',
        csv: 'csv',
        yaml: 'yaml',
        xml: 'plist',
        swift: 'swift',
        sql: 'sql',
    };

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all active:scale-95 group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                            <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                <Database className="w-4 h-4 text-emerald-400" />
                            </div>
                            Mock Data Generator
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className={`text-xs font-medium text-emerald-400 flex items-center gap-2 transition-opacity duration-300 ${isGenerating ? 'opacity-100' : 'opacity-0'}`}>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Generating...
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-grow min-h-0">
                <TwoPaneLayout initialLeftWidth={30} minLeftWidth={20} maxLeftWidth={60}>
                    {/* Left Pane: Schema Builder */}
                    <div className="h-full flex flex-col gap-4 p-4 min-w-0">
                        {/* Configuration */}
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-4 flex-shrink-0">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                <Settings2 className="w-3.5 h-3.5" /> Configuration
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Rows */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">Rows</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="1000"
                                        value={count}
                                        onChange={(e) => setCount(Math.max(1, Math.min(1000, parseInt(e.target.value) || 0)))}
                                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all"
                                    />
                                </div>

                                {/* Seed */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">Seed (optional)</label>
                                    <input
                                        type="number"
                                        value={seed}
                                        onChange={(e) => setSeed(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all"
                                        placeholder="Random"
                                    />
                                </div>
                            </div>

                            {/* Output Format */}
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">Format</label>
                                <div className="flex p-1 bg-slate-900/50 border border-slate-700 rounded-lg">
                                    {OUTPUT_FORMATS.map(f => (
                                        <button
                                            key={f.value}
                                            onClick={() => setFormat(f.value)}
                                            className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${format === f.value
                                                ? 'bg-slate-700 text-white shadow-sm'
                                                : 'text-slate-400 hover:text-slate-300'
                                                }`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Schema Fields */}
                        <div className="flex-grow flex flex-col bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden min-h-0">
                            <div className="p-3 border-b border-slate-700/50 bg-slate-800/50 flex justify-between items-center">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Schema Fields</span>
                                <div className="flex items-center gap-1">
                                    {/* Presets */}
                                    <div className="relative">
                                        <button
                                            onClick={() => { setShowPresets(!showPresets); setShowLoadDialog(false); setShowSaveDialog(false); }}
                                            className={`p-1.5 rounded-md transition-colors ${showPresets ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                                            title="Load Preset"
                                        >
                                            <BookOpen size={14} />
                                        </button>

                                        {showPresets && (
                                            <div className="absolute right-0 top-full mt-1 z-50 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-2 w-64 max-h-80 overflow-auto custom-scrollbar">
                                                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1 mb-1">Presets</div>
                                                {SCHEMA_PRESETS.map(preset => (
                                                    <button
                                                        key={preset.id}
                                                        onClick={() => handleLoadPreset(preset)}
                                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                                                    >
                                                        <div className="text-xs font-medium text-white">{preset.name}</div>
                                                        <div className="text-[10px] text-slate-500">{preset.description}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Save */}
                                    <div className="relative">
                                        <button
                                            onClick={() => { setShowSaveDialog(!showSaveDialog); setShowPresets(false); setShowLoadDialog(false); }}
                                            className={`p-1.5 rounded-md transition-colors ${showSaveDialog ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                                            title="Save Schema"
                                        >
                                            <Save size={14} />
                                        </button>

                                        {showSaveDialog && (
                                            <div className="absolute right-0 top-full mt-1 z-50 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-3 w-64">
                                                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Save Schema</div>
                                                <input
                                                    type="text"
                                                    value={saveSchemaName}
                                                    onChange={e => setSaveSchemaName(e.target.value)}
                                                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-white focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none mb-2"
                                                    placeholder="Schema name..."
                                                    onKeyDown={e => e.key === 'Enter' && handleSaveSchema()}
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={handleSaveSchema}
                                                    className="w-full py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Load */}
                                    <div className="relative">
                                        <button
                                            onClick={() => { setShowLoadDialog(!showLoadDialog); setSavedSchemas(schemaStore.getAll()); setShowPresets(false); setShowSaveDialog(false); }}
                                            className={`p-1.5 rounded-md transition-colors ${showLoadDialog ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                                            title="Load Saved Schema"
                                        >
                                            <FolderOpen size={14} />
                                        </button>

                                        {showLoadDialog && (
                                            <div className="absolute right-0 top-full mt-1 z-50 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-2 w-64 max-h-80 overflow-auto custom-scrollbar">
                                                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1 mb-1">Saved Schemas</div>
                                                {savedSchemas.length === 0 ? (
                                                    <div className="px-3 py-4 text-center text-xs text-slate-500">No saved schemas yet</div>
                                                ) : (
                                                    savedSchemas.map(schema => (
                                                        <div key={schema.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-700/50 transition-colors group">
                                                            <button
                                                                onClick={() => handleLoadSchema(schema)}
                                                                className="flex-1 text-left"
                                                            >
                                                                <div className="text-xs font-medium text-white">{schema.name}</div>
                                                                <div className="text-[10px] text-slate-500">{schema.fields.length} fields · {new Date(schema.updatedAt).toLocaleDateString()}</div>
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteSchema(schema.id); }}
                                                                className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Import JSON */}
                                    <button
                                        onClick={() => { setShowImportDialog(!showImportDialog); setShowPresets(false); setShowSaveDialog(false); setShowLoadDialog(false); setImportError(''); }}
                                        className={`p-1.5 rounded-md transition-colors ${showImportDialog ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                                        title="Import from JSON"
                                    >
                                        <Upload size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Import Dialog */}
                            {showImportDialog && (
                                <div className="p-3 border-b border-slate-700/50 bg-slate-850/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Import from JSON</span>
                                        <button onClick={() => setShowImportDialog(false)} className="p-1 text-slate-400 hover:text-white rounded">
                                            <X size={12} />
                                        </button>
                                    </div>
                                    <textarea
                                        value={importJSON}
                                        onChange={e => setImportJSON(e.target.value)}
                                        className="w-full h-28 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-white font-mono focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none resize-none custom-scrollbar"
                                        placeholder='Paste a JSON object or array, e.g. {"name": "John", "age": 30}'
                                    />
                                    {importError && <div className="text-[10px] text-red-400 mt-1">{importError}</div>}
                                    <button
                                        onClick={handleImportJSON}
                                        className="mt-2 w-full py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                                    >
                                        Infer Schema from JSON
                                    </button>
                                </div>
                            )}

                            {/* Schema Fields List with DnD */}
                            <div className="flex-grow overflow-y-auto p-2 custom-scrollbar overflow-x-auto">
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                        <div className="flex flex-col min-w-full w-fit gap-2">
                                            {fields.map((field) => (
                                                <SchemaBuilderItem
                                                    key={field.id}
                                                    field={field}
                                                    onUpdate={updateField}
                                                    onRemove={removeField}
                                                    onAddChild={addChildField}
                                                    onClone={cloneField}
                                                    groupedTypes={groupedTypes}
                                                    isDraggable={true}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>

                            <div className="p-3 border-t border-slate-700/50 bg-slate-800/30">
                                <button
                                    onClick={addRootField}
                                    className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-slate-600 rounded-lg text-slate-400 text-sm hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all active:scale-95"
                                >
                                    <Plus size={16} /> Add Root Field
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Pane: Output */}
                    <div className="h-full p-4 min-w-0 flex flex-col gap-2">
                        {/* Output View Toggle */}
                        <div className="flex items-center justify-end flex-shrink-0">
                            <div className="flex p-0.5 bg-slate-800/50 border border-slate-700 rounded-lg">
                                <button
                                    onClick={() => setOutputView('code')}
                                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${outputView === 'code' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                                >
                                    <Code size={12} /> Code
                                </button>
                                <button
                                    onClick={() => setOutputView('table')}
                                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${outputView === 'table' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                                >
                                    <Table size={12} /> Table
                                </button>
                            </div>
                        </div>

                        {/* Output Content */}
                        <div className="flex-grow min-h-0">
                            {outputView === 'code' ? (
                                <CodeBlock
                                    content={output}
                                    language={languageMap[format]}
                                    fileName={`mock_data.${extensionMap[format]}`}
                                />
                            ) : (
                                <DataTablePreview output={output} format={format} />
                            )}
                        </div>
                    </div>
                </TwoPaneLayout>
            </div>
        </div>
    );
};
