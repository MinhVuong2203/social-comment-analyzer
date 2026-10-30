import { useState, useMemo } from 'react';
import { mockReplies } from '../utils/mockData';
import ReplyCard from '../components/comments/ReplyCard';
import '../assets/styles/Comment.css';

const FILTERS = [
  { id: 'all',      label: 'All',      count: 184 },
  { id: 'positive', label: 'Positive', count: 78  },
  { id: 'neutral',  label: 'Neutral',  count: 70  },
  { id: 'negative', label: 'Negative', count: 36  },
];

const SORT_OPTIONS = ['Newest', 'Most Toxic', 'Positive', 'Negative'];

export default function CommentsPage() {
  const [search,         setSearch]   = useState('');
  const [activeFilter,   setFilter]   = useState('all');
  const [sort,           setSort]     = useState('Newest');
  const [showSortMenu,   setShowSort] = useState(false);
  const [showNewBanner,  setShowNew]  = useState(true);

  const filtered = useMemo(() => {
    let list = [...mockReplies];
    if (activeFilter !== 'all')
      list = list.filter(r => r.sentiment === activeFilter);
    if (search.trim())
      list = list.filter(r =>
        r.content.toLowerCase().includes(search.toLowerCase()) ||
        r.username.toLowerCase().includes(search.toLowerCase())
      );
    return list;
  }, [activeFilter, search]);

  return (
    <div className="ct-wrap">

      {/* Header */}
      <div className="ct-header">
        <div className="ct-title-row">
          <h2 className="ct-title">
            Replies <span className="ct-live-badge">184 Live</span>
          </h2>
          <span className="ct-model-badge">● PhoBERT v2.1</span>
        </div>
        <p className="ct-subtitle">184 replies analyzed by multi-layer PhoBERT model</p>
      </div>

      {/* Search */}
      <div className="ct-search-row">
        <div className="ct-search-wrap">
          <span className="ct-search-icon">🔍</span>
          <input
            className="ct-search"
            placeholder="Search by keyword, @username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="ct-search-tag">1K</span>
      </div>

      {/* Filter bar */}
      <div className="ct-filter-bar">
        <span className="ct-filter-label">SEMANTIC FILTER</span>
        <div className="ct-sort-wrap" onClick={() => setShowSort(s => !s)}>
          <span className="ct-sort-btn">↕ {sort}</span>
          {showSortMenu && (
            <div className="ct-sort-menu">
              {SORT_OPTIONS.map(o => (
                <div
                  key={o}
                  className={`ct-sort-item ${sort === o ? 'active' : ''}`}
                  onClick={() => { setSort(o); setShowSort(false); }}
                >
                  {o}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chips */}
      <div className="ct-chips">
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`ct-chip ${activeFilter === f.id ? 'active' : ''} ct-chip--${f.id}`}
            onClick={() => setFilter(f.id)}
          >
            {f.id !== 'all' && <span className={`ct-chip-dot ct-chip-dot--${f.id}`} />}
            {f.label} {f.count}
          </button>
        ))}
      </div>

      {/* Reply list */}
      <div className="ct-list">
        {filtered.map(reply => (
          <ReplyCard key={reply.id} reply={reply} />
        ))}
      </div>

      {/* New banner */}
      {showNewBanner && (
        <div className="ct-new-banner">
          <span className="ct-new-dot" />
          <span className="ct-new-text">Detected <strong>24 new replies</strong></span>
          <button className="ct-analyze-btn">⚡ Analyze now</button>
          <button className="ct-close-btn" onClick={() => setShowNew(false)}>✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="ct-stats-row">
        <span className="ct-stat ct-stat--pos">● 424 Positive</span>
        <span className="ct-stat ct-stat--neu">● 334 Neutral</span>
        <span className="ct-stat ct-stat--neg">● 123 Toxic</span>
      </div>

    </div>
  );
}