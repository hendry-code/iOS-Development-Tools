import React, { useState, DragEvent } from 'react';

interface DragDropZoneProps {
    onFilesDropped: (files: FileList) => void;
    children: React.ReactNode;
    className?: string;
    isDraggingClass?: string;
}

export const DragDropZone: React.FC<DragDropZoneProps> = ({
    onFilesDropped,
    children,
    className = "",
    isDraggingClass = "border-blue-500 bg-blue-500/10"
}) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        // Only cancel dragging if we're leaving the container itself, not entering a child
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;

        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFilesDropped(e.dataTransfer.files);
        }
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`${className} transition-all duration-200 ${isDragging ? isDraggingClass : ''}`}
        >
            {children}
        </div>
    );
};
