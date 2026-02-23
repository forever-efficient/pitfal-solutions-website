'use client';

import { useState, useCallback } from 'react';
import { adminImages } from '@/lib/api';

interface DashboardUploaderProps {
  onUploaded: () => void;
}

type FileStatus = 'uploading' | 'done' | 'error';

interface FileEntry {
  id: string;
  name: string;
  status: FileStatus;
}

export function DashboardUploader({ onUploaded }: DashboardUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<FileEntry[]>([]);

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const accepted = Array.from(fileList).filter(f =>
        /\.(jpg|jpeg|png)$/i.test(f.name)
      );
      if (accepted.length === 0) return;

      const entries: FileEntry[] = accepted.map(f => ({
        id: `${Date.now()}-${Math.random()}`,
        name: f.name,
        status: 'uploading',
      }));

      setFiles(prev => [...prev, ...entries]);

      let anyUploaded = false;
      for (const { file, id } of accepted.map((file, i) => ({ file, id: entries[i]!.id }))) {
        try {
          const { uploadUrl } = await adminImages.getUploadUrl(
            file.name,
            file.type || 'image/jpeg'
          );
          await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type || 'image/jpeg' },
          });
          setFiles(prev => prev.map(e => e.id === id ? { ...e, status: 'done' } : e));
          anyUploaded = true;
        } catch (error) {
          console.error('Upload failed for file:', file.name, error);
          setFiles(prev => prev.map(e => e.id === id ? { ...e, status: 'error' } : e));
        }
      }

      if (anyUploaded) onUploaded();
    },
    [onUploaded]
  );

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6">
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">Upload Images</h2>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver ? 'border-primary-400 bg-primary-50' : 'border-neutral-300'
          }`}
      >
        <input
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
          id="dashboard-upload"
        />
        <label htmlFor="dashboard-upload" className="cursor-pointer">
          <svg
            className="w-10 h-10 mx-auto text-neutral-400 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm text-neutral-600">
            Drag & drop JPG or PNG files, or click to browse
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            Images go directly to the ready queue below
          </p>
        </label>
      </div>

      {/* Per-file upload progress */}
      {files.length > 0 && (
        <ul className="mt-4 space-y-1">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 text-sm">
              {f.status === 'uploading' && (
                <span className="inline-block w-3 h-3 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
              )}
              {f.status === 'done' && (
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {f.status === 'error' && (
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className={`truncate ${f.status === 'error' ? 'text-red-600' : 'text-neutral-700'}`}>
                {f.name}
              </span>
              {f.status === 'error' && (
                <span className="text-red-500 text-xs shrink-0">Failed</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
