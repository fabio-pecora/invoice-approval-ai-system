'use client';

import { ChangeEvent, DragEvent, useRef, useState } from 'react';
import { FileList } from '@/components/file-list';

type UploadPanelProps = {
  title: string;
  description: string;
  multiple?: boolean;
  accept?: string;
  files: File[];
  onChange: (files: File[]) => void;
};

export function UploadPanel({
  title,
  description,
  multiple = false,
  accept = '.pdf',
  files,
  onChange,
}: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateFiles = (incomingFiles: File[]) => {
    if (!incomingFiles.length) {
      onChange([]);
      return;
    }

    if (multiple) {
      onChange(incomingFiles);
      return;
    }

    onChange([incomingFiles[0]]);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    updateFiles(selected);
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(event.dataTransfer.files || []).filter(
      (file) =>
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf'),
    );

    updateFiles(droppedFiles);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLLabelElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <section className="upload-panel">
      <div className="upload-header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <label
        className={`upload-box ${isDragging ? 'upload-box-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
        />

        <div className="upload-box-content">
          <div className="upload-box-title">
            {multiple ? 'Drag PDFs here or click to upload' : 'Drag PDF here or click to upload'}
          </div>

          <div className="upload-box-subtitle">
            {multiple
              ? 'You can add multiple PDF files'
              : 'Only one PDF file'}
          </div>
        </div>
      </label>

      <FileList files={files} />
    </section>
  );
}