import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { SearchBar } from './components/SearchBar';
import { FileList } from './components/FileList';
import { FolderTree, Files } from 'lucide-react';
import { uploadPDF, searchDocuments } from './services/api';
import { ProcessedFile } from './utils/fileProcessing';
import { getFolderStructure } from './services/api';
import { FaFolder, FaFolderOpen, FaFile } from 'react-icons/fa';

function App() {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ProcessedFile[]>([]);
  const [folderStructure, setFolderStructure] = useState<any>(null);
  const [openFolders, setOpenFolders] = useState<{ [key: string]: boolean }>({});
  const [openSummaryId, setOpenSummaryId] = useState<string | null>(null);

  const toggleFolder = (path: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };
  
  useEffect(() => {
    const fetchFolderStructure = async () => {
      try {
        const data = await getFolderStructure();
        setFolderStructure(data);
      } catch (error) {
        console.error('Error fetching folder structure:', error);
        // Fehlerbehandlung hinzufügen
      }
    };

    fetchFolderStructure();
  }, []);

  const handleFileSelect = async (fileList: FileList) => {
    setIsLoading(true);
    try {
      const uploadPromises = Array.from(fileList).map(async (file) => {
        const result = await uploadPDF(file);
        return {
          id: result.id,
          name: file.name,
          suggestedFolder: result.suggestedFolder,
          dateAdded: "" + new Date(),
          content: result.content,
          path: result.path
        };
      });

      const newFiles = await Promise.all(uploadPromises);
      console.log("app ",files);
      setFiles(prev => [...prev, ...newFiles.map(file => ({
        ...file,
        path: file.path
      }))]);
    } catch (error) {
      console.error('Error uploading files:', error);
      // Here you would typically show an error message to the user
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);
      const results = await searchDocuments(query);
      console.log("app search ",results);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching documents:', error);
      // Here you would typically show an error message to the user
    } finally {
      setIsLoading(false);
    }
  };

  const truncateFileName = (fileName: string, maxLength: number): string => {
    if (fileName.length <= maxLength) {
      return fileName;
    }
    const partLength = Math.floor((maxLength - 3) / 2);
    const start = fileName.substring(0, partLength);
    const end = fileName.substring(fileName.length - partLength);
    return `${start}...${end}`;
  };
  

  // Fügen Sie diese Funktion innerhalb Ihrer App-Komponente hinzu
  const renderFolderStructure = (folders: any, path: string = '') => {
    return (
      <ul>
        {Object.keys(folders).map((key) => {
          if (key === 'files') {
            return folders[key].map((fileName: string) => (
              <li
                key={fileName}
                className="flex items-center p-1 hover:bg-gray-100 rounded cursor-pointer"
                title={fileName}
              >
                <FaFile className="text-blue-500 mr-2" />
                <span>{truncateFileName(fileName, 20)}</span>
              </li>
            ));
          } else {
            const currentPath = path ? `${path}/${key}` : key;
            const isOpen = openFolders[currentPath];
            return (
              <li key={currentPath}>
                <div
                  className={`flex items-center p-1 rounded cursor-pointer ${
                    isOpen ? 'bg-gray-200' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => toggleFolder(currentPath)}
                >
                  {isOpen ? (
                    <FaFolderOpen className="text-yellow-500 mr-2" />
                  ) : (
                    <FaFolder className="text-yellow-500 mr-2" />
                  )}
                  <span className="font-semibold">{key}</span>
                </div>
                {isOpen && (
                  <div className="ml-4">
                    {renderFolderStructure(folders[key], currentPath)}
                  </div>
                )}
              </li>
            );
          }
        })}
      </ul>
    );
  };
  

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <Files className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900">PDF Scanner & Organizer</h1>
          </div>
          <SearchBar onSearch={handleSearch} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {searchResults.length > 0 ? 'Suchergebnisse' : 'Kürzlich hinzugefügt'}
              </h2>
              <FileList
  files={searchResults.length > 0 ? searchResults : files}
  openSummaryId={openSummaryId}
  setOpenSummaryId={setOpenSummaryId}
/>            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm h-fit">
  <div className="flex items-center space-x-2 mb-4">
    <FolderTree className="w-5 h-5 text-blue-500" />
    <h2 className="text-lg font-semibold text-gray-900">Ordnerstruktur</h2>
  </div>
  <div className="text-sm text-gray-600">
    {folderStructure ? (
      renderFolderStructure(folderStructure)
    ) : (
      <p>Lade Ordnerstruktur...</p>
    )}
  </div>
</div>

        </div>
      </div>
    </div>
  );
}

export default App;