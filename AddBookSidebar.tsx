'use client';

import { useState } from 'react';
import { Book } from '../types/arcbuddy';

interface AddBookSidebarProps {
  onSaveBook: (book: Book, initialPubUiDate?: string) => Promise<void>;
}

export function AddBookSidebar({ onSaveBook }: AddBookSidebarProps) {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Manual fallback toggle and fields
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualPublisher, setManualPublisher] = useState('');
  const [manualPubDate, setManualPubDate] = useState('');
  const [manualIsbn, setManualIsbn] = useState('');

  // Handle Google Books API Lookup
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setApiError(null);
    setSearchResults([]);

    // Your authenticated developer key to bypass public node restrictions
    const apiKey = 'AIzaSyALljrzgvFLXay8pItTk1AOTw6P2QD94Hw'; 

    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=5&key=${apiKey}`
      );
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please wait a moment before searching again, or switch to manual entry.");
        }
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.items) {
        setSearchResults(data.items);
      } else {
        setSearchResults([]);
        setApiError("No matching books discovered. Try manual creation below!");
      }
    } catch (err: any) {
      console.error("Google Books API failure tracker:", err);
      // Gracefully capture network-level "Failed to fetch" drops or extension blocks
      setApiError(err.message || "Network connection or request blocked by browser extensions. Please try manual entry below.");
    } finally {
      setSearching(false);
    }
  };

  // Handle saving from API item parse
  const handleSaveFromApi = async (volumeInfo: any) => {
    const bookData: Book = {
      title: volumeInfo.title,
      author: volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Unknown Author',
      isbn: volumeInfo.industryIdentifiers?.[0]?.identifier || 'N/A',
      cover_url: volumeInfo.imageLinks?.thumbnail || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=150',
      publisher: volumeInfo.publisher || 'Unknown Publisher'
    };

    let extractedPubDateUi = '';
    if (volumeInfo.publishedDate) {
      const parts = volumeInfo.publishedDate.split('-');
      if (parts.length === 3) {
        extractedPubDateUi = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else if (parts.length === 1) {
        extractedPubDateUi = `01/01/${parts[0]}`;
      }
    }

    await onSaveBook(bookData, extractedPubDateUi);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Handle manual submission commit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualAuthor.trim()) {
      alert("Title and Author fields are strictly mandatory.");
      return;
    }

    const bookData: Book = {
      title: manualTitle.trim(),
      author: manualAuthor.trim(),
      publisher: manualPublisher.trim() || 'Unknown Publisher',
      isbn: manualIsbn.trim() || 'N/A',
      cover_url: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=150'
    };

    await onSaveBook(bookData, manualPubDate.trim());

    setManualTitle('');
    setManualAuthor('');
    setManualPublisher('');
    setManualPubDate('');
    setManualIsbn('');
    setIsManualMode(false);
  };

  return (
    <div className="md:col-span-1 space-y-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        
        {/* Header Toggle Section */}
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            {isManualMode ? 'Add Book Manually' : 'Search & Add ARC'}
          </h2>
          <button
            type="button"
            onClick={() => {
              setIsManualMode(!isManualMode);
              setApiError(null);
            }}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition"
          >
            {isManualMode ? 'Search instead' : 'Add Manually'}
          </button>
        </div>

        {/* MODE A: Google Lookup System */}
        {!isManualMode && (
          <div className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Title, author, or ISBN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 border border-slate-300 p-2 text-xs rounded bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
              />
              <button
                type="submit"
                disabled={searching}
                className="bg-indigo-600 text-white text-xs px-3 py-2 rounded font-medium hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </form>

            {/* Graceful API Error Callout banner */}
            {apiError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-md text-xs text-rose-700 space-y-1">
                <p className="font-semibold">Search Interrupted</p>
                <p className="text-[11px] leading-relaxed opacity-90">{apiError}</p>
              </div>
            )}

            {/* Search results array mapping */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {searchResults.map((book) => {
                const info = book.volumeInfo;
                const cover = info.imageLinks?.thumbnail || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=120';
                return (
                  <div
                    key={book.id}
                    className="flex gap-2.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs items-start"
                  >
                    <img src={cover} alt="thumbnail" className="w-10 h-14 object-cover rounded shadow-3xs bg-white shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 line-clamp-1 leading-tight">{info.title}</h4>
                      <p className="text-slate-500 truncate text-[11px] mt-0.5">By {info.authors ? info.authors.join(', ') : 'Unknown'}</p>
                      <p className="text-slate-400 text-[10px] truncate">🏢 {info.publisher || 'Unknown Pub'}</p>
                      <button
                        type="button"
                        onClick={() => handleSaveFromApi(info)}
                        className="mt-1.5 bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 font-bold px-2 py-1 rounded text-[10px] transition shadow-3xs"
                      >
                        Add Book
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MODE B: Manual Backup Input Form */}
        {isManualMode && (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-0.5">Book Title *</label>
              <input
                type="text"
                required
                placeholder="Title"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                className="w-full border border-slate-300 p-2 text-xs rounded bg-white text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-0.5">Author Name *</label>
              <input
                type="text"
                required
                placeholder="Author"
                value={manualAuthor}
                onChange={(e) => setManualAuthor(e.target.value)}
                className="w-full border border-slate-300 p-2 text-xs rounded bg-white text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-0.5">Publisher</label>
              <input
                type="text"
                placeholder="Publisher"
                value={manualPublisher}
                onChange={(e) => setManualPublisher(e.target.value)}
                className="w-full border border-slate-300 p-2 text-xs rounded bg-white text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-0.5">Pub Date (dd/mm/yyyy)</label>
                <input
                  type="text"
                  placeholder="e.g. 24/11/2026"
                  value={manualPubDate}
                  onChange={(e) => setManualPubDate(e.target.value)}
                  className="w-full border border-slate-300 p-2 text-xs rounded bg-white text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-0.5">ISBN (Optional)</label>
                <input
                  type="text"
                  placeholder="ISBN"
                  value={manualIsbn}
                  onChange={(e) => setManualIsbn(e.target.value)}
                  className="w-full border border-slate-300 p-2 text-xs rounded bg-white text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 rounded transition shadow-2xs mt-2"
            >
              Add Book
            </button>
          </form>
        )}

      </div>
    </div>
  );
}