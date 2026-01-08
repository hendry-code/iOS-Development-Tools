import React from 'react';
import { SchemaField, AVAILABLE_TYPES, MockDataType } from '../services/mockDataGenerator';
import { Trash2, Plus, ChevronRight, ChevronDown, List } from 'lucide-react';

interface SchemaBuilderItemProps {
    field: SchemaField;
    onUpdate: (id: string, updates: Partial<SchemaField>) => void;
    onRemove: (id: string) => void;
    onAddChild: (parentId: string) => void;
    depth?: number;
    groupedTypes: Record<string, typeof AVAILABLE_TYPES>;
}

export const SchemaBuilderItem: React.FC<SchemaBuilderItemProps> = ({
    field,
    onUpdate,
    onRemove,
    onAddChild,
    depth = 0,
    groupedTypes
}) => {
    const isObject = field.type === 'object';
    const isArrayType = field.type === 'array';
    const hasChildren = isObject || isArrayType;
    const paddingLeft = `${depth * 1.5}rem`;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg border border-slate-700 group hover:border-slate-600 transition-colors min-w-max" style={{ marginLeft: paddingLeft }}>
                {hasChildren && (
                    <div className="w-4 h-4 flex items-center justify-center text-slate-500">
                        {/* Always expanded for now, could add collapse state later */}
                        <ChevronDown size={14} />
                    </div>
                )}

                <div className="flex-1 min-w-[140px]">
                    <input
                        type="text"
                        value={field.name}
                        onChange={(e) => onUpdate(field.id, { name: e.target.value })}
                        className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:text-white font-mono"
                        placeholder="field_name"
                    />
                </div>

                <div className="w-32 flex-shrink-0">
                    <select
                        value={field.type}
                        onChange={(e) => {
                            const newType = e.target.value as MockDataType;
                            // If switching to object or array, ensure children array exists
                            const updates: Partial<SchemaField> = { type: newType };
                            if ((newType === 'object' || newType === 'array') && !field.children) {
                                updates.children = [];
                            }
                            if (newType === 'array' && !field.arrayCount) {
                                updates.arrayCount = 3;
                            }
                            onUpdate(field.id, updates);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                        {(Object.entries(groupedTypes) as [string, typeof AVAILABLE_TYPES][]).map(([group, types]) => (
                            <optgroup key={group} label={group}>
                                {types.map(t => (
                                    <option key={t.type} value={t.type}>{t.label}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>

                {/* Array Toggle */}
                <div className="flex items-center gap-1 bg-slate-900 rounded border border-slate-700 px-2 py-1 h-[26px]">
                    <div
                        className={`cursor-pointer ${(field.isArray || isArrayType) ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                        onClick={() => !isArrayType && onUpdate(field.id, { isArray: !field.isArray, arrayCount: field.arrayCount || 3 })}
                        title="Is List / Array"
                    >
                        <List size={14} />
                    </div>

                    {(field.isArray || isArrayType) && (
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={field.arrayCount || 3}
                            onChange={(e) => onUpdate(field.id, { arrayCount: parseInt(e.target.value) || 0 })}
                            className="w-8 bg-transparent text-xs text-center text-white focus:outline-none border-b border-transparent focus:border-emerald-500"
                            title="Array Count"
                        />
                    )}
                </div>

                {hasChildren && (
                    <button
                        onClick={() => onAddChild(field.id)}
                        className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                        title="Add Child Field"
                    >
                        <Plus size={14} />
                    </button>
                )}

                <button
                    onClick={() => onRemove(field.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Remove field"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Recursively render children */}
            {hasChildren && field.children && field.children.length > 0 && (
                <div className="flex flex-col gap-2 relative">
                    {/* Vertical line helper */}
                    <div
                        className="absolute bg-slate-800 w-px bottom-2 top-0"
                        style={{ left: `calc(${paddingLeft} + 1.25rem)` }}
                    />

                    {field.children.map(child => (
                        <SchemaBuilderItem
                            key={child.id}
                            field={child}
                            onUpdate={onUpdate}
                            onRemove={onRemove}
                            onAddChild={onAddChild}
                            depth={depth + 1}
                            groupedTypes={groupedTypes}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
