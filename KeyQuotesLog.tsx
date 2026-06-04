'use client';

import { useState } from 'react';
import { BookQuote } from '../types/arcbuddy';

interface KeyQuotesLogProps {
  quotesList: BookQuote[];
  onAddQuote: (text: string, page: string) => Promise<void>;
  onRemoveQuote: (id: string) => Promise<void>;
}

export function KeyQuotesLog({ quotesList, onAddQuote, onRemoveQuote }: KeyQuotesLogProps) {
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newQuotePage, setNewQuotePage] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuoteText.trim()) return;

    await onAddQuote(newQuoteText.trim(), newQuotePage.trim());
    setNewQuoteText('');
    setNewQuotePage('');
  };

  const handleCopyToClipboard = async (quote: BookQuote) => {
    const pageCitation = quote.page ? ` (p. ${quote.page})` : '';
    const fullText = `"${quote.text}"${pageCitation}`;

    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedId(quote.id);
      setTimeout(() => setCopiedId(null), 2000); // Reset icon checkmark after 2 seconds
    } catch (err) {
      console.error('Failed to copy text to clipboard: ', err);
    }
  };

  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 lg:col-span-1 h-full flex flex-col">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Key Quotes Log
        </h4>
        <p className="text-[11px] text-slate-400">Capture lines for your reviews.</p>
      </div>

      {/* Quote Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          rows={3}
          placeholder="Type or paste a book quote..."
          value={newQuoteText}
          onChange={(e) => setNewQuoteText(e.target.value)}
          className="w-full text-xs p-2 border border-slate-300 rounded bg-white focus:outline-none focus:border-indigo-500 text-slate-900 placeholder-slate-400 font-medium"
        />
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Page #"
            value={newQuotePage}
            onChange={(e) => setNewQuotePage(e.target.value)}
            className="w-20 text-xs p-1.5 border border-slate-300 rounded bg-white focus:outline-none focus:border-indigo-500 text-slate-900 placeholder-slate-400 font-medium"
          />
          <button
            type="submit"
            className="flex-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium py-1.5 px-3 rounded transition shadow-2xs"
          >
            Log Quote
          </button>
        </div>
      </form>

      {/* Active Quotes Feed List */}
      <div className="space-y-2 overflow-y-auto max-h-[260px] flex-1 pr-1 custom-scrollbar">
        {quotesList.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center pt-4">No quotes saved yet.</p>
        ) : (
          quotesList.map((quote) => (
            <div
              key={quote.id}
              className="group/item bg-white p-2.5 rounded border border-slate-200 shadow-2xs relative flex flex-col justify-between"
            >
              <p className="text-xs text-slate-700 italic pr-12 font-medium break-words whitespace-pre-wrap">
                "{quote.text}"
              </p>
              
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                <span>{quote.page ? `Page ${quote.page}` : 'No page ref'}</span>
                
                {/* Actions Panel */}
                <div className="flex items-center gap-2">
                  {/* Copy to Clipboard Button */}
                  <button
                    type="button"
                    onClick={() => handleCopyToClipboard(quote)}
                    title="Copy quote for review"
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition"
                  >
                    {copiedId === quote.id ? '✅ Copied' : '📋 Copy'}
                  </button>

                  {/* Delete Quote Button */}
                  <button
                    type="button"
                    onClick={() => onRemoveQuote(quote.id)}
                    title="Delete quote"
                    className="p-1 hover:bg-red-50 rounded text-slate-300 hover:text-red-500 transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}