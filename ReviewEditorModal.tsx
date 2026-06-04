'use client';

import { useState } from 'react';
import { Book, Reminder } from '../types/arcbuddy';

interface ReviewEditorModalProps {
  book: Book;
  initialReminders: Reminder[];
  onClose: () => void;
  onSave: (updatedBook: Book, updatedReminders: Reminder[]) => Promise<void>;
}

// Platforms matching your distribution reminders
const AVAILABLE_PLATFORMS = ['NetGalley', 'Amazon', 'Goodreads', 'Instagram', 'Blog', 'Waterstones'];

export function ReviewEditorModal({ book, initialReminders, onClose, onSave }: ReviewEditorModalProps) {
  const [arcSource, setArcSource] = useState<Book['arc_source']>(book.arc_source || '');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(book.intended_platforms || []);
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders || []);

  // Sync all distribution reminder dates at once
  const handleSyncAllDates = () => {
    const targetDate = prompt("Enter the new live date for all platforms (dd/mm/yyyy or yyyy-mm-dd):");
    if (!targetDate) return; // User cancelled

    const updatedReminders = reminders.map((reminder: Reminder) => ({
      ...reminder,
      deadline_date: targetDate
    }));
    
    setReminders(updatedReminders);
  };

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleSaveSubmit = async () => {
    const updatedBook: Book = {
      ...book,
      arc_source: arcSource, // Safe assignment matching Book type
      intended_platforms: selectedPlatforms
    };
    await onSave(updatedBook, reminders);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-0.5">Drafting for:</span>
            <h2 className="text-lg font-bold text-slate-900">{book.title}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 font-medium">
              <span>✍️ <span className="font-semibold text-slate-600">Author:</span> {book.author || 'Unknown'}</span>
              <span>🆔 <span className="font-semibold text-slate-600">ISBN:</span> {book.isbn || 'N/A'}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>

        {/* ARC Source Dropdown */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">ARC Source</label>
          <select
            value={arcSource || ''}
            onChange={(e) => setArcSource(e.target.value as Book['arc_source'])}
            className="w-full md:w-1/2 border border-slate-300 p-2 text-xs rounded bg-white text-slate-900 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="">Select source...</option>
            <option value="NetGalley">NetGalley</option>
            <option value="Publisher">Publisher</option>
            <option value="Author">Author</option>
          </select>
        </div>

        {/* Intended Platforms Checkboxes */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Intended Distribution Platforms</label>
          <div className="flex flex-wrap gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
            {AVAILABLE_PLATFORMS.map((platform) => (
              <label key={platform} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(platform)}
                  onChange={() => handlePlatformToggle(platform)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                {platform}
              </label>
            ))}
          </div>
        </div>

        {/* Distribution Reminders Section */}
        <div className="space-y-3 border-t pt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Distribution Reminders</h3>
            <button
              type="button"
              onClick={handleSyncAllDates}
              className="bg-slate-100 hover:bg-indigo-5 text-indigo-600 border border-slate-200 hover:border-indigo-200 text-[11px] font-bold px-2.5 py-1 rounded transition shadow-3xs"
            >
              🔄 Sync All Reminder Dates
            </button>
          </div>

          {/* Reminder Rows mapping */}
          <div className="space-y-2">
            {reminders.map((reminder: Reminder, idx: number) => (
              <div key={reminder.id || idx} className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 w-24">{reminder.platform}</span>
                <input
                  type="text"
                  value={reminder.deadline_date}
                  onChange={(e) => {
                    const next = [...reminders];
                    next[idx].deadline_date = e.target.value;
                    setReminders(next);
                  }}
                  placeholder="dd/mm/yyyy"
                  className="border border-slate-300 p-1 rounded bg-white text-slate-900 text-[11px] font-medium w-32 focus:outline-none focus:border-indigo-500"
                />
                <label className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-500 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reminder.is_sent}
                    onChange={(e) => {
                      const next = [...reminders];
                      next[idx].is_sent = e.target.checked;
                      setReminders(next);
                    }}
                    className="rounded text-indigo-600 h-3.5 w-3.5"
                  />
                  Live
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 border-t pt-4">
          <button
            onClick={onClose}
            className="border border-slate-300 text-slate-700 font-medium text-xs px-4 py-2 rounded-md hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveSubmit}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2 rounded-md transition shadow-sm"
          >
            Save Changes
          </button>
        </div>

      </div>
    </div>
  );
}