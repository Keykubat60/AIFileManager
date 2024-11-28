import  { useRef } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="relative w-full max-w-2xl">
      <input
        type="text"
        placeholder="PDFs durchsuchen..."
        ref={inputRef}
        className="w-full px-4 py-2 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
      />
      <button className="absolute right-3 top-1/2 transform -translate-y-1/2">
        <Search className="text-gray-400 w-4 h-4" onClick={() => onSearch(inputRef.current?.value ?? '')} />
      </button>
    </div>
  );
}