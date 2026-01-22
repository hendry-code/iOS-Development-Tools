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

    const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const items = e.dataTransfer.items;
        if (items && items.length > 0) {
            const files: File[] = [];
            const queue: Promise<void>[] = [];

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind === 'file') {
                    const entry = item.webkitGetAsEntry?.();
                    if (entry) {
                        queue.push(scanEntry(entry, files));
                    } else {
                        const file = item.getAsFile();
                        if (file) files.push(file);
                    }
                }
            }

            await Promise.all(queue);

            // Convert to legacy FileList-like object for compatibility if strictly needed, 
            // but our parent component might be better off receiving an array of Files.
            // For now, let's cast or create a DataTransfer object to mimic FileList if we want to keep prop interface,
            // OR update the prop interface. The current interface is `(files: FileList) => void`.
            // It's better to update the interface to `(files: File[]) => void` but that requires changing parent.
            // Let's coerce it to a FileList-compatible structure or update the parent. 
            // Updating parent is safer for long term. But for minimal friction now, let's create a DataTransfer.

            const dataTransfer = new DataTransfer();
            files.forEach(f => dataTransfer.items.add(f));
            onFilesDropped(dataTransfer.files);
        } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFilesDropped(e.dataTransfer.files);
        }
    };

    const scanEntry = async (entry: any, files: File[]): Promise<void> => {
        if (entry.isFile) {
            return new Promise((resolve) => {
                entry.file((file: File) => {
                    files.push(file);
                    resolve();
                }, (err: any) => {
                    console.warn("Failed to read file entry", err);
                    resolve();
                });
            });
        } else if (entry.isDirectory) {
            const dirReader = entry.createReader();
            return new Promise((resolve) => {
                const readEntries = () => {
                    dirReader.readEntries(async (entries: any[]) => {
                        if (entries.length === 0) {
                            resolve();
                        } else {
                            await Promise.all(entries.map(e => scanEntry(e, files)));
                            readEntries(); // Continue reading (readEntries might not return all)
                        }
                    }, (err: any) => {
                        console.warn("Failed to read dir entry", err);
                        resolve();
                    });
                };
                readEntries();
            });
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
