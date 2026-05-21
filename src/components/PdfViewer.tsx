import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ExternalLink } from 'lucide-react';

// Import react-pdf styles
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the worker using the local pdfjs-dist package for reliability in Vite
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfViewerProps {
  file: File | string;
  className?: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ file, className }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  return (
    <div className={`flex flex-col h-full bg-gray-100 rounded-xl overflow-hidden ${className}`}>
      {/* Controls */}
      <div className="bg-white border-b border-gray-200 p-2 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
            disabled={pageNumber <= 1}
            className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-gray-600 min-w-[60px] text-center">
            {pageNumber} / {numPages || '--'}
          </span>
          <button
            onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages || 1))}
            disabled={pageNumber >= (numPages || 1)}
            className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(prev => Math.max(prev - 0.2, 0.5))}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-gray-600 w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(prev => Math.min(prev + 0.2, 2.0))}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PDF Document */}
      <div className="flex-1 overflow-auto p-4 flex justify-center custom-scrollbar">
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-2" />
              <p className="text-xs font-bold text-gray-500">Loading PDF...</p>
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-3">
                <ExternalLink className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-gray-900">Unable to preview PDF</p>
              <p className="text-xs text-gray-500 mt-1">This might be due to security restrictions. Please use the "Open PDF" button below.</p>
            </div>
          }
        >
          <Page 
            pageNumber={pageNumber} 
            scale={scale}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="shadow-lg"
          />
        </Document>
      </div>
    </div>
  );
};
