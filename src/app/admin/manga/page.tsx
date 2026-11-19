'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { MangaTable } from '@/components/admin/MangaTable';
import { DeleteConfirm } from '@/components/admin/DeleteConfirm';
import { Pagination } from '@/components/ui/Pagination';
import { SearchInput } from '@/components/browse/SearchInput';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { getAllManga, deleteManga, type Manga } from '@/lib/firestore';
import { useToast } from '@/components/ui/Toast';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminMangaPage() {
  const [allManga, setAllManga] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Manga | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    fetchManga();
  }, []);

  const fetchManga = async () => {
    try {
      const data = await getAllManga();
      setAllManga(data);
    } catch (error) {
      console.error('Error fetching manga:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredManga = useMemo(() => {
    if (!debouncedSearch) return allManga;
    const q = debouncedSearch.toLowerCase();
    return allManga.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.titleBn && m.titleBn.includes(debouncedSearch))
    );
  }, [allManga, debouncedSearch]);

  const { currentItems, currentPage, totalPages, goToPage, hasNext, hasPrev } =
    usePagination(filteredManga, 20);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteManga(deleteTarget.id);
      showToast(`"${deleteTarget.title}" deleted successfully`, 'success');
      setDeleteTarget(null);
      fetchManga();
    } catch {
      showToast('Failed to delete manga', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <AdminHeader
        title="All Manga"
        subtitle={`${allManga.length} total series`}
        actions={
          <Link href="/admin/manga/add" className="btn-accent inline-flex items-center gap-2 text-sm">
            <PlusCircle size={15} /> Add Manga
          </Link>
        }
      />

      <div className="max-w-sm mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Search manga..." />
      </div>

      <div className="rounded-xl overflow-x-auto border border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <MangaTable
          manga={currentItems}
          onDelete={setDeleteTarget}
          loading={loading}
        />
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
        hasNext={hasNext}
        hasPrev={hasPrev}
      />

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
