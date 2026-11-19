'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PublicLayout } from '@/components/layout/PublicLayout';
import {
  getAllGenres,
  addRequest,
  upvoteRequest,
  getAllRequests as fetchAllRequests,
  type Genre,
  type MangaRequest as MangaRequestType,
} from '@/lib/firestore';
import { ThumbsUp, MessageSquare, Send, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const statusConfig = {
  pending: {
    icon: Clock,
    label: 'Pending',
    badgeClass: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  approved: {
    icon: CheckCircle,
    label: 'Approved',
    badgeClass: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  completed: {
    icon: CheckCircle,
    label: 'Completed',
    badgeClass: 'text-sky-700 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
  },
  rejected: {
    icon: XCircle,
    label: 'Rejected',
    badgeClass: 'text-red-700 dark:text-red-400 bg-red-500/10 border-red-500/20',
  },
};

export default function RequestsPage() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<MangaRequestType[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [formTitle, setFormTitle] = useState('');
  const [formTitleBn, setFormTitleBn] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formName, setFormName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'upvotes'>('upvotes');

  useEffect(() => {
    async function fetchData() {
      try {
        const [requestsData, genresData] = await Promise.all([
          fetchAllRequests(),
          getAllGenres(),
        ]);
        setRequests(requestsData);
        setGenres(genresData);
      } catch (error) {
        console.error('Error fetching requests:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const sortedRequests = [...requests].sort((a, b) => {
    if (sortBy === 'upvotes') return b.upvotes - a.upvotes;
    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) return;
    setSubmitting(true);
    try {
      let userId = localStorage.getItem('iskultrip-user-id');
      if (!userId) {
        userId = 'user_' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('iskultrip-user-id', userId);
      }

      await addRequest({
        mangaTitle: formTitle,
        mangaTitleBn: formTitleBn || undefined,
        description: formDescription,
        requestedBy: formName || 'anonymous',
        status: 'pending',
        upvotes: 0,
        upvotedBy: [],
        createdAt: undefined as unknown as never,
        updatedAt: undefined as unknown as never,
      });
      showToast('Request submitted successfully!', 'success');
      setFormTitle('');
      setFormTitleBn('');
      setFormDescription('');
      setFormName('');
      const data = await fetchAllRequests();
      setRequests(data);
    } catch (error) {
      console.error('Error submitting request:', error);
      showToast('Failed to submit request. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (request: MangaRequestType) => {
    let userId = localStorage.getItem('iskultrip-user-id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('iskultrip-user-id', userId);
    }
    try {
      await upvoteRequest(request.id, userId);
      const data = await fetchAllRequests();
      setRequests(data);
    } catch (error) {
      console.error('Error upvoting:', error);
    }
  };

  const genreSlugs = genres.map((g) => ({ name: g.name, slug: g.slug }));
  const inputClass =
    'w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-colors border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:border-[var(--accent)]';

  return (
    <PublicLayout genres={genreSlugs}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="pb-6 mb-8 border-b border-[var(--border-color)]"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-1.5">
            Community Index
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
            Manga Requests
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5">
            Suggest a series to be added or updated on MangaBD and upvote community favorites.
          </p>
        </motion.header>

        {/* Request Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl p-5 sm:p-6 mb-10 border border-[var(--border-color)] bg-[var(--bg-secondary)]"
        >
          <h2 className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <MessageSquare size={18} className="text-[var(--accent)]" />
            Submit New Request
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">
                  Manga Title (EN) *
                </label>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="e.g. Solo Leveling"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">
                  Alternate / Local Title (Optional)
                </label>
                <input
                  value={formTitleBn}
                  onChange={(e) => setFormTitleBn(e.target.value)}
                  className={inputClass}
                  placeholder="Optional alternate title"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">
                Details / Notes *
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                required
                rows={3}
                className={inputClass}
                placeholder="Share a link or note on why you want this series indexed..."
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">
                Your Name (Optional)
              </label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className={inputClass}
                placeholder="Anonymous"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-accent inline-flex items-center gap-2 text-sm"
            >
              <Send size={15} />
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </motion.form>

        {/* Sort Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="font-display text-xl font-bold tracking-tight text-[var(--text-primary)]">
            All Requests <span className="font-mono-num text-sm font-normal text-[var(--text-muted)]">({requests.length})</span>
          </h2>
          <div className="flex gap-2">
            {[
              { id: 'upvotes' as const, label: 'Most Upvoted' },
              { id: 'newest' as const, label: 'Newest' },
            ].map((tab) => {
              const active = sortBy === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSortBy(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-28 rounded-xl" />
            ))}
          </div>
        ) : sortedRequests.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-center py-14 px-6">
            <MessageSquare size={36} className="mx-auto text-[var(--text-muted)] mb-3" strokeWidth={1.6} />
            <h3 className="font-display text-lg font-bold text-[var(--text-primary)] mb-1">
              No Requests Yet
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              Be the first reader to suggest a title above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedRequests.map((request, index) => {
              const status = statusConfig[request.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="rounded-xl p-4 sm:p-5 border border-[var(--border-color)] bg-[var(--bg-secondary)]"
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => handleUpvote(request)}
                      className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[var(--accent)] hover:bg-[var(--accent-glow)] transition-colors flex-shrink-0"
                    >
                      <ThumbsUp size={15} className="text-[var(--accent)]" />
                      <span className="font-mono-num text-xs font-bold text-[var(--text-primary)]">
                        {request.upvotes}
                      </span>
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
                          {request.mangaTitle || request.mangaTitleBn}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${status.badgeClass}`}
                        >
                          <StatusIcon size={10} />
                          {status.label}
                        </span>
                      </div>
                      {request.mangaTitleBn && request.mangaTitle && (
                        <p className="text-xs text-[var(--text-muted)] mb-1">{request.mangaTitleBn}</p>
                      )}
                      <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-2.5 leading-relaxed">
                        {request.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                        <span>Requested by {request.requestedBy}</span>
                        {request.createdAt && (
                          <span className="font-mono-num">
                            {new Date(request.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              timeZone: 'UTC',
                            })}
                          </span>
                        )}
                        {request.adminNote && (
                          <span className="text-[var(--accent)] flex items-center gap-1 font-medium">
                            <AlertCircle size={12} />
                            Admin: {request.adminNote}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
