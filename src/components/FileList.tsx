import React from 'react';
import { File, Folder } from 'lucide-react';
import {ProcessedFile} from '../utils/fileProcessing'

interface FileListProps {
  files: ProcessedFile[];
  openSummaryId: string | null;
  setOpenSummaryId: React.Dispatch<React.SetStateAction<string | null>>;
}


export const FileList: React.FC<FileListProps> = ({ files, openSummaryId, setOpenSummaryId }) => {

  const toggleSummary = (id: string) => {
    setOpenSummaryId(openSummaryId === id ? null : id);
  };
  console.log(files);
  return (
    <div className="w-full">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex flex-col items-start p-4 mb-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-4">
              <File className="w-6 h-6 text-blue-500" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">{file.name}</h3>
                <p className="text-xs text-gray-500">
                  Hinzugefügt am {new Date(file.dateAdded).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                <Folder className="w-4 h-4 mr-1" />
                {file.suggestedFolder}
              </span>
            </div>
          </div>
          <button onClick={() => toggleSummary(file.id)} className="mt-2 text-blue-500">
            {openSummaryId === file.id ? 'Zusammenfassung schließen' : 'Zusammenfassung öffnen'}
          </button>
          {openSummaryId === file.id && (
            <div className="mt-2 p-2 border rounded bg-gray-100">
              <p>{file.content}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}