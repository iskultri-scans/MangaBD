'use client';

import React, { useState } from 'react';
import { Edit, Trash2, Plus } from 'lucide-react';
import { slugify } from '@/lib/utils';
import { DeleteConfirm } from './DeleteConfirm';
import type { Genre } from '@/lib/firestore';

interface GenreManagerProps {
  genres: Genre[];
  onAdd: (data: { name: string; slug: string; mangaCount: number }) => Promise<void>;
  onUpdate: (id: string, data: Partial<Genre>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function GenreManager({ genres, onAdd, onUpdate, onDelete }: GenreManagerProps) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Genre | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await onAdd({ name: newName.trim(), slug: slugify(newName.trim()), mangaCount: 0 });
      setNewName('');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    setLoading(true);
    try {
      await onUpdate(id, { name: editName.trim(), slug: slugify(editName.trim()) });
      setEditingId(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Add Genre */}
      <div className="flex gap-3 mb-6">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New genre name..."
          className="flex-1 px-3.5 py-2.5 rounded-lg text-sm outline-none border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:border-[var(--accent)]"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={loading || !newName.trim()}
          className="btn-accent flex items-center gap-2 text-sm"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-color)]">
              <th className="text-left py-3 px-3 text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Name</th>
              <th className="text-left py-3 px-3 text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Slug</th>
              <th className="text-left py-3 px-3 text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Count</th>
              <th className="text-right py-3 px-3 text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {genres.map((genre) => (
              <tr key={genre.id} className="border-b last:border-0 border-[var(--border-color)] hover:bg-[var(--bg-subtle)] transition-colors">
                <td className="py-2.5 px-3">
                  {editingId === genre.id ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="px-2.5 py-1 rounded text-sm outline-none border border-[var(--accent)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate(genre.id)}
                      autoFocus
                    />
                  ) : (
                    <span className="text-[var(--text-primary)] font-medium">{genre.name}</span>
                  )}
                </td>
                <td className="py-2.5 px-3 font-mono-num text-xs text-[var(--text-muted)]">{genre.slug}</td>
                <td className="py-2.5 px-3 font-mono-num text-[var(--text-secondary)]">{genre.mangaCount}</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center justify-end gap-1.5">
                    {editingId === genre.id ? (
                      <button onClick={() => handleUpdate(genre.id)} className="text-xs text-[var(--accent)] font-semibold px-2 py-1">
                        Save
                      </button>
                    ) : (
                      <button
                        onClick={() => { setEditingId(genre.id); setEditName(genre.name); }}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(genre)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DeleteConfirm
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget?.name || ''}
        loading={loading}
      />
    </div>
  );
}
