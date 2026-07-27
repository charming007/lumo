'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export function AdminDirectory({
  title,
  count,
  searchPlaceholder,
  action,
  children,
}: {
  title: string;
  count: number;
  searchPlaceholder: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const normalizedQuery = query.trim().toLowerCase();
    root.querySelectorAll<HTMLElement>('[data-directory-item]').forEach((item) => {
      const haystack = `${item.dataset.search ?? ''} ${item.textContent ?? ''}`.toLowerCase();
      item.hidden = Boolean(normalizedQuery) && !haystack.includes(normalizedQuery);
    });
  }, [query]);

  return (
    <section
      ref={rootRef}
      className="admin-directory"
      data-view={view}
      style={{ border: '1px solid #e5e7ef', borderRadius: 26, background: 'rgba(255,255,255,0.86)', boxShadow: '0 22px 60px rgba(76, 83, 112, 0.07)', padding: 'clamp(18px, 3vw, 28px)', display: 'grid', gap: 24, marginTop: 20, minWidth: 0, maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', minWidth: 0 }}>
          <h2 style={{ margin: 0, color: '#151827', fontSize: 'clamp(20px, 2.4vw, 26px)', fontWeight: 850 }}>
            {title} ({count})
          </h2>
          <div aria-label="View mode" style={{ display: 'inline-flex', padding: 3, border: '1px solid #e1e6ef', borderRadius: 14, background: '#ffffff', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)' }}>
            <button type="button" onClick={() => setView('list')} aria-pressed={view === 'list'} title="List view" style={toggleStyle(view === 'list')}>
              List
            </button>
            <button type="button" onClick={() => setView('grid')} aria-pressed={view === 'grid'} title="Grid view" style={toggleStyle(view === 'grid')}>
              Grid
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 320px', justifyContent: 'flex-end', flexWrap: 'wrap', minWidth: 0, maxWidth: '100%' }}>
          <label style={{ position: 'relative', flex: '1 1 260px', width: '100%', maxWidth: 420, minWidth: 0, boxSizing: 'border-box' }}>
            <span aria-hidden="true" style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: '#7b8496', fontSize: 14, fontWeight: 850 }}>S</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', border: 0, outline: 0, background: '#f7f8fb', borderRadius: 15, padding: '14px 16px 14px 44px', fontSize: 15, color: '#151827', boxShadow: 'inset 0 0 0 1px #eef1f6' }}
            />
          </label>
          {action}
        </div>
      </div>
      <div>{children}</div>
      <style>{`
        .admin-directory [data-directory-view='grid'] {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .admin-directory [data-directory-view='list'] {
          display: none;
        }

        .admin-directory[data-view='list'] [data-directory-view='grid'] {
          display: none;
        }

        .admin-directory[data-view='list'] [data-directory-view='list'] {
          display: grid;
          gap: 10px;
        }

        .admin-directory [data-directory-item][hidden] {
          display: none !important;
        }

        @media (max-width: 1180px) {
          .admin-directory [data-directory-view='grid'] {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .admin-directory [data-directory-view='grid'] {
            grid-template-columns: minmax(0, 1fr);
          }

          .admin-directory[data-view='list'] [data-directory-item] {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </section>
  );
}

function toggleStyle(active: boolean) {
  return {
    minWidth: 58,
    height: 38,
    border: 0,
    borderRadius: 11,
    background: active ? '#0B73D9' : 'transparent',
    color: active ? '#ffffff' : '#202436',
    fontSize: 13,
    fontWeight: 850,
    cursor: 'pointer',
    lineHeight: 1,
  } as const;
}
