import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, RefreshCw, Database, Settings2 } from 'lucide-react';
import { generateMockData, SchemaField, AVAILABLE_TYPES, MockDataType } from '../services/mockDataGenerator';
import { CodeBlock } from './CodeBlock';
import { SchemaBuilderItem } from './SchemaBuilderItem';
import { TwoPaneLayout } from './TwoPaneLayout';

interface MockDataGeneratorViewProps {
    onBack: () => void;
}

export const MockDataGeneratorView: React.FC<MockDataGeneratorViewProps> = ({ onBack }) => {
    // Initial schema with some nesting example
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
    const [count, setCount] = useState<number>(10);
    const [format, setFormat] = useState<'json' | 'csv'>('json');
    const [output, setOutput] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Initial generation & reactive updates
    useEffect(() => {
        const timer = setTimeout(() => {
            handleGenerate();
        }, 500); // Debounce for 500ms

        return () => clearTimeout(timer);
    }, [fields, count, format]);

    const handleGenerate = () => {
        setIsGenerating(true);
        // data generation is synchronous but we might want to defer it to next tick to not block UI
        setTimeout(() => {
            const data = generateMockData(fields, count, format);
            setOutput(data);
            setIsGenerating(false);
        }, 0);
    };

    // --- Tree Helpers ---

    // Find and update a node in the tree
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
                return {
                    ...field,
                    children: updateFieldRecursive(field.children, targetId, updates)
                };
            }
            return field;
        });
    };

    // Find and remove a node from the tree
    const removeFieldRecursive = (currentFields: SchemaField[], targetId: string): SchemaField[] => {
        return currentFields
            .filter(field => field.id !== targetId)
            .map(field => {
                if (field.children) {
                    return {
                        ...field,
                        children: removeFieldRecursive(field.children, targetId)
                    };
                }
                return field;
            });
    };

    // Find a parent node and add a child to it
    const addChildRecursive = (currentFields: SchemaField[], parentId: string, newChild: SchemaField): SchemaField[] => {
        return currentFields.map(field => {
            if (field.id === parentId) {
                return {
                    ...field,
                    children: [...(field.children || []), newChild]
                };
            }
            if (field.children) {
                return {
                    ...field,
                    children: addChildRecursive(field.children, parentId, newChild)
                };
            }
            return field;
        });
    };

    // --- Actions ---

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

    const groupedTypes = AVAILABLE_TYPES.reduce((acc, curr) => {
        if (!acc[curr.group]) acc[curr.group] = [];
        acc[curr.group].push(curr);
        return acc;
    }, {} as Record<string, typeof AVAILABLE_TYPES>);

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
                    {/* Removed Generate Button for functionality "Instantly Reflected" */}
                    <div className={`text-xs font-medium text-emerald-400 flex items-center gap-2 transition-opacity duration-300 ${isGenerating ? 'opacity-100' : 'opacity-0'}`}>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Generating...
                    </div>
                </div>
            </header>

            {/* Content using Resizable Layout */}
            <div className="flex-grow min-h-0">
                <TwoPaneLayout initialLeftWidth={30} minLeftWidth={20} maxLeftWidth={60}>
                    {/* Left Pane: Schema Builder */}
                    <div className="h-full flex flex-col gap-4 p-4 min-w-0">
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-4 flex-shrink-0">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                <Settings2 className="w-3.5 h-3.5" /> Configuration
                            </div>

                            <div className="grid grid-cols-2 gap-4">
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
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">Format</label>
                                    <div className="flex p-1 bg-slate-900/50 border border-slate-700 rounded-lg">
                                        <button
                                            onClick={() => setFormat('json')}
                                            className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${format === 'json' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                                        >
                                            JSON
                                        </button>
                                        <button
                                            onClick={() => setFormat('csv')}
                                            className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${format === 'csv' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                                        >
                                            CSV
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-grow flex flex-col bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden min-h-0">
                            <div className="p-3 border-b border-slate-700/50 bg-slate-800/50 flex justify-between items-center">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Schema Fields</span>
                            </div>

                            <div className="flex-grow overflow-y-auto p-2 custom-scrollbar overflow-x-auto">
                                <div className="flex flex-col min-w-full w-fit gap-2">
                                    {fields.map((field) => (
                                        <SchemaBuilderItem
                                            key={field.id}
                                            field={field}
                                            onUpdate={updateField}
                                            onRemove={removeField}
                                            onAddChild={addChildField}
                                            groupedTypes={groupedTypes}
                                        />
                                    ))}
                                </div>
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
                    <div className="h-full p-4 min-w-0">
                        <CodeBlock
                            content={output}
                            language={format === 'json' ? 'json' : 'plaintext'}
                            fileName={`mock_data.${format}`}
                        />
                    </div>
                </TwoPaneLayout>
            </div>
        </div>
    );
};
