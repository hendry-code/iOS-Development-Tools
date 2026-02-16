import React, { useState } from 'react';
import { SchemaField, AVAILABLE_TYPES, MockDataType } from '../services/mockDataGenerator';
import { Trash2, Plus, ChevronRight, ChevronDown, List, Copy, Settings2, GripVertical, X } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SchemaBuilderItemProps {
    field: SchemaField;
    onUpdate: (id: string, updates: Partial<SchemaField>) => void;
    onRemove: (id: string) => void;
    onAddChild: (parentId: string) => void;
    onClone: (field: SchemaField) => void;
    depth?: number;
    groupedTypes: Record<string, typeof AVAILABLE_TYPES>;
    isDraggable?: boolean;
}

// ─── Constraints Popover ─────────────────────────────────────────────────────

const ConstraintsPopover: React.FC<{
    field: SchemaField;
    onUpdate: (id: string, updates: Partial<SchemaField>) => void;
    onClose: () => void;
}> = ({ field, onUpdate, onClose }) => {
    const isNumeric = ['integer', 'float', 'amount'].includes(field.type);
    const isString = ['lorem', 'paragraph', 'name', 'firstName', 'lastName', 'company', 'jobTitle', 'address'].includes(field.type);
    const isDate = field.type === 'date';
    const isCustomList = field.type === 'customList';
    const showNullable = field.type !== 'object' && field.type !== 'array';
    const showUnique = field.type !== 'object' && field.type !== 'array' && field.type !== 'boolean';

    return (
        <div className="absolute top-full left-0 mt-1 z-50 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-4 min-w-[280px] max-w-[320px]"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Field Constraints</span>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors">
                    <X size={14} />
                </button>
            </div>

            <div className="flex flex-col gap-3">
                {isNumeric && (
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-1">Min</label>
                            <input
                                type="number"
                                value={field.min ?? ''}
                                onChange={e => onUpdate(field.id, { min: e.target.value ? parseFloat(e.target.value) : undefined })}
                                className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-white focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-1">Max</label>
                            <input
                                type="number"
                                value={field.max ?? ''}
                                onChange={e => onUpdate(field.id, { max: e.target.value ? parseFloat(e.target.value) : undefined })}
                                className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-white focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none"
                                placeholder="100"
                            />
                        </div>
                    </div>
                )}

                {field.type === 'float' && (
                    <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-1">Decimal Places</label>
                        <input
                            type="number"
                            min="0"
                            max="10"
                            value={field.precision ?? 2}
                            onChange={e => onUpdate(field.id, { precision: parseInt(e.target.value) || 2 })}
                            className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-white focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none"
                        />
                    </div>
                )}

                {isString && (
                    <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-1">Max Length</label>
                        <input
                            type="number"
                            min="1"
                            value={field.maxLength ?? ''}
                            onChange={e => onUpdate(field.id, { maxLength: e.target.value ? parseInt(e.target.value) : undefined })}
                            className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-white focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none"
                            placeholder="No limit"
                        />
                    </div>
                )}

                {isDate && (
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-1">From</label>
                            <input
                                type="date"
                                value={field.dateFrom ? field.dateFrom.split('T')[0] : ''}
                                onChange={e => onUpdate(field.id, { dateFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-white focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-1">To</label>
                            <input
                                type="date"
                                value={field.dateTo ? field.dateTo.split('T')[0] : ''}
                                onChange={e => onUpdate(field.id, { dateTo: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-white focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none"
                            />
                        </div>
                    </div>
                )}

                {isCustomList && (
                    <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-1">Values (comma separated)</label>
                        <input
                            type="text"
                            value={(field.customValues || []).join(', ')}
                            onChange={e => onUpdate(field.id, {
                                customValues: e.target.value.split(',').map(v => v.trim()).filter(Boolean)
                            })}
                            className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-white focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none"
                            placeholder="active, inactive, pending"
                        />
                    </div>
                )}

                {showNullable && (
                    <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-1">Nullable % (0 = never null)</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={field.nullablePercent ?? 0}
                            onChange={e => onUpdate(field.id, { nullablePercent: parseInt(e.target.value) || 0 })}
                            className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-white focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none"
                        />
                    </div>
                )}

                {showUnique && (
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={field.isUnique || false}
                            onChange={e => onUpdate(field.id, { isUnique: e.target.checked })}
                            className="rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500/50"
                        />
                        <span className="text-xs text-slate-400">Enforce Unique Values</span>
                    </label>
                )}
            </div>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const SchemaBuilderItem: React.FC<SchemaBuilderItemProps> = ({
    field,
    onUpdate,
    onRemove,
    onAddChild,
    onClone,
    depth = 0,
    groupedTypes,
    isDraggable = false,
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showConstraints, setShowConstraints] = useState(false);

    const isObject = field.type === 'object';
    const isArrayType = field.type === 'array';
    const hasChildren = isObject || isArrayType;
    const paddingLeft = `${depth * 1.5}rem`;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: field.id, disabled: !isDraggable });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    // Check if this field type has configurable constraints
    const hasConstraintOptions = ['integer', 'float', 'amount', 'lorem', 'paragraph', 'date',
        'customList', 'name', 'firstName', 'lastName', 'company', 'jobTitle', 'address'].includes(field.type)
        || field.type !== 'object' && field.type !== 'array'; // nullable & unique are available for all non-structural types

    return (
        <div className="flex flex-col gap-2" ref={setNodeRef} style={style}>
            <div
                className={`flex items-center gap-2 p-2 bg-slate-800 rounded-lg border border-slate-700 group hover:border-slate-600 transition-colors min-w-max relative ${isDragging ? 'shadow-lg ring-2 ring-emerald-500/30' : ''}`}
                style={{ marginLeft: paddingLeft }}
            >
                {/* Drag Handle */}
                {isDraggable && (
                    <div
                        className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 transition-colors"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical size={14} />
                    </div>
                )}

                {/* Collapse Toggle */}
                {hasChildren && (
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="w-4 h-4 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
                    >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </button>
                )}

                {/* Field Name */}
                <div className="flex-1 min-w-[140px]">
                    <input
                        type="text"
                        value={field.name}
                        onChange={(e) => onUpdate(field.id, { name: e.target.value })}
                        className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:text-white font-mono"
                        placeholder="field_name"
                    />
                </div>

                {/* Type Selector */}
                <div className="w-32 flex-shrink-0">
                    <select
                        value={field.type}
                        onChange={(e) => {
                            const newType = e.target.value as MockDataType;
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

                {/* Constraints Button */}
                {hasConstraintOptions && (
                    <button
                        onClick={() => setShowConstraints(!showConstraints)}
                        className={`p-1.5 rounded transition-colors ${showConstraints ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'}`}
                        title="Configure Constraints"
                    >
                        <Settings2 size={14} />
                    </button>
                )}

                {/* Add Child */}
                {hasChildren && (
                    <button
                        onClick={() => onAddChild(field.id)}
                        className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                        title="Add Child Field"
                    >
                        <Plus size={14} />
                    </button>
                )}

                {/* Clone */}
                <button
                    onClick={() => onClone(field)}
                    className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Clone Field"
                >
                    <Copy size={14} />
                </button>

                {/* Delete */}
                <button
                    onClick={() => onRemove(field.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Remove field"
                >
                    <Trash2 size={14} />
                </button>

                {/* Constraints Popover */}
                {showConstraints && (
                    <ConstraintsPopover
                        field={field}
                        onUpdate={onUpdate}
                        onClose={() => setShowConstraints(false)}
                    />
                )}
            </div>

            {/* Recursively render children */}
            {hasChildren && field.children && field.children.length > 0 && !isCollapsed && (
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
                            onClone={onClone}
                            depth={depth + 1}
                            groupedTypes={groupedTypes}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
