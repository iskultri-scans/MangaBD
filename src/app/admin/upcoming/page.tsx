'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Clock, X, Calendar } from 'lucide-react';
import {
  getAllUpcomingReleases,
  addUpcomingRelease,
  deleteUpcomingRelease,
  type UpcomingRelease,
} from '@/lib/firestore';
import { useToast } from '@/components/ui/Toast';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { DeleteConfirm } from '@/components/admin/DeleteConfirm';
import { Timestamp } from 'firebase/firestore';

const defaultForm = {
  title: '',
  titleBn: '',
  mangaId: '',
  mangaSlug: '',
  coverImage: '',
  releaseDate: '',
  description: '',
};

export default function AdminUpcomingPage() {
  const { showToast } = useToast();
  const [releases, setReleases] = useState<UpcomingRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UpcomingRelease | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchReleases();
  }, []);

  async function fetchReleases() {
    setLoading(true);
    try {
      const data = await getAllUpcomingReleases();
      setReleases(data);
    } catch (error) {
      console.error('Error fetching upcoming releases:', error);
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    setForm(defaultForm);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.releaseDate) return;
    setSubmitting(true);
    try {
      await addUpcomingRelease({
        title: form.title,
        titleBn: form.titleBn || undefined,
        mangaId: form.mangaId || undefined,
        mangaSlug: form.mangaSlug || undefined,
        coverImage: form.coverImage || undefined,
        releaseDate: Timestamp.fromDate(new Date(form.releaseDate)),
        description: form.description || undefined,
        createdAt: Timestamp.now(),
      });
      showToast('Upcoming release added!', 'success');
      resetForm();
      await fetchReleases();
    } catch (error) {
      console.error('Error adding upcoming release:', error);
      showToast('Failed to add upcoming release', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUpcomingRelease(deleteTarget.id);
      showToast('Release deleted!', 'success');
      setDeleteTarget(null);
      await fetchReleases();
    } catch (error) {
      console.error('Error deleting release:', error);
      showToast('Failed to delete release', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-lg text-sm outline-none border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:border-[var(--accent)] transition-colors';

  return (
    <div>
      <AdminHeader
        title="Upcoming Releases"
        subtitle="Schedule and manage upcoming chapter and series releases"
        actions={
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="btn-accent inline-flex items-center gap-2 text-sm"
          >
            {showForm ? <X size={15} /> : <Plus size={15} />}
            {showForm ? 'Cancel' : 'Add Release'}
          </button>
        }
      />

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <form
              onSubmit={handleSubmit}
              className="rounded-xl p-5 sm:p-6 space-y-4 border border-[var(--border-color)] bg-[var(--bg-secondary)]"
            >
              <h3 className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)]">
                New Upcoming Release
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Title (EN) *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    required
                    className={inputClass}
                    placeholder="e.g. Solo Leveling Chapter 200"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Alternate Title (Optional)</label>
                  <input
                    value={form.titleBn}
                    onChange={(e) => setForm((p) => ({ ...p, titleBn: e.target.value }))}
                    className={inputClass}
                    placeholder="Optional alternate title"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Release Date &amp; Time *</label>
                  <input
                    type="datetime-local"
                    value={form.releaseDate}
                    onChange={(e) => setForm((p) => ({ ...p, releaseDate: e.target.value }))}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Cover Image URL</label>
                  <input
                    value={form.coverImage}
                    onChange={(e) => setForm((p) => ({ ...p, coverImage: e.target.value }))}
                    className={inputClass}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Manga Slug (for link)</label>
                  <input
                    value={form.mangaSlug}
                    onChange={(e) => setForm((p) => ({ ...p, mangaSlug: e.target.value }))}
                    className={inputClass}
                    placeholder="e.g. solo-leveling"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Manga ID (optional)</label>
                  <input
                    value={form.mangaId}
                    onChange={(e) => setForm((p) => ({ ...p, mangaId: e.target.value }))}
                    className={inputClass}
                    placeholder="Firestore document ID"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className={inputClass}
                  placeholder="Brief description of this release..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-accent text-xs py-2.5 px-5"
                >
                  {submitting ? 'Adding...' : 'Add Release'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-lg text-xs border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Releases List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-16 rounded-lg" />
          ))}
        </div>
      ) : releases.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <Calendar size={36} className="mx-auto text-[var(--text-muted)] mb-3" />
          <p className="text-[var(--text-muted)] text-sm">No upcoming releases. Add one above!</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] divide-y divide-[var(--border-color)]">
          {releases.map((release) => {
            const isPast = release.releaseDate.toMillis() < Date.now();
            return (
              <div
                key={release.id}
                className={`flex items-center justify-between px-4 py-3.5 transition-colors group ${
                  isPast ? 'bg-red-500/5' : 'hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span
                    className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                      isPast
                        ? 'bg-red-500/10 text-red-500'
                        : 'bg-[var(--accent-glow)] text-[var(--accent)]'
                    }`}
                  >
                    <Clock size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {release.title || release.titleBn}
                    </p>
                    <p className="font-mono-num text-xs text-[var(--text-muted)]">
                      {release.releaseDate.toDate().toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                      {isPast && ' — Past due'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => setDeleteTarget(release)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DeleteConfirm
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget?.title || ''}
        loading={deleting}
      />
    </div>
  );
}
