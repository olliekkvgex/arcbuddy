'use client';

interface Activity {
  id: string;
  type: 'book_added' | 'review_saved' | 'reminder_set' | 'pub_date_added' | 'rating_added' | 'quote_added';
  bookTitle: string;
  author: string;
  userName?: string;
  activityDetail: string;
  timestamp: string;
  icon: string;
}

interface RecentActivityProps {
  activities: Activity[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (bookTitle: string, author: string) => void;
}

export function RecentActivity({ activities, isOpen, onToggle, onSelect }: RecentActivityProps) {
  const formatTimeAgo = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3.5 text-left font-bold text-xs uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition select-none"
      >
        <span className="flex items-center gap-2">
          📊 Recent Activity {activities.length > 0 && <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full font-bold normal-case">{activities.length} Items</span>}
        </span>
        <span className="text-slate-400 text-sm font-semibold">{isOpen ? '▲ Hide' : '▼ Expand'}</span>
      </button>
      {isOpen && (
        <div className="p-3.5 pt-0 border-t border-slate-100 mt-2">
          {activities.length === 0 ? (
            <p className="text-xs text-slate-500 italic pt-2">No recent activity yet.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {activities.map((activity) => (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => onSelect(activity.bookTitle, activity.author)}
                  className="w-full text-left flex items-start gap-3 p-2 bg-white rounded border border-slate-200 text-xs hover:border-slate-300 hover:bg-slate-50 transition"
                >
                  <span className="text-lg shrink-0">{activity.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 line-clamp-1">{activity.bookTitle}</p>
                    <p className="text-slate-600 text-[11px]">By {activity.author}</p>
                    <p className="text-slate-700 text-[11px] font-medium mt-1">{activity.activityDetail}</p>
                    <p className="text-slate-500 text-[10px] mt-0.5">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
