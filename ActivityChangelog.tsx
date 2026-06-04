'use client';

interface ChangelogEntry {
  id: string;
  bookTitle: string;
  author: string;
  activityDetail: string;
  timestamp: string;
  icon: string;
}

interface ActivityChangelogProps {
  bookId: string;
  bookTitle: string;
  author: string;
  activities: ChangelogEntry[];
  isOpen: boolean;
  onClose: () => void;
}

export function ActivityChangelog({ bookId, bookTitle, author, activities, isOpen, onClose }: ActivityChangelogProps) {
  const formatDateTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const bookActivities = activities.filter(a => a.bookTitle === bookTitle);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{bookTitle}</h2>
            <p className="text-sm text-slate-600">By {author}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Change Log</h3>
          {bookActivities.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4">No activity history for this book.</p>
          ) : (
            <div className="space-y-2">
              {bookActivities.map((activity) => (
                <div key={activity.id} className="flex gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition">
                  <span className="text-lg shrink-0">{activity.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{activity.activityDetail}</p>
                    <p className="text-xs text-slate-500 mt-1">{formatDateTime(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
