'use client';

import React, { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { GenreManager } from '@/components/admin/GenreManager';
import { getAllGenres, addGenre, updateGenre, deleteGenre, type Genre } from '@/lib/firestore';
import { useToast } from '@/components/ui/Toast';

export default function AdminGenresPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchGenres();
  }, []);

  const fetchGenres = async () => {
    try {
      const data = await getAllGenres();
      setGenres(data);
    } catch (error) {
      console.error('Error fetching genres:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (data: { name: string; slug: string; mangaCount: number }) => {
    await addGenre(data);
    showToast(`Genre "${data.name}" added!`, 'success');
    fetchGenres();
  };

  const handleUpdate = async (id: string, data: Partial<Genre>) => {
    await updateGenre(id, data);
    showToast('Genre updated!', 'success');
    fetchGenres();
  };

  const handleDelete = async (id: string) => {
    await deleteGenre(id);
    showToast('Genre deleted!', 'success');
    fetchGenres();
  };

  return (
    <div>
      <AdminHeader title="Genre Manager" subtitle={`${genres.length} genres indexed`} />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-12 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl p-5 sm:p-6 border border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <GenreManager
            genres={genres}
            onAdd={handleAdd}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        </div>
      )}
    </div>
  );
}
