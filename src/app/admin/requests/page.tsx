'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, MessageSquare, Trash2, ThumbsUp } from 'lucide-react';
import {
  getAllRequests,
  updateRequest,
  deleteRequest,
  type MangaRequest,
} from '@/lib/firestore';
import { useToast } from '@/components/ui/Toast';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { DeleteConfirm } from '@/components/admin/DeleteConfirm';

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

type StatusFilter = 'all' | 'pending' | 'approved' | 'completed' | 'rejected';

export default function AdminRequestsPage() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<MangaRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [noteTarget, setNoteTarget] = useState<MangaRequest | null>(null);
  const [noteText, setNoteText] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MangaRequest | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      const data = await getAllRequests();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  }

  const filtered = statusFilter === 'all'
    ? requests
    : requests.filter((r) => r.status === statusFilter);

  const handleStatusChange = async (id: string, status: MangaRequest['status'], note?: string) => {
    setActionLoading(id);
    try {
      const updateData: Partial<MangaRequest> = { status };
      if (note) updateData.adminNote = note;
      await updateRequest(id, updateData);
      showToast(`Request ${status}!`, 'success');
      await fetchRequests();
      setNoteTarget(null);
      setNoteText('');
    } catch (error) {
      console.error('Error updating request:', error);
      showToast('Failed to update request', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRequest(deleteTarget.id);
      showToast('Request deleted!', 'success');
      setDeleteTarget(null);
      await fetchRequests();
    } catch (error) {
      console.error('Error deleting request:', error);
      showToast('Failed to delete request', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    completed: requests.filter((r) => r.status === 'completed').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  return (
    <div>
      <AdminHeader
        title="User Requests"
        subtitle="Review, approve, and manage community manga requests"
      />

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {(['all', 'pending', 'approved', 'completed', 'rejected'] as StatusFilter[]).map((status) => {
          const active = statusFilter === status;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1.5 border transition-colors ${
                active
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
              <span className="font-mono-num opacity-80">({counts[status]})</span>
            </button>
          );
        })}
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <MessageSquare size={36} className="mx-auto text-[var(--text-muted)] mb-3" />
          <p className="text-[var(--text-muted)] text-sm">No requests found for this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((request) => {
            const status = statusConfig[request.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            const isLoading = actionLoading === request.id;
            return (
              <div
                key={request.id}
                className="rounded-xl p-4 sm:p-5 border border-[var(--border-color)] bg-[var(--bg-secondary)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
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
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-2 leading-relaxed">
                      {request.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                      <span>by {request.requestedBy}</span>
                      <span className="inline-flex items-center gap-1 font-mono-num">
                        <ThumbsUp size={11} />
                        {request.upvotes}
                      </span>
                      {request.createdAt && (
                        <span className="font-mono-num">
                          {new Date(request.createdAt.seconds * 1000).toLocaleDateString()}
                        </span>
                      )}
                      {request.adminNote && (
                        <span className="text-[var(--accent)] font-medium">Note: {request.adminNote}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(request.id, 'approved')}
                          disabled={isLoading}
                          className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          onClick={() => { setNoteTarget(request); setNoteText(''); }}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Reject with note"
                        >
                          <XCircle size={16} />
                        </button>
                      </>
                    )}
                    {request.status === 'approved' && (
                      <button
                        onClick={() => handleStatusChange(request.id, 'completed')}
                        disabled={isLoading}
                        className="p-1.5 rounded-lg text-sky-500 hover:bg-sky-500/10 transition-colors"
                        title="Mark Complete"
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(request)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note Modal (for rejection) */}
      <AnimatePresence>
        {noteTarget && (
          <>
            <div className="fixed inset-0 z-40 bg-black/55" onClick={() => setNoteTarget(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md rounded-xl p-6 border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl"
            >
              <h3 className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)] mb-2">
                Reject Request — Add Note
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                {noteTarget.mangaTitle}
              </p>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:border-[var(--accent)] mb-4"
                placeholder="Optional rejection reason..."
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setNoteTarget(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleStatusChange(noteTarget.id, 'rejected', noteText || undefined)}
                  className="btn-accent text-xs py-2 px-4"
                >
                  Reject
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DeleteConfirm
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget?.mangaTitle || ''}
        loading={deleting}
      />
    </div>
  );
}
