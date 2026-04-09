'use client';

import { ChangeEvent } from 'react';

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
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    onChange(selected);
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <label className="upload-box">
        <input type="file" accept={accept} multiple={multiple} onChange={handleChange} />
        <span>{multiple ? 'Choose PDF files' : 'Choose PDF file'}</span>
      </label>
      <FileList files={files} />
    </section>
  );
}
