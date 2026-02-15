import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearch } from '@/hooks/useDashboard';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: results } = useSearch(searchQuery);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleResultClick(result: { type: string; id: string }) {
    setShowResults(false);
    setSearchQuery('');
    const routes: Record<string, string> = {
      contact: '/contacts',
      company: '/companies',
      deal: '/pipeline',
      interaction: '/interactions',
    };
    const basePath = routes[result.type] || '/';
    navigate(`${basePath}/${result.id}`);
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="relative w-96" ref={searchRef}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search contacts, companies, deals..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => searchQuery && setShowResults(true)}
        />
        {showResults && results && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto rounded-md border bg-white shadow-lg">
            {results.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                onClick={() => handleResultClick(result)}
              >
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
                    result.type === 'contact'
                      ? 'bg-blue-100 text-blue-700'
                      : result.type === 'company'
                        ? 'bg-purple-100 text-purple-700'
                        : result.type === 'deal'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {result.type}
                </span>
                <div>
                  <p className="text-sm font-medium">{result.name}</p>
                  <p className="text-xs text-gray-500">{result.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button className="relative rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
