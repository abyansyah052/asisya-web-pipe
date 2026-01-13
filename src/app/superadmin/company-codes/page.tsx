'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, Plus, Search, Edit2, Trash2, Check, X,
  AlertCircle, RefreshCw, ChevronLeft, ChevronRight, ArrowLeft
} from 'lucide-react';

interface CompanyCode {
  id: number;
  code: string;
  company_name: string;
  organization_id: number | null;
  organization_name: string | null;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

interface Organization {
  id: number;
  name: string;
}

export default function CompanyCodesPage() {
  const router = useRouter();
  const [companyCodes, setCompanyCodes] = useState<CompanyCode[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState<CompanyCode | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    companyName: '',
    organizationName: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchCompanyCodes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/superadmin/company-codes');

      if (res.status === 401 || res.status === 403) {
        router.push('/');
        return;
      }

      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      setCompanyCodes(data);
    } catch (err) {
      setError('Gagal memuat data kode perusahaan');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchOrganizations = useCallback(async () => {
    try {
      const res = await fetch('/api/superadmin/clients');
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data);
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    }
  }, []);

  useEffect(() => {
    fetchCompanyCodes();
    fetchOrganizations();
  }, [fetchCompanyCodes, fetchOrganizations]);

  // Filter data
  const filteredCodes = companyCodes.filter(code => {
    const matchesSearch =
      code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (code.organization_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredCodes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCodes = filteredCodes.slice(startIndex, startIndex + itemsPerPage);

  const handleAddCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const res = await fetch('/api/superadmin/company-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code,
          companyName: formData.companyName,
          organizationName: formData.organizationName || null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat kode perusahaan');
      }

      setSuccess('Kode perusahaan berhasil dibuat!');
      setShowAddModal(false);
      setFormData({ code: '', companyName: '', organizationName: '' });
      fetchCompanyCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCode) return;

    setFormLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/superadmin/company-codes/${selectedCode.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code,
          companyName: formData.companyName,
          organizationName: formData.organizationName || null,
          isActive: selectedCode.is_active
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengupdate kode perusahaan');
      }

      setSuccess('Kode perusahaan berhasil diupdate!');
      setShowEditModal(false);
      setSelectedCode(null);
      fetchCompanyCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCode = async () => {
    if (!selectedCode) return;

    setFormLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/superadmin/company-codes/${selectedCode.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus kode perusahaan');
      }

      setSuccess('Kode perusahaan berhasil dihapus!');
      setShowDeleteModal(false);
      setSelectedCode(null);
      fetchCompanyCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setFormLoading(false);
    }
  };

  const toggleStatus = async (code: CompanyCode) => {
    try {
      const res = await fetch(`/api/superadmin/company-codes/${code.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.code,
          companyName: code.company_name,
          organizationName: code.organization_name || null,
          isActive: !code.is_active
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal mengubah status');
      }

      setSuccess(`Status kode ${code.code} berhasil diubah`);
      fetchCompanyCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah status');
    }
  };

  const openEditModal = (code: CompanyCode) => {
    setSelectedCode(code);
    setFormData({
      code: code.code,
      companyName: code.company_name,
      organizationName: code.organization_name || ''
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (code: CompanyCode) => {
    setSelectedCode(code);
    setShowDeleteModal(true);
  };

  // Auto clear messages
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Memuat data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/superadmin/dashboard')}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={24} />
          </button>
          <img src="/asisya.png" alt="Asisya" className="h-10 w-auto" />
          <div>
            <h1 className="text-xl font-bold text-blue-800">Kode Perusahaan</h1>
            <p className="text-xs text-gray-500">Kelola kode prefix perusahaan (4 digit tengah)</p>
          </div>
        </div>
        <button
          onClick={() => {
            setFormData({ code: '', companyName: '', organizationName: '' });
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Kode
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <Check className="w-5 h-5" />
            {success}
          </div>
        )}

        {/* Info Card */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Format Kode Peserta</h3>
          <p className="text-blue-700 text-sm">
            <code className="bg-blue-100 px-2 py-1 rounded">MMYY-XXXX-NNNN</code>
          </p>
          <ul className="mt-2 text-sm text-blue-600 space-y-1">
            <li>• <strong>MMYY</strong>: Bulan dan tahun pembuatan kode</li>
            <li>• <strong>XXXX</strong>: Kode perusahaan (dikelola di halaman ini)</li>
            <li>• <strong>NNNN</strong>: Nomor urut otomatis</li>
          </ul>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari kode atau nama perusahaan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Perusahaan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organisasi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Penggunaan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedCodes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {searchQuery ? 'Tidak ada data yang cocok' : 'Belum ada kode perusahaan'}
                  </td>
                </tr>
              ) : (
                paginatedCodes.map((code) => (
                  <tr key={code.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-lg font-bold text-blue-600">{code.code}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{code.company_name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-500">{code.organization_name || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-600">{code.usage_count} kode peserta</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleStatus(code)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${code.is_active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                      >
                        {code.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(code)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(code)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                          disabled={code.usage_count > 0}
                        >
                          <Trash2 className={`w-4 h-4 ${code.usage_count > 0 ? 'opacity-30' : ''}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredCodes.length)} dari {filteredCodes.length} data
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">Tambah Kode Perusahaan</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCode} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kode (4 digit)</label>
                <input
                  type="text"
                  maxLength={4}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg text-center tracking-widest"
                  placeholder="0000"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Kode unik 4 digit (0000-9999)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Perusahaan</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="PT Contoh Indonesia"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organisasi (Opsional)</label>
                <input
                  type="text"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nama organisasi (opsional)"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading || formData.code.length !== 4}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {formLoading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">Edit Kode Perusahaan</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditCode} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kode (4 digit)</label>
                <input
                  type="text"
                  maxLength={4}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg text-center tracking-widest"
                  placeholder="0000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Perusahaan</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="PT Contoh Indonesia"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organisasi (Opsional)</label>
                <input
                  type="text"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nama organisasi (opsional)"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading || formData.code.length !== 4}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {formLoading ? 'Menyimpan...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Hapus Kode Perusahaan?</h3>
              <p className="text-gray-500 text-center mb-6">
                Apakah Anda yakin ingin menghapus kode <strong>{selectedCode.code}</strong> ({selectedCode.company_name})?
                {selectedCode.usage_count > 0 && (
                  <span className="block mt-2 text-red-600 font-medium">
                    ⚠️ Kode ini sudah digunakan {selectedCode.usage_count} kali dan tidak dapat dihapus!
                  </span>
                )}
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteCode}
                  disabled={formLoading || selectedCode.usage_count > 0}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {formLoading ? 'Menghapus...' : 'Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
