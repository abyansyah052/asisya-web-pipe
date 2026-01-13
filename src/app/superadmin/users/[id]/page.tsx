'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Mail, Calendar, MapPin, Briefcase, GraduationCap, CreditCard } from 'lucide-react';

interface CandidateDetail {
    id: number;
    username: string;
    email: string;
    full_name: string;
    created_at: string;
    profile_completed: boolean;
    profile?: {
        nomor_peserta: number;
        tanggal_lahir: string;
        usia: number;
        jenis_kelamin: string;
        pendidikan_terakhir: string;
        pekerjaan: string;
        lokasi_test: string;
        alamat_ktp: string;
        nik: string;
    };
}

export default function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string>('');

    useEffect(() => {
        params.then(p => setUserId(p.id));
    }, [params]);

    useEffect(() => {
        if (!userId) return;
        fetchCandidateDetail();
    }, [userId]);

    const fetchCandidateDetail = async () => {
        try {
            const res = await fetch(`/api/superadmin/users/${userId}`);
            if (res.ok) {
                const data = await res.json();
                setCandidate(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;
    if (!candidate) return <div className="p-8">Kandidat tidak ditemukan</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/superadmin/users')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} className="text-gray-700" />
                    </button>
                    <img src="/asisya.png" alt="Asisya" className="h-10 w-auto" />
                    <div>
                        <h1 className="text-xl font-bold text-blue-800">Detail Kandidat</h1>
                        <p className="text-xs text-gray-500">Informasi lengkap kandidat</p>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto p-6 mt-6">
                {/* Header Card */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 mb-6">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-800 font-bold text-4xl">
                                {candidate.full_name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">{candidate.full_name}</h2>
                            <div className="flex items-center gap-4 text-gray-600">
                                <div className="flex items-center gap-2">
                                    <User size={16} />
                                    <span>@{candidate.username}</span>
                                </div>
                                {candidate.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail size={16} />
                                        <span>{candidate.email}</span>
                                    </div>
                                )}
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                                <Calendar size={16} className="text-gray-400" />
                                <span className="text-sm text-gray-500">
                                    Terdaftar: {new Date(candidate.created_at).toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>
                        </div>
                        <div>
                            <span className={`px-4 py-2 rounded-full text-sm font-bold ${candidate.profile_completed
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-500'
                                }`}>
                                {candidate.profile_completed ? 'Profil Lengkap' : 'Profil Belum Lengkap'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Profile Data */}
                {candidate.profile_completed && candidate.profile ? (
                    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Data Diri</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Nomor Peserta */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-2">Nomor Peserta</label>
                                <div className="flex items-center gap-2 text-gray-900">
                                    <CreditCard size={18} className="text-gray-400" />
                                    <span className="text-lg font-medium">{candidate.profile.nomor_peserta}</span>
                                </div>
                            </div>

                            {/* NIK */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-2">NIK</label>
                                <div className="flex items-center gap-2 text-gray-900">
                                    <CreditCard size={18} className="text-gray-400" />
                                    <span className="text-lg font-medium">{candidate.profile.nik}</span>
                                </div>
                            </div>

                            {/* Tanggal Lahir */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-2">Tanggal Lahir</label>
                                <div className="flex items-center gap-2 text-gray-900">
                                    <Calendar size={18} className="text-gray-400" />
                                    <span className="text-lg">
                                        {candidate.profile.tanggal_lahir
                                            ? new Date(candidate.profile.tanggal_lahir).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                            })
                                            : '-'
                                        }
                                    </span>
                                </div>
                            </div>

                            {/* Usia */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-2">Usia</label>
                                <div className="flex items-center gap-2 text-gray-900">
                                    <User size={18} className="text-gray-400" />
                                    <span className="text-lg">{candidate.profile.usia} tahun</span>
                                </div>
                            </div>

                            {/* Jenis Kelamin */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-2">Jenis Kelamin</label>
                                <div className="flex items-center gap-2 text-gray-900">
                                    <User size={18} className="text-gray-400" />
                                    <span className="text-lg">{candidate.profile.jenis_kelamin}</span>
                                </div>
                            </div>

                            {/* Pendidikan Terakhir */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-2">Pendidikan Terakhir</label>
                                <div className="flex items-center gap-2 text-gray-900">
                                    <GraduationCap size={18} className="text-gray-400" />
                                    <span className="text-lg">{candidate.profile.pendidikan_terakhir}</span>
                                </div>
                            </div>

                            {/* Pekerjaan */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-2">Pekerjaan</label>
                                <div className="flex items-center gap-2 text-gray-900">
                                    <Briefcase size={18} className="text-gray-400" />
                                    <span className="text-lg">{candidate.profile.pekerjaan}</span>
                                </div>
                            </div>

                            {/* Lokasi Test */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-2">Lokasi Test</label>
                                <div className="flex items-center gap-2 text-gray-900">
                                    <MapPin size={18} className="text-gray-400" />
                                    <span className="text-lg">{candidate.profile.lokasi_test}</span>
                                </div>
                            </div>

                            {/* Alamat KTP */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-600 mb-2">Alamat KTP</label>
                                <div className="flex items-start gap-2 text-gray-900">
                                    <MapPin size={18} className="text-gray-400 mt-1" />
                                    <span className="text-lg">{candidate.profile.alamat_ktp}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-12 text-center">
                        <User size={48} className="mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Profil Belum Dilengkapi</h3>
                        <p className="text-gray-500">Kandidat belum melengkapi data diri mereka.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
