import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';
import { Document } from '@/lib/store';

interface Props {
  docs: Document[];
}

function formatDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function EvidenceGallery({ docs }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const open = (idx: number) => setLightboxIdx(idx);
  const close = () => setLightboxIdx(null);

  const prev = useCallback(() => {
    setLightboxIdx((i) => (i === null ? null : (i - 1 + docs.length) % docs.length));
  }, [docs.length]);

  const next = useCallback(() => {
    setLightboxIdx((i) => (i === null ? null : (i + 1) % docs.length));
  }, [docs.length]);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIdx, prev, next]);

  if (docs.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
        No evidence photos uploaded yet.
      </div>
    );
  }

  const isImage = (name: string) => /\.(jpe?g|png|gif|webp|heic)$/i.test(name);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {docs.map((doc, idx) => (
          <div
            key={doc.id}
            className="group relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 cursor-pointer"
            onClick={() => open(idx)}
          >
            {isImage(doc.file_name) ? (
              <img
                src={doc.file_path}
                alt={doc.file_name}
                className="w-full h-36 object-cover group-hover:opacity-90 transition-opacity"
              />
            ) : (
              <div className="w-full h-36 flex items-center justify-center text-gray-400 text-xs text-center p-2">
                {doc.file_name}
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-xs truncate">{doc.file_name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Metadata cards */}
      <div className="mt-4 space-y-2">
        {docs.map((doc) => (
          <div key={doc.id} className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
            <p className="font-medium text-gray-800 truncate mb-1">{doc.file_name}</p>
            {doc.executive_notes && (
              <p className="italic mb-1">"{doc.executive_notes}"</p>
            )}
            <div className="flex flex-wrap gap-3">
              {doc.device_timestamp && (
                <span className="flex items-center gap-1 text-gray-500">
                  <Clock className="w-3 h-3" />
                  {formatDate(doc.device_timestamp)}
                </span>
              )}
              {doc.latitude != null && doc.longitude != null && (
                <a
                  href={`https://www.google.com/maps?q=${doc.latitude},${doc.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MapPin className="w-3 h-3" /> View on Map
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={close}
        >
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 p-2 text-white hover:bg-white/10 rounded-full"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>

          <div className="max-w-5xl max-h-screen p-4" onClick={(e) => e.stopPropagation()}>
            {isImage(docs[lightboxIdx].file_name) ? (
              <img
                src={docs[lightboxIdx].file_path}
                alt={docs[lightboxIdx].file_name}
                className="max-h-[80vh] max-w-full object-contain rounded-lg"
              />
            ) : (
              <a
                href={docs[lightboxIdx].file_path}
                target="_blank"
                rel="noreferrer"
                className="text-white underline"
              >
                {docs[lightboxIdx].file_name}
              </a>
            )}
            <p className="text-white/60 text-xs text-center mt-2">
              {lightboxIdx + 1} / {docs.length} — {docs[lightboxIdx].file_name}
            </p>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 p-2 text-white hover:bg-white/10 rounded-full"
          >
            <ChevronRight className="w-7 h-7" />
          </button>

          <button
            onClick={close}
            className="absolute top-4 right-4 p-1.5 text-white hover:bg-white/10 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  );
}
