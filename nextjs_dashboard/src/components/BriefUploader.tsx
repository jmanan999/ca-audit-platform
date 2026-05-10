import React, { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { auditsAPI } from '@/lib/api';
import { VerificationItem } from '@/lib/store';

interface Props {
  auditId: number;
  onItemsCreated: (items: VerificationItem[]) => void;
}

type State = 'idle' | 'uploading' | 'success' | 'error';

export default function BriefUploader({ auditId, onItemsCreated }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState('');
  const [dragging, setDragging] = useState(false);

  const ACCEPTED = '.xlsx,.xls,.pdf,.docx,.doc,.csv,.txt';

  const handleFile = async (file: File) => {
    setState('uploading');
    setMessage('');
    try {
      const res = await auditsAPI.parseBrief(auditId, file);
      const created: any[] = res.data.items_created ?? [];
      onItemsCreated(created as VerificationItem[]);
      if (res.data.warning) {
        setState('error');
        setMessage(res.data.warning);
      } else {
        setState('success');
        setMessage(`${created.length} verification item${created.length !== 1 ? 's' : ''} created from "${file.name}"`);
      }
    } catch (err: any) {
      setState('error');
      setMessage(err.response?.data?.detail ?? 'Upload failed. Please try again.');
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={onInputChange}
        className="hidden"
      />

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => state !== 'uploading' && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-blue-400 bg-blue-50'
            : state === 'uploading'
            ? 'border-blue-300 bg-blue-50 cursor-not-allowed'
            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
        }`}
      >
        {state === 'uploading' ? (
          <div className="flex flex-col items-center gap-3">
            <Loader className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm font-medium text-blue-700">Parsing document with AI…</p>
            <p className="text-xs text-gray-500">Extracting verification items</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">
                Drop your audit brief here, or <span className="text-blue-600">browse</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Excel (.xlsx), PDF, Word (.docx), CSV — items extracted automatically
              </p>
            </div>
          </div>
        )}
      </div>

      {state === 'success' && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {message}
        </div>
      )}

      {state === 'error' && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {message}
        </div>
      )}
    </div>
  );
}
