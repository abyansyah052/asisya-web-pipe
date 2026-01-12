'use client';

import { useState, useEffect } from 'react';
import { Upload, FileDown, Plus, Pencil, BarChart3, LogOut, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';

interface Exam {
    id: number;
    title: string;
    status: string;
    description: string;
    question_count: number;
    exam_type?: 'general' | 'mmpi' | 'pss' | 'srq29';
}

export default function AdminDashboard() {
    const router = useRouter();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [totalCandidates, setTotalCandidates] = useState(0);
    const [deleteModal, setDeleteModal] = useState<{show: boolean, examId: number | null}>({show: false, examId: null});
    const [verificationCode, setVerificationCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchExams();
        fetchTotalCandidates();
    }, []);

    const fetchExams = async () => {
        try {
            const res = await fetch('/api/admin/exams');
            if (res.ok) {
                const data = await res.json();
                setExams(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTotalCandidates = async () => {
        try {
            const res = await fetch('/api/admin/candidates/count');
            if (res.ok) {
                const data = await res.json();
                setTotalCandidates(data.count);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteClick = (examId: number) => {
        const exam = exams.find(e => e.id === examId);
        if (exam?.exam_type === 'pss' || exam?.exam_type === 'srq29') {
            alert(`Ujian ${exam.exam_type === 'pss' ? 'PSS' : 'SRQ-29'} tidak dapat dihapus karena merupakan soal standar sistem.`);
            return;
        }
        setDeleteModal({show: true, examId});
        setCodeSent(false);
        setVerificationCode('');
    };

    const sendVerificationCode = async () => {
        setSendingCode(true);
        try {
            const res = await fetch('/api/admin/exams/send-verification', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ examId: deleteModal.examId })
            });
            if (res.ok) {
                setCodeSent(true);
                alert('Kode verifikasi telah dikirim ke berkasaby@gmail.com');
            } else {
                alert('Gagal mengirim kode verifikasi');
            }
        } catch (e) {
            alert('Terjadi kesalahan');
        } finally {
            setSendingCode(false);
        }
    };

    const handleDeleteExam = async () => {
        if (!verificationCode.trim()) {
            alert('Masukkan kode verifikasi');
            return;
        }
        setDeleting(true);
        try {
            const res = await fetch('/api/admin/exams/delete', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ examId: deleteModal.examId, code: verificationCode })
            });
            if (res.ok) {
                alert('Ujian berhasil dihapus');
                setDeleteModal({show: false, examId: null});
                fetchExams();
            } else {
                const error = await res.json();
                alert(error.error || 'Gagal menghapus ujian');
            }
        } catch (e) {
            alert('Terjadi kesalahan');
        } finally {
            setDeleting(false);
        }
    };

    const downloadTemplate = () => {
        // Defines the columns: 'question', 'options' (comma separated or specific format), 'correct_answer'
        const ws = XLSX.utils.json_to_sheet([
            {
                question: "Contoh: Apa warna bendera Indonesia?",
                options: "Merah Putih; Hitam Putih; Biru Kuning; Hijau",
                correct_answer: "Merah Putih"
            }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Template_Soal_Asisya.xlsx");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;

        const file = e.target.files[0];
        const examTitle = prompt("Masukkan Judul Ujian untuk soal-soal ini:");
        if (!examTitle) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', examTitle);

        try {
            const res = await fetch('/api/admin/exams/upload', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                alert("Upload sukses! Ujian baru telah dibuat.");
                fetchExams();
            } else {
                const err = await res.json();
                alert("Upload gagal: " + err.error);
            }
        } catch (error) {
            alert("Terjadi kesalahan saat upload.");
        } finally {
            setUploading(false);
            // Reset input
            e.target.value = '';
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/');
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10 backdrop-blur-sm bg-white/95">
                <div className="flex items-center gap-3">
                    <img src="/asisya.png" alt="Asisya" className="w-10 h-10 rounded-lg shadow-md" />
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Portal Ujian Asisya</h1>
                        <p className="text-xs text-gray-500">Sistem Ujian Online</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full">
                        <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-white text-sm font-bold">
                            A
                        </div>
                        <span className="text-gray-700 text-sm font-medium">Administrator</span>
                    </div>
                    <button 
                        onClick={handleLogout} 
                        className="text-red-600 hover:text-red-700 flex items-center gap-2 text-sm border border-red-300 px-4 py-2 rounded-lg hover:bg-red-50 transition-all shadow-sm"
                    >
                        <LogOut size={16} />
                        <span className="hidden md:inline">Logout</span>
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-6">

                {/* Actions Bar */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Kelola Ujian</h2>
                        <p className="text-gray-500 text-sm">Upload soal excel, pantau hasil, dan kelola ujian.</p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => router.push('/admin/exams/create')}
                            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-md"
                        >
                            <Plus size={18} />
                            Buat Ujian Manual
                        </button>

                        <button
                            onClick={downloadTemplate}
                            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <FileDown size={18} />
                            Download Template
                        </button>

                        <div className="relative">
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={uploading}
                            />
                            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md w-full">
                                {uploading ? (
                                    <span className="animate-spin">⏳</span>
                                ) : (
                                    <Upload size={18} />
                                )}
                                {uploading ? "Mengupload..." : "Upload Excel Soal"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats / Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 text-sm font-medium mb-1">Total Ujian</div>
                        <div className="text-3xl font-bold text-gray-800">{exams.length}</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 text-sm font-medium mb-1">Total Peserta</div>
                        <div className="text-3xl font-bold text-gray-800">{totalCandidates}</div>
                    </div>
                </div>

                {/* Exam List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-semibold text-gray-700">Daftar Ujian Aktif</h3>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Memuat data...</div>
                    ) : exams.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                <FileDown size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Belum ada ujian</h3>
                            <p className="text-gray-500 mt-1">Silakan upload file excel untuk membuat ujian baru.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                                    <th className="px-6 py-3 font-medium">Judul Ujian</th>
                                    <th className="px-6 py-3 font-medium">Tipe Ujian</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium">Jumlah Soal</th>
                                    <th className="px-6 py-3 font-medium text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {exams.map((exam) => (
                                    <tr key={exam.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-800">{exam.title}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                exam.exam_type === 'pss' ? 'bg-blue-100 text-blue-800' :
                                                exam.exam_type === 'srq29' ? 'bg-orange-100 text-orange-800' :
                                                exam.exam_type === 'mmpi' ? 'bg-purple-100 text-purple-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {exam.exam_type === 'pss' ? 'PSS' : 
                                                 exam.exam_type === 'srq29' ? 'SRQ-29' : 
                                                 exam.exam_type === 'mmpi' ? 'MMPI' : 
                                                 'Umum'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${exam.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {exam.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{exam.question_count}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <button
                                                    onClick={() => router.push(`/admin/exams/edit/${exam.id}`)}
                                                    className="text-orange-600 hover:text-orange-800 font-medium text-sm inline-flex items-center gap-1"
                                                >
                                                    <Pencil size={16} /> Edit
                                                </button>
                                                <button
                                                    onClick={() => router.push(`/admin/exams/${exam.id}`)}
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm inline-flex items-center gap-1"
                                                >
                                                    <BarChart3 size={16} /> Hasil
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(exam.id)}
                                                    disabled={exam.exam_type === 'pss' || exam.exam_type === 'srq29'}
                                                    className={`font-medium text-sm inline-flex items-center gap-1 ${
                                                        exam.exam_type === 'pss' || exam.exam_type === 'srq29'
                                                            ? 'text-gray-400 cursor-not-allowed'
                                                            : 'text-red-600 hover:text-red-800'
                                                    }`}
                                                    title={exam.exam_type === 'pss' || exam.exam_type === 'srq29' ? 'Ujian standar tidak dapat dihapus' : ''}
                                                >
                                                    <Trash2 size={16} /> Hapus
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>

            {/* Delete Verification Modal */}
            {deleteModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-scale-in">
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                                <Trash2 className="h-8 w-8 text-red-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Hapus Ujian</h3>
                            <p className="text-gray-600 mb-6">
                                Untuk menghapus ujian ini, kami akan mengirimkan kode verifikasi ke <strong>berkasaby@gmail.com</strong>
                            </p>
                            
                            {!codeSent ? (
                                <div className="space-y-4">
                                    <button
                                        onClick={sendVerificationCode}
                                        disabled={sendingCode}
                                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
                                    >
                                        {sendingCode ? 'Mengirim...' : 'Kirim Kode Verifikasi'}
                                    </button>
                                    <button
                                        onClick={() => setDeleteModal({show: false, examId: null})}
                                        className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                                    >
                                        Batal
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="text-left">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Kode Verifikasi</label>
                                        <input
                                            type="text"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value)}
                                            placeholder="Masukkan 6 digit kode"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 font-semibold text-lg"
                                            maxLength={6}
                                        />
                                    </div>
                                    <button
                                        onClick={handleDeleteExam}
                                        disabled={deleting}
                                        className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
                                    >
                                        {deleting ? 'Menghapus...' : 'Hapus Ujian'}
                                    </button>
                                    <button
                                        onClick={() => setDeleteModal({show: false, examId: null})}
                                        className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                                    >
                                        Batal
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
