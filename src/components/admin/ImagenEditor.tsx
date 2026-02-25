'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { adminImagen, ImagenFile, ImagenJob } from '@/lib/api';
import { useToast } from '@/components/admin/Toast';
import { formatBytes } from '@/lib/utils';

type FileStatus = 'uploading' | 'done' | 'error';

interface FileEntry {
  id: string;
  name: string;
  status: FileStatus;
}

const RAW_EXTENSIONS = /\.(cr2|cr3|nef|arw|dng|raf)$/i;
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|cr2|cr3|nef|arw|dng|raf)$/i;

const STATUS_COLORS: Record<ImagenJob['status'], string> = {
  queued: 'bg-yellow-100 text-yellow-800',
  uploading: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  exporting: 'bg-cyan-100 text-cyan-800',
  downloading: 'bg-indigo-100 text-indigo-800',
  complete: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export function ImagenEditor() {
  const { showSuccess, showError } = useToast();

  // Upload state
  const [dragOver, setDragOver] = useState(false);
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [uploads, setUploads] = useState<ImagenFile[]>([]);
  const [processingAll, setProcessingAll] = useState(false);

  // Jobs state
  const [jobs, setJobs] = useState<ImagenJob[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Edited state
  const [edited, setEdited] = useState<ImagenFile[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // =========================================================================
  // Data fetching
  // =========================================================================

  const loadUploads = useCallback(async () => {
    try {
      const { files } = await adminImagen.listUploads();
      setUploads(files);
    } catch {
      // silent — will show empty state
    }
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const { jobs: j } = await adminImagen.listJobs();
      setJobs(j);
    } catch {
      // silent
    }
  }, []);

  const loadEdited = useCallback(async () => {
    try {
      const { files } = await adminImagen.listEdited();
      setEdited(files);
    } catch {
      // silent
    }
  }, []);

  const loadAll = useCallback(() => {
    loadUploads();
    loadJobs();
    loadEdited();
  }, [loadUploads, loadJobs, loadEdited]);

  // Initial load
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Poll when active jobs exist
  useEffect(() => {
    const hasActive = jobs.some((j) =>
      ['queued', 'uploading', 'processing', 'exporting', 'downloading'].includes(j.status)
    );

    if (hasActive && !pollRef.current) {
      pollRef.current = setInterval(() => {
        loadJobs();
        loadEdited();
      }, 10_000);
    } else if (!hasActive && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [jobs, loadJobs, loadEdited]);

  // =========================================================================
  // Upload handling
  // =========================================================================

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const accepted = Array.from(fileList).filter((f) =>
        IMAGE_EXTENSIONS.test(f.name)
      );
      if (accepted.length === 0) {
        showError('No supported files selected (JPG, PNG, or RAW)');
        return;
      }

      const entries: FileEntry[] = accepted.map((f) => ({
        id: `${Date.now()}-${Math.random()}`,
        name: f.name,
        status: 'uploading',
      }));

      setFileEntries((prev) => [...prev, ...entries]);

      let anyUploaded = false;
      for (const { file, id } of accepted.map((file, i) => ({
        file,
        id: entries[i]!.id,
      }))) {
        try {
          const contentType = RAW_EXTENSIONS.test(file.name)
            ? 'application/octet-stream'
            : file.type || 'image/jpeg';
          const { uploadUrl } = await adminImagen.getUploadUrl(
            file.name,
            contentType
          );
          await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': contentType },
          });
          setFileEntries((prev) =>
            prev.map((e) => (e.id === id ? { ...e, status: 'done' } : e))
          );
          anyUploaded = true;
        } catch (error) {
          console.error('Upload failed:', file.name, error);
          setFileEntries((prev) =>
            prev.map((e) => (e.id === id ? { ...e, status: 'error' } : e))
          );
        }
      }

      if (anyUploaded) {
        showSuccess('Files uploaded successfully');
        loadUploads();
      }
    },
    [showSuccess, showError, loadUploads]
  );

  // =========================================================================
  // Process all uploads
  // =========================================================================

  const handleProcessAll = useCallback(async () => {
    if (uploads.length === 0) return;
    setProcessingAll(true);
    try {
      const rawKeys = uploads.map((f) => f.key);
      await adminImagen.process(rawKeys);
      showSuccess('AI processing job started');
      loadJobs();
      loadUploads();
    } catch {
      showError('Failed to start processing');
    } finally {
      setProcessingAll(false);
    }
  }, [uploads, showSuccess, showError, loadJobs, loadUploads]);

  // =========================================================================
  // Edited gallery actions
  // =========================================================================

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedKeys.size === edited.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(edited.map((f) => f.key)));
    }
  };

  const handleApprove = useCallback(async () => {
    if (selectedKeys.size === 0) return;
    setApproving(true);
    try {
      const { approved } = await adminImagen.approve(Array.from(selectedKeys));
      showSuccess(`${approved} image(s) moved to Ready Queue`);
      setSelectedKeys(new Set());
      loadEdited();
    } catch {
      showError('Failed to approve images');
    } finally {
      setApproving(false);
    }
  }, [selectedKeys, showSuccess, showError, loadEdited]);

  const handleDeleteEdited = useCallback(async () => {
    if (selectedKeys.size === 0) return;
    setDeleting(true);
    try {
      const { deleted } = await adminImagen.deleteEdited(
        Array.from(selectedKeys)
      );
      showSuccess(`${deleted} image(s) deleted`);
      setSelectedKeys(new Set());
      loadEdited();
    } catch {
      showError('Failed to delete images');
    } finally {
      setDeleting(false);
    }
  }, [selectedKeys, showSuccess, showError, loadEdited]);

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">AI Editor</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Upload RAW or JPEG files, process with AI, then approve edited results
        </p>
      </div>

      {/* ================================================================= */}
      {/* Section 1: Upload Area */}
      {/* ================================================================= */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">
          Upload Files
        </h2>

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? 'border-primary-400 bg-primary-50'
              : 'border-neutral-300'
          }`}
        >
          <input
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.cr2,.cr3,.nef,.arw,.dng,.raf"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
            id="imagen-upload"
          />
          <label htmlFor="imagen-upload" className="cursor-pointer">
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
              Drag & drop RAW or JPEG/PNG files, or click to browse
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Supports CR2, CR3, NEF, ARW, DNG, RAF, JPG, PNG
            </p>
          </label>
        </div>

        {/* Per-file upload progress */}
        {fileEntries.length > 0 && (
          <ul className="mt-4 space-y-1">
            {fileEntries.map((f) => (
              <li key={f.id} className="flex items-center gap-2 text-sm">
                {f.status === 'uploading' && (
                  <span className="inline-block w-3 h-3 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                )}
                {f.status === 'done' && (
                  <svg
                    className="w-4 h-4 text-green-500 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                {f.status === 'error' && (
                  <svg
                    className="w-4 h-4 text-red-500 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
                <span
                  className={`truncate ${
                    f.status === 'error' ? 'text-red-600' : 'text-neutral-700'
                  }`}
                >
                  {f.name}
                </span>
                {f.status === 'error' && (
                  <span className="text-red-500 text-xs shrink-0">Failed</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Uploaded files grid */}
        {uploads.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-neutral-700">
                Uploaded Files ({uploads.length})
              </h3>
              <button
                onClick={handleProcessAll}
                disabled={processingAll}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processingAll ? 'Starting...' : 'Process All with AI'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {uploads.map((file) => (
                <div
                  key={file.key}
                  className="border border-neutral-200 rounded-lg p-2 text-center"
                >
                  {/\.(jpg|jpeg|png)$/i.test(file.filename) ? (
                    <img
                      src={file.url}
                      alt={file.filename}
                      className="w-full h-24 object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-24 bg-neutral-100 rounded flex items-center justify-center">
                      <span className="text-xs text-neutral-500 uppercase font-medium">
                        {file.filename.split('.').pop()}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-neutral-600 mt-1 truncate">
                    {file.filename}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {formatBytes(file.size)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* Section 2: Processing Status */}
      {/* ================================================================= */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            Processing Jobs
          </h2>
          {jobs.some((j) => j.status === 'failed' || j.status === 'complete') && (
            <button
              onClick={async () => {
                const clearable = jobs.filter(
                  (j) => j.status === 'failed' || j.status === 'complete'
                );
                if (clearable.length === 0) return;
                try {
                  await adminImagen.deleteJobs(clearable.map((j) => j.jobId));
                  setJobs((prev) =>
                    prev.filter(
                      (j) => j.status !== 'failed' && j.status !== 'complete'
                    )
                  );
                  showSuccess(`Cleared ${clearable.length} job(s)`);
                } catch {
                  showError('Failed to clear jobs');
                }
              }}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear Finished
            </button>
          )}
        </div>

        {jobs.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No processing jobs yet. Upload files and click &quot;Process All
            with AI&quot; to start.
          </p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.jobId}
                className="border border-neutral-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        STATUS_COLORS[job.status]
                      }`}
                    >
                      {job.status}
                    </span>
                    <span className="text-sm text-neutral-600">
                      {job.rawKeys.length} file(s)
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400">
                    {new Date(job.createdAt).toLocaleString()}
                  </span>
                </div>
                {job.completedAt && (
                  <p className="text-xs text-neutral-500">
                    Completed: {new Date(job.completedAt).toLocaleString()}
                  </p>
                )}
                {job.error && (
                  <p className="text-xs text-red-600 mt-1">{job.error}</p>
                )}
                {job.resultKeys && job.resultKeys.length > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    {job.resultKeys.length} result(s) generated
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* Section 3: Edited Gallery */}
      {/* ================================================================= */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            Edited Images ({edited.length})
          </h2>
          {edited.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                {selectedKeys.size === edited.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
              <button
                onClick={handleApprove}
                disabled={selectedKeys.size === 0 || approving}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {approving
                  ? 'Moving...'
                  : `Move to Ready Queue (${selectedKeys.size})`}
              </button>
              <button
                onClick={handleDeleteEdited}
                disabled={selectedKeys.size === 0 || deleting}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleting
                  ? 'Deleting...'
                  : `Delete Selected (${selectedKeys.size})`}
              </button>
            </div>
          )}
        </div>

        {edited.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No edited images yet. Processed results will appear here.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {edited.map((file) => {
              const isSelected = selectedKeys.has(file.key);
              return (
                <div
                  key={file.key}
                  onClick={() => toggleSelect(file.key)}
                  className={`relative border rounded-lg p-1 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-primary-500 ring-2 ring-primary-200'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <img
                    src={file.url}
                    alt={file.filename}
                    className="w-full h-32 object-cover rounded"
                  />
                  {/* Checkbox overlay */}
                  <div className="absolute top-2 left-2">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected
                          ? 'bg-primary-600 border-primary-600'
                          : 'bg-white/80 border-neutral-300'
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-600 mt-1 truncate px-1">
                    {file.filename}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
