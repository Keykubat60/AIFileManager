import React, { useCallback } from 'react';
import { Upload, FileUp, Loader2 } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (files: FileList) => void;
  isLoading: boolean;
}

export function FileUpload({ onFileSelect, isLoading }: FileUploadProps) {
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileSelect(files);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onFileSelect(e.target.files);
    }
  }, [onFileSelect]);

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="w-full p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors cursor-pointer bg-gray-50 hover:bg-gray-100"
    >
      <div className="flex flex-col items-center justify-center gap-4">
        {isLoading ? (
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        ) : (
          <Upload className="w-12 h-12 text-gray-400" />
        )}
        <div className="text-center">
          <p className="text-lg font-medium text-gray-700">
            {isLoading ? 'Verarbeite PDFs...' : 'PDFs hier ablegen'}
          </p>
          <p className="text-sm text-gray-500">oder</p>
          <label className="mt-2 inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 cursor-pointer">
            <FileUp className="w-4 h-4 mr-2" />
            Dateien auswählen
            <input
              type="file"
              className="hidden"
              accept=".pdf"
              multiple
              onChange={handleFileInput}
              disabled={isLoading}
            />
          </label>
        </div>
      </div>
    </div>
  );
}