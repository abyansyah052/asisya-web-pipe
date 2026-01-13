'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Calendar, CreditCard, GraduationCap, Briefcase, MapPin } from 'lucide-react';

export default function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [candidate, setCandidate] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [candidateId, setCandidateId] = useState<string>('');

    useEffect(() => {
        params.then(p => setCandidateId(p.id));
    }, [params]);

    useEffect(() => {
        if (!candidateId) return;
        const fetchCandidate = async () => {
            try {
                const res = await fetch(`/api/admin/candidates/${candidateId}`);
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
        fetchCandidate();
    }, [candidateId]);

    if (loading) return <div className="p-8">Loading...</div>;
    if (!candidate) return <div className="p-8">Kandidat tidak ditemukan</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6 font-sans">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <img src="/asisya.png" alt="Asisya" className="w-10 h-10 rounded-lg" />
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-gray-500 hover:text-gray-800"
                    >
                        <ArrowLeft size={18} className="mr-2" /> Kembali
                    </button>
                </div>

                {/* Header Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                    <div className="flex items-start gap-4">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-800 to-blue-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                            {candidate.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-800 mb-1">{candidate.full_name || '-'}</h1>
                            <p className="text-gray-500 mb-1">@{candidate.username}</p>
                            <p className="text-gray-500 mb-2">{candidate.email}</p>
                            <p className="text-sm text-gray-400">
                                Terdaftar: {new Date(candidate.created_at).toLocaleDateString('id-ID', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                            <div className="mt-3">
                                {candidate.profile_completed ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                        Profile Lengkap
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                        Profile Belum Lengkap
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Profile Data */}
                {candidate.profile_completed && candidate.profile ? (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Data Diri Kandidat</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-800 flex-shrink-0">
                                    <CreditCard size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Nomor Peserta</p>
                                    <p className="text-sm font-semibold text-gray-800">{candidate.nomor_peserta || '-'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-800 flex-shrink-0">
                                    <CreditCard size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">NIK</p>
                                    <p className="text-sm font-semibold text-gray-800">{candidate.profile.nik || '-'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-800 flex-shrink-0">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Tanggal Lahir</p>
                                    <p className="text-sm font-semibold text-gray-800">
                                        {candidate.profile.tanggal_lahir
                                            ? new Date(candidate.profile.tanggal_lahir).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                            })
                                            : '-'
                                        }
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-800 flex-shrink-0">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Usia</p>
                                    <p className="text-sm font-semibold text-gray-800">{candidate.profile.usia ? `${candidate.profile.usia} tahun` : '-'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-800 flex-shrink-0">
                                    <User size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Jenis Kelamin</p>
                                    <p className="text-sm font-semibold text-gray-800">{candidate.profile.jenis_kelamin || '-'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-800 flex-shrink-0">
                                    <GraduationCap size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Pendidikan Terakhir</p>
                                    <p className="text-sm font-semibold text-gray-800">{candidate.profile.pendidikan_terakhir || '-'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-800 flex-shrink-0">
                                    <Briefcase size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Pekerjaan</p>
                                    <p className="text-sm font-semibold text-gray-800">{candidate.profile.pekerjaan || '-'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-800 flex-shrink-0">
                                    <MapPin size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Lokasi Test</p>
                                    <p className="text-sm font-semibold text-gray-800">{candidate.profile.lokasi_test || '-'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 md:col-span-2">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-800 flex-shrink-0">
                                    <MapPin size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Alamat KTP</p>
                                    <p className="text-sm font-semibold text-gray-800">{candidate.profile.alamat_ktp || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center text-gray-500">
                        Kandidat belum melengkapi data profil.
                    </div>
                )}
            </div>
        </div>
    );
}
