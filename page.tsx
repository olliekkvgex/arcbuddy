'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

// Type Definitions
import { Book, Reminder, BookQuote } from './types/arcbuddy';

// Child Components
import { KeyQuotesLog } from './components/KeyQuotesLog'; 
import { AddBookSidebar } from './components/AddBookSidebar';
import { SideMenu } from './components/SideMenu';
import { RecentActivity } from './components/RecentActivity';
import { ActivityChangelog } from './components/ActivityChangelog';
import { getDisclaimerHTML } from './components/Disclaimer'; 

// Tiptap Core
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';

// Core Constants
const AVAILABLE_PLATFORMS = [
  'Goodreads',
  'The StoryGraph',
  'Amazon',
  'Waterstones',
  'NetGalley',
  'Instagram',
  'TikTok',
  'Personal Blog'
];

// Helper: Convert Database string (YYYY-MM-DD) to Frontend string (DD/MM/YYYY)
const formatDbDateToUi = (dbDate: string | null): string => {
  if (!dbDate) return '';
  const [year, month, day] = dbDate.split('-');
  return `${day}/${month}/${year}`;
};

// Helper: Convert Frontend string (DD/MM/YYYY) to Database string (YYYY-MM-DD)
const formatUiDateToDb = (uiDate: string): string | null => {
  if (!uiDate.trim()) return null;
  const parts = uiDate.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const getTodayString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper: Basic validation check for DD/MM/YYYY format
const isValidUiDate = (uiDate: string): boolean => {
  if (!uiDate.trim()) return true; 
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!regex.test(uiDate)) return false;
  
  const [d, m, y] = uiDate.split('/').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
};

// Updated workflow theme colors (4-stage map)
const getStatusStyles = (status: string) => {
  switch (status) {
    case 'Not Started':
      return 'bg-slate-100 border-slate-200 text-slate-700 font-semibold';
    case 'Reading': 
      return 'bg-amber-100 border-amber-200 text-amber-800 font-semibold';
    case 'Drafting':
      return 'bg-yellow-100 border-yellow-200 text-yellow-800 font-semibold';
    case 'Completed': 
      return 'bg-emerald-100 border-emerald-200 text-emerald-800 font-semibold';
    default: 
      return 'bg-slate-100 border-slate-200 text-slate-700 font-semibold';
  }
};

import useIsMobile from './hooks/useIsMobile';

export default function Dashboard() {
  const router = useRouter();

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const isMobile = useIsMobile();

  const [myBooks, setMyBooks] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  // Filters & Sorters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [platformFilter, setPlatformFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('recently-added');

  // Core Editor States
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [draftRating, setDraftRating] = useState<number | null>(null);
  const [draftPubDate, setDraftPubDate] = useState(''); 
  const [draftArcSource, setDraftArcSource] = useState('');
  const [draftPlatforms, setDraftPlatforms] = useState<string[]>([]);
  const [savingReview, setSavingReview] = useState(false);
  
  // Shared Utilities
  const [quotesList, setQuotesList] = useState<BookQuote[]>([]);
  const [activeReminders, setActiveReminders] = useState<Reminder[]>([]);
  const [newPlatform, setNewPlatform] = useState('Goodreads');
  const [newDeadline, setNewDeadline] = useState('');
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  // Load recent activities from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('arcbuddy_recent_activities');
      if (stored) {
        try {
          setRecentActivities(JSON.parse(stored));
        } catch (err) {
          console.error('Failed to load recent activities:', err);
        }
      }
    }
  }, []);

  // Dropdown Toggles
  const [isPlatformsOpen, setIsPlatformsOpen] = useState(true);
  const [isReminderStatsOpen, setIsReminderStatsOpen] = useState(false);
  const [isRecentActivityOpen, setIsRecentActivityOpen] = useState(true);
  const [activeSidePanel, setActiveSidePanel] = useState<'searchAdd' | 'recentActivity' | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [activeChangelogBook, setActiveChangelogBook] = useState<{ title: string; author: string } | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, TextAlign.configure({ types: ['heading', 'paragraph'] }), TextStyle, Color],
    content: '',
    immediatelyRender: false,
    editorProps: { 
      attributes: { 
        class: 'prose prose-sm max-w-none border border-slate-300 rounded-b-md p-3 min-h-[220px] bg-white focus:outline-none focus:border-purple-500 text-slate-900 overflow-y-auto' 
      } 
    },
    onUpdate: ({ editor }) => {
      if (selectedReview) {
        const currentHtml = editor.getHTML();
        const savedHtml = selectedReview.review_text || '<p></p>';
        const normalize = (html: string) => html.replace('<p></p>', '').trim();
        
        if (normalize(currentHtml) !== normalize(savedHtml)) {
          setIsDirty(true);
        } else if (
          draftRating === (selectedReview.rating ?? null) && 
          draftPubDate === formatDbDateToUi(selectedReview.publication_date) &&
          draftArcSource === (selectedReview.arc_source || '') &&
          JSON.stringify(draftPlatforms.sort()) === JSON.stringify((selectedReview.intended_platforms || []).sort())
        ) {
          setIsDirty(false);
        }
      }
    },
  });

  useEffect(() => {
    if (selectedReview) {
      const initialDateUi = formatDbDateToUi(selectedReview.publication_date);
      const initialPlatforms = selectedReview.intended_platforms || [];
      
      if (
        draftRating !== (selectedReview.rating ?? null) || 
        draftPubDate !== initialDateUi ||
        draftArcSource !== (selectedReview.arc_source || '') ||
        JSON.stringify(draftPlatforms.sort()) !== JSON.stringify(initialPlatforms.sort())
      ) {
        setIsDirty(true);
      }
    }
  }, [draftRating, draftPubDate, draftArcSource, draftPlatforms, selectedReview]);

  useEffect(() => {
    if (selectedReview && workspaceRef.current) {
      setTimeout(() => workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80); 
    }
  }, [selectedReview]);

  // Sync overlay visibility when a panel or the editor is opened
  useEffect(() => {
    if (activeSidePanel || selectedReview) setOverlayVisible(true);
    // if neither is set, allow overlayVisible to be cleared by close handlers
  }, [activeSidePanel, selectedReview]);

  // Escape key handling: close overlays
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedReview) return handleCloseEditor();
        if (activeSidePanel) return closeSidePanel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedReview, activeSidePanel, isDirty]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/login');
      } else {
        setUser(user);
        fetchMyARCs(user.id);
      }
    };
    checkUser();
  }, [supabase]);


  const fetchRemindersForBook = async (bookId: string) => {
    const { data } = await supabase.from('reminders').select('id, deadline_date, platform, is_sent').eq('book_id', bookId);
    if (data) setActiveReminders(data);
  };

  const fetchQuotesForBook = async (reviewId: string) => {
    const { data } = await supabase.from('book_quotes').select('id, text, page, created_at').eq('review_id', reviewId).order('created_at', { ascending: false });
    if (data) setQuotesList(data);
  };

  const getReminderPublicationDelta = (deadlineDate: string, publicationDate: string | null) => {
    if (!publicationDate) return null;

    const deadline = new Date(deadlineDate);
    const publication = new Date(publicationDate);
    const diffMs = publication.getTime() - deadline.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  };

  const logActivity = (type: string, bookTitle: string, author: string, activityDetail: string, icon: string) => {
    const newActivity = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      bookTitle,
      author,
      activityDetail,
      timestamp: new Date().toISOString(),
      icon
    };
    
    setRecentActivities(prev => {
      const updated = [newActivity, ...prev].slice(0, 20);
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('arcbuddy_recent_activities', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const openChangelog = (bookTitle: string, author: string) => {
    setActiveChangelogBook({ title: bookTitle, author });
    setIsChangelogOpen(true);
  };

  const closeChangelog = () => {
    setIsChangelogOpen(false);
    setActiveChangelogBook(null);
  };

  const getRecentActivities = () => {
    return recentActivities;
  };

  const handleLiveAddQuote = async (text: string, page: string) => {
    if (!selectedReview) return;
    const { data } = await supabase.from('book_quotes').insert([{ review_id: selectedReview.id, text, page: page || "" }]).select().single();
    if (data) {
      setQuotesList(prev => [data, ...prev]);
      logActivity('quote_added', selectedReview.books?.title || 'Untitled Book', selectedReview.books?.author || 'Unknown Author', 'Key quote added', '💭');
    }
  };

  const handleLiveRemoveQuote = async (id: string) => {
    await supabase.from('book_quotes').delete().eq('id', id);
    setQuotesList(prev => prev.filter(q => q.id !== id));
  };

  const fetchMyARCs = async (userId: string, restoreSelectedReview = true) => {
    const { data, error } = await supabase.from('reviews').select(`
      id, status, book_id, rating, review_text, publication_date, arc_source, intended_platforms, created_at,
      books (id, title, author, cover_url, publisher, isbn)
    `).eq('user_id', userId);

    if (error || !data) return;

    const combined = data.map(review => {
      // Legacy data fallback logic to ensure database sync isn't broken
      let cleanStatus = review.status;
      if (cleanStatus === 'Draft') cleanStatus = 'Not Started';
      if (cleanStatus === 'Reviewed') cleanStatus = 'Completed';

      return {
        id: review.id,
        status: cleanStatus || 'Not Started',
        book_id: review.book_id,
        rating: review.rating ?? null,
        review_text: review.review_text || '',
        publication_date: review.publication_date || null,
        arc_source: review.arc_source || '',
        intended_platforms: review.intended_platforms || [],
        created_at: review.created_at,
        books: review.books || { title: 'Untitled Book', author: 'Unknown Author', cover_url: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=150', publisher: 'Unknown Publisher', isbn: 'N/A' }
      };
    });

    setMyBooks(combined);

    if (restoreSelectedReview && selectedReview) {
      const match = combined.find(r => r.id === selectedReview.id);
      if (match) setSelectedReview(match);
    }
  };

  const handleStatusChange = async (reviewId: string, newStatus: string) => {
    await supabase.from('reviews').update({ status: newStatus }).eq('id', reviewId);
    const matchingArc = myBooks.find(arc => arc.id === reviewId);
    if (matchingArc) {
      logActivity('status_changed', matchingArc.books?.title || 'Untitled Book', matchingArc.books?.author || 'Unknown Author', `Status changed to ${newStatus}`, '🔁');
    }
    setMyBooks(prev => prev.map(arc => arc.id === reviewId ? { ...arc, status: newStatus } : arc));
  };

  const confirmDiscardIfDirty = (): boolean => !isDirty || window.confirm("Discard unsaved draft changes?");

  const openReviewWorkspace = (review: any) => {
    if (selectedReview?.id === review.id || !confirmDiscardIfDirty()) return;

    setSelectedReview(review);
    setDraftRating(review.rating);
    setDraftPubDate(formatDbDateToUi(review.publication_date)); 
    setDraftArcSource(review.arc_source || '');
    setDraftPlatforms(review.intended_platforms || []);
    setIsDirty(false);
    setIsReminderStatsOpen(false);
    setIsPlatformsOpen(true);
    
    if (review.book_id) fetchRemindersForBook(review.book_id);
    fetchQuotesForBook(review.id); 
    if (editor) editor.commands.setContent(review.review_text || '');
  };

  const closeSidePanel = () => {
    setOverlayVisible(false);
    setTimeout(() => setActiveSidePanel(null), 260);
  };

  const handleCloseEditor = (force = false) => {
    if (!force && !confirmDiscardIfDirty()) return;
    setIsDirty(false);
    setActiveReminders([]);
    setQuotesList([]);
    setOverlayVisible(false);
    setTimeout(() => setSelectedReview(null), 260);
  };

  const handlePlatformCheckboxChange = (platform: string) => {
    setDraftPlatforms(prev => prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]);
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview || !newDeadline.trim() || !user) return;
    if (!isValidUiDate(newDeadline)) return alert("Format deadline as DD/MM/YYYY");

    const dbDate = formatUiDateToDb(newDeadline);
    if (!dbDate) return alert("Format deadline as DD/MM/YYYY");

    const { data: reminderData, error } = await supabase.from('reminders').insert([{ user_id: user.id, book_id: selectedReview.book_id, deadline_date: dbDate, platform: newPlatform, is_sent: false }]).select().single();
    if (error) {
      console.error(error);
      return;
    }

    logActivity('reminder_set', selectedReview.books?.title || 'Untitled Book', selectedReview.books?.author || 'Unknown Author', `Platform reminder set: ${newPlatform}`, '🎯');
    setNewDeadline('');
    await Promise.all([
      fetchRemindersForBook(selectedReview.book_id),
      fetchMyARCs(user.id)
    ]);
  };

  const handleRemoveReminder = async (reminderId: string) => {
    await supabase.from('reminders').delete().eq('id', reminderId);
    if (selectedReview) fetchRemindersForBook(selectedReview.book_id);
  };

  const executeSaveRoutine = async () => {
    if (!selectedReview || !editor) return;
    if (!isValidUiDate(draftPubDate)) return alert("Please input date format as DD/MM/YYYY");

    setSavingReview(true);
    try {
      // Track what changed
      const changes: string[] = [];
      
      if (draftRating !== (selectedReview.rating ?? null)) {
        changes.push(`Rating set: ${draftRating ? draftRating + ' stars' : 'cleared'}`);
      }
      
      if (draftPubDate !== formatDbDateToUi(selectedReview.publication_date)) {
        changes.push(`Publication date set: ${draftPubDate}`);
      }
      
      if (draftArcSource !== (selectedReview.arc_source || '')) {
        changes.push(`ARC source set: ${draftArcSource || 'cleared'}`);
      }
      
      if (JSON.stringify(draftPlatforms.sort()) !== JSON.stringify((selectedReview.intended_platforms || []).sort())) {
        const platformLabel = draftPlatforms.length > 0 ? draftPlatforms.join(', ') : 'cleared';
        changes.push(`Intended platforms set: ${platformLabel}`);
      }
      
      const currentHtml = editor.getHTML();
      const savedHtml = selectedReview.review_text || '<p></p>';
      const normalize = (html: string) => html.replace('<p></p>', '').trim();
      if (normalize(currentHtml) !== normalize(savedHtml)) {
        changes.push('Review text updated');
      }
      
      const updatedStatus = selectedReview.status === 'Not Started' ? 'Drafting' : selectedReview.status;

      await supabase.from('reviews').update({
        rating: draftRating,
        review_text: editor.getHTML(),
        publication_date: formatUiDateToDb(draftPubDate), 
        arc_source: draftArcSource,
        intended_platforms: draftPlatforms,
        status: updatedStatus
      }).eq('id', selectedReview.id);

      const activityDetail = changes.length > 0 ? changes.join(', ') : 'Review saved';
      logActivity('review_saved', selectedReview.books?.title || 'Untitled Book', selectedReview.books?.author || 'Unknown Author', activityDetail, '✅');
      
      setIsDirty(false);
      handleCloseEditor(true);
      alert("Changes saved!");
      await fetchMyARCs(user.id, false);
    } catch (err) { console.error(err); }
    setSavingReview(false);
  };

  const saveBookToWorkbench = async (book: Book, optionalInitialPubUiDate?: string) => {
    if (!user) return;
    const cleanBook = {
      title: book.title || 'Untitled Book',
      author: book.author || 'Unknown Author',
      isbn: book.isbn || 'N/A',
      cover_url: book.cover_url || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=150',
      publisher: book.publisher || 'Unknown Publisher'
    };

    const { data: bookData } = await supabase.from('books').insert([cleanBook]).select().single();
    if (!bookData) return;

    // New additions accurately initialize directly to 'Not Started'
    await supabase.from('reviews').insert([{ user_id: user.id, book_id: bookData.id, status: 'Not Started', publication_date: optionalInitialPubUiDate ? formatUiDateToDb(optionalInitialPubUiDate) : null, arc_source: '', intended_platforms: [] }]);
    logActivity('book_added', cleanBook.title, cleanBook.author, `Added to workbench by ${user.email}`, '📚');
    alert(`"${cleanBook.title}" added to your Workbench.`);
    fetchMyARCs(user.id);
  };

  const handleRemoveARC = async (e: React.MouseEvent, arc: any) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to remove "${arc.books?.title}"?`)) return;
    await supabase.from('reviews').delete().eq('id', arc.id);
    if (arc.books?.id) await supabase.from('books').delete().eq('id', arc.books.id);
    if (selectedReview?.id === arc.id) handleCloseEditor();
    fetchMyARCs(user.id);
  };

  const handleLogout = async () => {
    if (!confirmDiscardIfDirty()) return;
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    setTimeout(() => {
      router.push('/login');
    }, 2500);
  };

  const filteredAndSortedBooks = myBooks
    .filter((arc) => statusFilter === 'All' || arc.status === statusFilter)
    .filter((arc) => {
      if (platformFilter === 'All') return true;
      return (arc.intended_platforms || []).some((p: string) => p.toLowerCase() === platformFilter.toLowerCase());
    })
   .filter((arc) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const title = (arc.books?.title || '').toLowerCase();
      const author = (arc.books?.author || '').toLowerCase();
      const publisher = (arc.books?.publisher || '').toLowerCase();
      const isbn = (arc.books?.isbn || '').toLowerCase();
      const arcSource = (arc.arc_source || '').toLowerCase();
      
      return (
        title.includes(query) || 
        author.includes(query) || 
        publisher.includes(query) || 
        isbn.includes(query) || 
        arcSource.includes(query)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'recently-added') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'pub-date-asc') return !a.publication_date ? 1 : !b.publication_date ? -1 : new Date(a.publication_date).getTime() - new Date(b.publication_date).getTime();
      if (sortBy === 'pub-date-desc') return !a.publication_date ? 1 : !b.publication_date ? -1 : new Date(b.publication_date).getTime() - new Date(a.publication_date).getTime();
      if (sortBy === 'bookTitle-asc') return (a.books?.title || '').localeCompare(b.books?.title || '');
      if (sortBy === 'bookTitle-desc') return (b.books?.title || '').localeCompare(a.books?.title || '');
      return (a.books?.author || '').localeCompare(b.books?.author || '');
    });

  if (!user) return <div className="p-8 text-center text-purple-700 font-medium bg-purple-100/50 min-h-screen">Loading ARCbuddy...</div>;

  return (
    <div className="min-h-screen bg-purple-50/50 p-4 sm:p-6 text-slate-800">
      {/* Dashboard Topbar Info row */}
      <div className="flex items-center justify-between border-b border-purple-100 pb-4 relative">
        <h1 className="text-2xl font-bold text-slate-900">ARCbuddy Dashboard 📖</h1>
        <div className="flex items-center gap-4">
          <button onClick={handleLogout} className="text-sm bg-purple-100 px-3 py-1.5 rounded-md font-medium text-purple-700 hover:bg-purple-200 transition">Logout</button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_auto] mt-6">
        <div className={`space-y-6 transition-all duration-300 ${(activeSidePanel || selectedReview) ? 'pointer-events-none select-none filter blur-sm' : ''}`}>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-purple-100 shadow-sm">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <h2 className="text-lg font-bold text-slate-900 shrink-0">My ARC Workbench</h2>
                <div className="relative w-full max-w-xs">
                  <input
                    type="text"
                    placeholder="Search titles, authors, publishers, ISBNs, ARC sources ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-purple-200 rounded-md py-1 px-2 text-xs bg-purple-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:bg-white font-medium"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-[10px]">✕</button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {/* Updated Status Filtering dropdown */}
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-purple-200 rounded-md p-1.5 bg-purple-50 font-semibold text-purple-700 focus:outline-none focus:border-purple-400 cursor-pointer">
                  <option value="All">All Statuses</option>
                  <option value="Not Started">⚪ Not Started</option>
                  <option value="Reading">🔴 Reading</option>
                  <option value="Drafting">🟡 Drafting</option>
                  <option value="Completed">🟢 Completed</option>
                </select>
                <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="border border-purple-200 rounded-md p-1.5 bg-purple-50 font-semibold text-purple-700 focus:outline-none focus:border-purple-400 cursor-pointer">
                  <option value="All">All Platforms</option>
                  {AVAILABLE_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border border-purple-200 rounded-md p-1.5 bg-purple-50 font-semibold text-purple-700 focus:outline-none focus:border-purple-400 cursor-pointer">
                  <option value="recently-added">Recently added</option>
                  <option value="pub-date-asc">Pub Date (A-Z)</option>
                  <option value="pub-date-desc">Pub Date (Z-A)</option>
                  <option value="author-asc">Author (A-Z)</option>
                  <option value="bookTitle-asc">Book Title (A-Z)</option>
                  <option value="bookTitle-desc">Book Title (Z-A)</option>
                </select>
              </div>
            </div>

            {filteredAndSortedBooks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-purple-200 bg-white p-8 text-center">
                <p className="text-slate-500 italic">No workbench books align with your filter criteria.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredAndSortedBooks.map((arc) => (
                  <div key={arc.id} onClick={() => openReviewWorkspace(arc)} className={`flex gap-3 bg-white p-3 rounded-lg border relative group cursor-pointer transition hover:border-purple-400 ${selectedReview?.id === arc.id ? 'ring-2 ring-purple-500 border-transparent shadow-md' : 'border-purple-100 shadow-sm'}`}>
                    <button onClick={(e) => handleRemoveARC(e, arc)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition p-1 bg-white hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 z-10">🗑️</button>
                    <img src={arc.books?.cover_url} alt="cover" className="w-16 h-24 object-cover rounded shadow-sm shrink-0 bg-slate-100" />
                    <div className="flex flex-col justify-between flex-1 min-w-0 pr-4">
                      <div>
                        <h3 className="font-bold text-sm leading-tight line-clamp-1 text-slate-900">{arc.books?.title}</h3>
                        <p className="text-xs text-slate-600 truncate">By {arc.books?.author}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <p className="text-[10px] text-slate-500 font-medium truncate">🏢 {arc.books?.publisher}</p>
                          {arc.arc_source && <span className="text-[9px] bg-purple-50 text-purple-700 px-1 rounded font-semibold border border-purple-100">📍 {arc.arc_source}</span>}
                        </div>
                      </div>
                      <div className="pt-2 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                        {/* Updated Inline Interactive Status Dropdown */}
                        <select value={arc.status || 'Not Started'} onChange={(e) => handleStatusChange(arc.id, e.target.value)} className={`text-xs font-semibold px-2 py-1 rounded-md border focus:outline-none transition cursor-pointer w-28 ${getStatusStyles(arc.status)}`}>
                          <option value="Not Started">⚪ Not Started</option>
                          <option value="Reading">🔴 Reading</option>
                          <option value="Drafting">🟡 Drafting</option>
                          <option value="Completed">🟢 Completed</option>
                        </select>
                        <span className="flex items-center gap-2 text-[10px] bg-purple-50 border border-purple-100 px-1.5 py-0.5 text-purple-700 font-medium rounded">
                          <span>{arc.publication_date ? `📅 ${formatDbDateToUi(arc.publication_date)}` : 'No date'}</span>
                          {arc.status === 'Completed' && arc.rating != null && (
                            <span className="bg-yellow-50 text-yellow-800 px-2 py-0.5 rounded-md text-[10px] font-bold border border-yellow-100 flex items-center gap-1">
                              <span className="leading-none">{'★'.repeat(Number(arc.rating))}</span>
                              <span className="text-[9px] text-yellow-700/80">({arc.rating})</span>
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expanded Book Review drafting module context (now opened as modal) */}
          {false && selectedReview && (
            <div ref={workspaceRef} className="bg-white p-5 rounded-xl border border-purple-100 shadow-sm space-y-4 scroll-mt-6">
              <div className="flex items-center justify-between border-b border-purple-50 pb-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-600 flex items-center gap-2">
                    Review Workspace {isDirty && <span className="normal-case bg-amber-100 text-amber-800 font-medium rounded-full px-2 py-0.5 text-[10px]">Unsaved Changes</span>}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 line-clamp-1">Drafting for: {selectedReview.books?.title}</h3>
                </div>
                <button onClick={() => handleCloseEditor()} className="text-xs text-slate-400 hover:text-slate-600 font-medium">Close Editor ✕</button>
              </div>

              {/* PLATFORM DISTRIBUTION REMINDERS */}
              <div className="bg-purple-50/40 rounded-xl border border-purple-100 overflow-hidden">
                <button type="button" onClick={() => setIsReminderStatsOpen(!isReminderStatsOpen)} className="w-full flex items-center justify-between p-4 text-left font-bold text-xs uppercase tracking-wider text-purple-700 hover:bg-purple-50 transition select-none">
                  <span className="flex items-center gap-2">🎯 PLATFORM DISTRIBUTION REMINDERS {activeReminders.length > 0 && <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full font-bold normal-case">{activeReminders.length} Active</span>}</span>
                  <span className="text-purple-500 text-sm font-semibold">{isReminderStatsOpen ? '▲ Hide' : '▼ Expand'}</span>
                </button>
                {isReminderStatsOpen && (
                  <div className="p-4 pt-0 space-y-4 border-t border-purple-100 mt-3">
                    {activeReminders.length === 0 ? (
                      <p className="text-xs text-slate-500 italic pt-2">Set a reminder to track how long till your content is due.</p>
                    ) : selectedReview?.publication_date ? (
                      <div className="space-y-3 text-slate-700 text-xs">
                        {activeReminders.map((rem) => {
                          const delta = getReminderPublicationDelta(rem.deadline_date, selectedReview.publication_date);
                          const label = delta === null
                            ? 'Publication date unavailable'
                            : delta === 0
                              ? 'Same day as publication'
                              : delta > 0
                                ? `${delta} day${delta === 1 ? '' : 's'} before publication`
                                : `${Math.abs(delta)} day${Math.abs(delta) === 1 ? '' : 's'} after publication`;

                          return (
                            <div key={rem.id || rem.deadline_date} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                              <div>
                                <p className="font-semibold text-slate-800">{rem.platform}</p>
                                <p className="text-slate-500">{formatDbDateToUi(rem.deadline_date)}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] font-bold text-purple-700">{label}</span>
                                <button type="button" onClick={() => handleRemoveReminder(rem.id)} className="text-slate-400 hover:text-red-500 font-bold transition px-1">✕</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic pt-2">Set a publication date to compare reminders with your book's release date.</p>
                    )}

                    <form onSubmit={handleAddReminder} className="flex flex-wrap gap-2 pt-3 border-t border-purple-100 items-center">
                      <select value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)} className="border border-slate-200 p-1.5 text-xs rounded bg-white text-slate-700 font-semibold focus:outline-none focus:border-purple-400">
                        {AVAILABLE_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <input type="text" placeholder="Deadline (dd/mm/yyyy)" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} className="border border-slate-200 p-1.5 text-xs rounded bg-white focus:outline-none focus:border-purple-400 text-slate-800 w-36 font-medium" />
                      <button type="submit" className="bg-purple-600 text-white text-xs px-3 py-1.5 rounded font-medium hover:bg-purple-700 transition shadow-sm">+ Set Reminder</button>
                    </form>
                  </div>
                )}
              </div>

              {/* Workspace Grid Layout */}
              <div className={`grid gap-5 ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-3'} items-start`}>
                
                {/* Form Editor Body columns */}
                <div className="lg:col-span-2 space-y-4">
                  <form onSubmit={(e) => { e.preventDefault(); executeSaveRoutine(); }} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">ARC Rating</label>
                        <select value={draftRating ?? ''} onChange={(e) => e.target.value === '' ? setDraftRating(null) : setDraftRating(Number(e.target.value))} className="border border-slate-200 p-2 text-sm rounded-md focus:border-purple-400 focus:outline-none w-full bg-slate-50 font-medium text-slate-800">
                          <option value="">NULL</option>
                          <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                          <option value="4">⭐⭐⭐⭐ (4)</option>
                          <option value="3">⭐⭐⭐ (3)</option>
                          <option value="2">⭐⭐ (2)</option>
                          <option value="1">⭐ (1)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Publication Date <span className="text-[10px] text-slate-400 lowercase">(dd/mm/yyyy)</span></label>
                        <input type="text" placeholder="e.g. 28/10/2026" className="border border-slate-200 p-2 text-sm rounded-md focus:border-purple-400 focus:outline-none w-full bg-white text-slate-800 font-medium" value={draftPubDate} onChange={(e) => setDraftPubDate(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">ARC Source</label>
                        <select value={draftArcSource} onChange={(e) => setDraftArcSource(e.target.value)} className="border border-slate-200 p-2 text-sm rounded-md focus:border-purple-400 focus:outline-none w-full bg-slate-50 font-medium text-slate-800">
                          <option value="">Select Source...</option>
                          <option value="NetGalley">NetGalley</option>
                          <option value="Publisher">Publisher</option>
                          <option value="Author">Author</option>
                        </select>
                      </div>
                    </div>

                    {editor && (
                          <div className={`flex flex-col rounded-md border border-slate-200 overflow-hidden shadow-sm ${isMobile ? 'min-h-[56vh]' : ''}`}>
                            <div className="flex flex-wrap items-center gap-1 overflow-x-auto bg-slate-50 p-1 sm:p-1.5 border-b border-slate-200 text-slate-700">
                          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`px-2 py-1 text-xs font-bold rounded hover:bg-slate-200 ${editor.isActive('bold') ? 'bg-slate-200 text-slate-900 font-extrabold' : ''}`}>B</button>
                          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`px-2 py-1 text-xs italic rounded hover:bg-slate-200 ${editor.isActive('italic') ? 'bg-slate-200 text-slate-900 font-bold' : ''}`}>I</button>
                          <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`px-2 py-1 text-xs underline rounded hover:bg-slate-200 ${editor.isActive('underline') ? 'bg-slate-200 text-slate-900 font-bold' : ''}`}>U</button>
                          <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={`px-2 py-1 text-xs rounded hover:bg-slate-200 ${editor.isActive('strike') ? 'bg-slate-200 text-slate-900 font-bold' : ''}`}>S</button>
                          <button type="button" onClick={() => editor.chain().focus().setMark('textStyle', { fontSize: '18px' }).run()} className="px-2 py-1 text-xs rounded hover:bg-slate-200">A+</button>
                          <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`px-2 py-1 text-xs rounded hover:bg-slate-200 ${editor.isActive({ textAlign: 'left' }) ? 'bg-slate-200 text-slate-900 font-bold' : ''}`}>L</button>
                          <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`px-2 py-1 text-xs rounded hover:bg-slate-200 ${editor.isActive({ textAlign: 'center' }) ? 'bg-slate-200 text-slate-900 font-bold' : ''}`}>C</button>
                          <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`px-2 py-1 text-xs rounded hover:bg-slate-200 ${editor.isActive({ textAlign: 'right' }) ? 'bg-slate-200 text-slate-900 font-bold' : ''}`}>R</button>
                          <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                          <button type="button" onClick={() => editor.chain().focus().setColor('#ef4444').run()} className="w-4 h-4 rounded-full bg-red-500 border border-white" />
                          <button type="button" onClick={() => editor.chain().focus().setColor('#f59e0b').run()} className="w-4 h-4 rounded-full bg-orange-500 border border-white" />
                          <button type="button" onClick={() => editor.chain().focus().setColor('#facc15').run()} className="w-4 h-4 rounded-full bg-yellow-400 border border-white" />
                          <button type="button" onClick={() => editor.chain().focus().setColor('#84cc16').run()} className="w-4 h-4 rounded-full bg-lime-500 border border-white" />
                          <button type="button" onClick={() => editor.chain().focus().setColor('#3b82f6').run()} className="w-4 h-4 rounded-full bg-blue-500 border border-white" />
                          <button type="button" onClick={() => editor.chain().focus().setColor('#8b5cf6').run()} className="w-4 h-4 rounded-full bg-purple-500 border border-white" />
                          <button type="button" onClick={() => editor.chain().focus().setColor('#1f2937').run()} className="w-4 h-4 rounded-full bg-slate-900 border border-white" />
                          <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                          <button type="button" onClick={() => editor.chain().focus().insertContent(getDisclaimerHTML(draftArcSource)).run()} className="px-2 py-1 text-xs font-semibold rounded hover:bg-slate-200 text-slate-700">+Disclaimer</button>
                        </div>
                        <EditorContent editor={editor} />
                      </div>
                    )}
                    <div className={`flex items-center ${isMobile ? 'justify-center' : 'justify-end'}`}>
                      <button type="submit" disabled={savingReview} className={`bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-purple-700 transition shadow-sm disabled:opacity-50 ${isMobile ? 'w-full' : ''}`}>
                        {savingReview ? 'Saving Draft...' : 'Save Review Draft'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right Side: Shared Tools Column info lines */}
                <div className="space-y-4">
                  <KeyQuotesLog quotesList={quotesList} onAddQuote={handleLiveAddQuote} onRemoveQuote={handleLiveRemoveQuote} />

                  {/* Platforms Configuration block */}
                  <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                    <button type="button" onClick={() => setIsPlatformsOpen(!isPlatformsOpen)} className="w-full flex items-center justify-between p-3.5 text-left font-bold text-xs uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition select-none">
                      <span className="flex items-center gap-2">📱 Intended Platforms {draftPlatforms.length > 0 && <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full font-bold normal-case">{draftPlatforms.length} Selected</span>}</span>
                      <span className="text-slate-400 text-sm font-semibold">{isPlatformsOpen ? '▲ Hide' : '▼ Expand'}</span>
                    </button>
                    {isPlatformsOpen && (
                      <div className="p-3.5 pt-0 border-t border-slate-100 mt-2">
                        <div className="grid grid-cols-1 gap-2 max-h-[190px] overflow-y-auto pr-1 pt-1">
                          {AVAILABLE_PLATFORMS.map((platform) => (
                            <label key={platform} className={`flex items-center gap-2 text-xs font-medium text-slate-700 bg-white p-2 rounded border cursor-pointer hover:bg-slate-50 transition select-none ${draftPlatforms.includes(platform) ? 'border-purple-200 bg-purple-50/50 text-purple-900' : 'border-slate-200'}`}>
                              <input type="checkbox" checked={draftPlatforms.includes(platform)} onChange={() => handlePlatformCheckboxChange(platform)} className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4" />
                              {platform}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        <SideMenu activePanel={activeSidePanel} onSelect={setActiveSidePanel} />
      </div>

      {activeSidePanel && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/30 backdrop-blur-sm transition-opacity duration-200 ${overlayVisible ? 'opacity-100' : 'opacity-0'}`}
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeSidePanel(); }}
        >
            <div className="relative w-full h-full sm:max-w-4xl sm:max-h-[90vh] sm:overflow-y-auto">
            <button type="button" onClick={() => closeSidePanel()} className="absolute right-2 top-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg transition hover:bg-white">
              ✕
            </button>
            <div className={`bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden transform transition-all duration-250 h-full sm:h-auto ${overlayVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
              <div className="p-4">
                {activeSidePanel === 'searchAdd' ? (
                  <AddBookSidebar onSaveBook={saveBookToWorkbench} />
                ) : (
                  <RecentActivity
                    activities={getRecentActivities()}
                    isOpen={isRecentActivityOpen}
                    onToggle={() => setIsRecentActivityOpen(!isRecentActivityOpen)}
                    onSelect={(bookTitle, author) => openChangelog(bookTitle, author)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedReview && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/30 backdrop-blur-sm transition-opacity duration-300 ${overlayVisible ? 'opacity-100' : 'opacity-0'}`}
          onMouseDown={(e) => { if (e.target === e.currentTarget) handleCloseEditor(); }}
        >
          <div className="relative w-full h-full sm:max-w-[1200px] sm:max-h-[90vh] sm:overflow-y-auto">
            <button type="button" onClick={() => handleCloseEditor()} className="absolute right-2 top-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg transition hover:bg-white">✕</button>
            <div className={`bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden transform transition-all duration-300 h-full sm:h-auto ${overlayVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
              
              <div className="p-4">
                <div ref={workspaceRef} className="bg-white p-5 rounded-xl border border-purple-100 shadow-sm space-y-4 scroll-mt-6">
                  <div className="flex items-center justify-between border-b border-purple-50 pb-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-600 flex items-center gap-2">
                        Review Workspace {isDirty && <span className="normal-case bg-amber-100 text-amber-800 font-medium rounded-full px-2 py-0.5 text-[10px]">Unsaved Changes</span>}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 line-clamp-1">Drafting for: {selectedReview.books?.title}</h3>
                    </div>
                    <button onClick={() => handleCloseEditor()} className="text-xs text-slate-400 hover:text-slate-600 font-medium">Close Editor ✕</button>
                  </div>

                  <div className="bg-purple-50/40 rounded-xl border border-purple-100 overflow-hidden">
                    <button type="button" onClick={() => setIsReminderStatsOpen(!isReminderStatsOpen)} className="w-full flex items-center justify-between p-4 text-left font-bold text-xs uppercase tracking-wider text-purple-700 hover:bg-purple-50 transition select-none">
                      <span className="flex items-center gap-2">🎯 PLATFORM DISTRIBUTION REMINDERS {activeReminders.length > 0 && <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full font-bold normal-case">{activeReminders.length} Active</span>}</span>
                      <span className="text-purple-500 text-sm font-semibold">{isReminderStatsOpen ? '▲ Hide' : '▼ Expand'}</span>
                    </button>
                    {isReminderStatsOpen && (
                      <div className="p-4 pt-0 space-y-4 border-t border-purple-100 mt-3">
                        {activeReminders.length === 0 ? (
                          <p className="text-xs text-slate-500 italic pt-2">Set a reminder to track how long till your content is due.</p>
                        ) : selectedReview?.publication_date ? (
                          <div className="space-y-3 text-slate-700 text-xs">
                            {activeReminders.map((rem) => {
                              const delta = getReminderPublicationDelta(rem.deadline_date, selectedReview.publication_date);
                              const label = delta === null
                                ? 'Publication date unavailable'
                                : delta === 0
                                  ? 'Same day as publication'
                                  : delta > 0
                                    ? `${delta} day${delta === 1 ? '' : 's'} before publication`
                                    : `${Math.abs(delta)} day${Math.abs(delta) === 1 ? '' : 's'} after publication`;

                              return (
                                <div key={rem.id || rem.deadline_date} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                                  <div>
                                    <p className="font-semibold text-slate-800">{rem.platform}</p>
                                    <p className="text-slate-500">{formatDbDateToUi(rem.deadline_date)}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[11px] font-bold text-purple-700">{label}</span>
                                    <button type="button" onClick={() => handleRemoveReminder(rem.id)} className="text-slate-400 hover:text-red-500 font-bold transition px-1">✕</button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic pt-2">Set a publication date to compare reminders with your book's release date.</p>
                        )}

                        <form onSubmit={handleAddReminder} className="flex flex-wrap gap-2 pt-3 border-t border-purple-100 items-center">
                          <select value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)} className="border border-slate-200 p-1.5 text-xs rounded bg-white text-slate-700 font-semibold focus:outline-none focus:border-purple-400">
                            {AVAILABLE_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <input type="text" placeholder="Deadline (dd/mm/yyyy)" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} className="border border-slate-200 p-1.5 text-xs rounded bg-white focus:outline-none focus:border-purple-400 text-slate-800 w-36 font-medium" />
                          <button type="submit" className="bg-purple-600 text-white text-xs px-3 py-1.5 rounded font-medium hover:bg-purple-700 transition shadow-sm">+ Set Reminder</button>
                        </form>
                      </div>
                    )}
                  </div>

                  <div className={`grid gap-5 ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-3'} items-start`}>
                    <div className="lg:col-span-2 space-y-4">
                      <form onSubmit={(e) => { e.preventDefault(); executeSaveRoutine(); }} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">ARC Rating</label>
                            <select value={draftRating ?? ''} onChange={(e) => e.target.value === '' ? setDraftRating(null) : setDraftRating(Number(e.target.value))} className="border border-slate-200 p-2 text-sm rounded-md focus:border-purple-400 focus:outline-none w-full bg-slate-50 font-medium text-slate-800">
                              <option value="">NULL</option>
                              <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                              <option value="4">⭐⭐⭐⭐ (4)</option>
                              <option value="3">⭐⭐⭐ (3)</option>
                              <option value="2">⭐⭐ (2)</option>
                              <option value="1">⭐ (1)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Publication Date <span className="text-[10px] text-slate-400 lowercase">(dd/mm/yyyy)</span></label>
                            <input type="text" placeholder="e.g. 28/10/2026" className="border border-slate-200 p-2 text-sm rounded-md focus:border-purple-400 focus:outline-none w-full bg-white text-slate-800 font-medium" value={draftPubDate} onChange={(e) => setDraftPubDate(e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">ARC Source</label>
                            <select value={draftArcSource} onChange={(e) => setDraftArcSource(e.target.value)} className="border border-slate-200 p-2 text-sm rounded-md focus:border-purple-400 focus:outline-none w-full bg-slate-50 font-medium text-slate-800">
                              <option value="">Select Source...</option>
                              <option value="NetGalley">NetGalley</option>
                              <option value="Publisher">Publisher</option>
                              <option value="Author">Author</option>
                            </select>
                          </div>
                        </div>

                        {editor && (
                          <div className={`flex flex-col rounded-md border border-slate-200 overflow-hidden shadow-sm ${isMobile ? 'min-h-[56vh]' : ''}`}>
                            <div className="flex flex-wrap items-center gap-1 overflow-x-auto bg-slate-50 p-1 sm:p-1.5 border-b border-slate-200 text-slate-700">
                              <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`px-2 py-1 text-xs font-bold rounded hover:bg-slate-200 ${editor.isActive('bold') ? 'bg-slate-200 text-slate-900 font-extrabold' : ''}`}>B</button>
                              <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`px-2 py-1 text-xs italic rounded hover:bg-slate-200 ${editor.isActive('italic') ? 'bg-slate-200 text-slate-900 font-bold' : ''}`}>I</button>
                              <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`px-2 py-1 text-xs underline rounded hover:bg-slate-200 ${editor.isActive('underline') ? 'bg-slate-200 text-slate-900 font-bold' : ''}`}>U</button>
                              <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={`px-2 py-1 text-xs rounded hover:bg-slate-200 ${editor.isActive('strike') ? 'bg-slate-200 text-slate-900 font-bold' : ''}`}>S</button>
                              <button type="button" onClick={() => editor.chain().focus().setMark('textStyle', { fontSize: '18px' }).run()} className="px-2 py-1 text-xs rounded hover:bg-slate-200">A+</button>
                              <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`px-2 py-1 text-xs rounded hover:bg-slate-200 ${editor.isActive({ textAlign: 'left' }) ? 'bg-slate-200 text-slate-900 font-bold' : ''}`}>L</button>
                              <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`px-2 py-1 text-xs rounded hover:bg-slate-200 ${editor.isActive({ textAlign: 'center' }) ? 'bg-slate-200 text-slate-900 font-bold' : ''}`}>C</button>
                              <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`px-2 py-1 text-xs rounded hover:bg-slate-200 ${editor.isActive({ textAlign: 'right' }) ? 'bg-slate-200 text-slate-900 font-bold' : ''}`}>R</button>
                              <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                              <button type="button" onClick={() => editor.chain().focus().setColor('#ef4444').run()} className="w-4 h-4 rounded-full bg-red-500 border border-white" />
                              <button type="button" onClick={() => editor.chain().focus().setColor('#f59e0b').run()} className="w-4 h-4 rounded-full bg-orange-500 border border-white" />
                              <button type="button" onClick={() => editor.chain().focus().setColor('#facc15').run()} className="w-4 h-4 rounded-full bg-yellow-400 border border-white" />
                              <button type="button" onClick={() => editor.chain().focus().setColor('#84cc16').run()} className="w-4 h-4 rounded-full bg-lime-500 border border-white" />
                              <button type="button" onClick={() => editor.chain().focus().setColor('#3b82f6').run()} className="w-4 h-4 rounded-full bg-blue-500 border border-white" />
                              <button type="button" onClick={() => editor.chain().focus().setColor('#8b5cf6').run()} className="w-4 h-4 rounded-full bg-purple-500 border border-white" />
                              <button type="button" onClick={() => editor.chain().focus().setColor('#1f2937').run()} className="w-4 h-4 rounded-full bg-slate-900 border border-white" />
                              <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                              <button type="button" onClick={() => editor.chain().focus().insertContent(getDisclaimerHTML(draftArcSource)).run()} className="px-2 py-1 text-xs font-semibold rounded hover:bg-slate-200 text-slate-700">+Disclaimer</button>
                            </div>
                            <EditorContent editor={editor} />
                          </div>
                        )}
                        <div className={`flex items-center ${isMobile ? 'justify-center' : 'justify-end'}`}>
                          <button type="submit" disabled={savingReview} className={`bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-purple-700 transition shadow-sm disabled:opacity-50 ${isMobile ? 'w-full' : ''}`}>
                            {savingReview ? 'Saving Draft...' : 'Save Review Draft'}
                          </button>
                        </div>
                      </form>
                    </div>

                    <div className="space-y-4">
                      <KeyQuotesLog quotesList={quotesList} onAddQuote={handleLiveAddQuote} onRemoveQuote={handleLiveRemoveQuote} />

                      <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                        <button type="button" onClick={() => setIsPlatformsOpen(!isPlatformsOpen)} className="w-full flex items-center justify-between p-3.5 text-left font-bold text-xs uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition select-none">
                          <span className="flex items-center gap-2">📱 Intended Platforms {draftPlatforms.length > 0 && <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full font-bold normal-case">{draftPlatforms.length} Selected</span>}</span>
                          <span className="text-slate-400 text-sm font-semibold">{isPlatformsOpen ? '▲ Hide' : '▼ Expand'}</span>
                        </button>
                        {isPlatformsOpen && (
                          <div className="p-3.5 pt-0 border-t border-slate-100 mt-2">
                            <div className="grid grid-cols-1 gap-2 max-h-[190px] overflow-y-auto pr-1 pt-1">
                              {AVAILABLE_PLATFORMS.map((platform) => (
                                <label key={platform} className={`flex items-center gap-2 text-xs font-medium text-slate-700 bg-white p-2 rounded border cursor-pointer hover:bg-slate-50 transition select-none ${draftPlatforms.includes(platform) ? 'border-purple-200 bg-purple-50/50 text-purple-900' : 'border-slate-200'}`}>
                                  <input type="checkbox" checked={draftPlatforms.includes(platform)} onChange={() => handlePlatformCheckboxChange(platform)} className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4" />
                                  {platform}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ActivityChangelog
        bookId={activeChangelogBook?.title || ''}
        bookTitle={activeChangelogBook?.title || ''}
        author={activeChangelogBook?.author || ''}
        activities={getRecentActivities()}
        isOpen={isChangelogOpen}
        onClose={closeChangelog}
      />

      {isLoggingOut && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm">
          <div className="flex flex-col items-center justify-center gap-4">
            <img src="/mascots/ExitMascot.gif" alt="See you soon!" className="w-32 h-32 sm:w-40 sm:h-40" />
            <p className="text-white font-semibold text-lg">See you soon! 👋</p>
          </div>
        </div>
      )}
    </div>
  );
}
