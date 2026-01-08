'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Upload, Image as ImageIcon, Building2, Palette, RefreshCw, ChevronDown, Trash2, Plus, X, Shield, Clock, Lock } from 'lucide-react';

interface Settings {
    company_name: string;
    company_tagline: string;
    logo_url: string;
    primary_color: string;
}

interface BrandingPreset {
    id: number;
    name: string;
    logo_url: string;
    company_name: string;
    company_tagline: string;
    primary_color: string;
    is_default: boolean;
    created_at: string;
}

interface AccessInfo {
    adminAccessEnabled: boolean;
    lastUpdate: string | null;
    lastUpdater: string | null;
    cooldownRemaining: number;
}

export default function AdminSettingsPage() {
    const router = useRouter();
    const [settings, setSettings] = useState<Settings>({
        company_name: 'Asisya Consulting',
        company_tagline: 'Platform asesmen psikologi profesional',
        logo_url: '/asisya.png',
        primary_color: '#0891b2'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [alertModal, setAlertModal] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({show: false, message: '', type: 'success'});
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Branding presets state
    const [presets, setPresets] = useState<BrandingPreset[]>([]);
    const [showPresetDropdown, setShowPresetDropdown] = useState(false);
    const [showSavePresetModal, setShowSavePresetModal] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    
    // Access control state
    const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null);
    const [hasAccess, setHasAccess] = useState(false);
    const [cooldownTimer, setCooldownTimer] = useState(0);

    useEffect(() => {
        fetchAccessInfo();
    }, []);

    useEffect(() => {
        if (hasAccess) {
            fetchSettings();
            fetchPresets();
        }
    }, [hasAccess]);

    // Cooldown timer
    useEffect(() => {
        if (cooldownTimer > 0) {
            const timer = setInterval(() => {
                setCooldownTimer(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [cooldownTimer]);

    const fetchAccessInfo = async () => {
        try {
            const res = await fetch('/api/settings/access');
            if (res.ok) {
                const data = await res.json();
                setAccessInfo(data);
                setHasAccess(data.adminAccessEnabled);
                if (data.cooldownRemaining > 0) {
                    setCooldownTimer(data.cooldownRemaining);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                setSettings({
                    company_name: data.company_name || 'Asisya Consulting',
                    company_tagline: data.company_tagline || 'Platform asesmen psikologi profesional',
                    logo_url: data.logo_url || '/asisya.png',
                    primary_color: data.primary_color || '#0891b2'
                });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchPresets = async () => {
        try {
            const res = await fetch('/api/settings/branding');
            if (res.ok) {
                const data = await res.json();
                setPresets(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSave = async () => {
        if (!hasAccess) {
            setAlertModal({ 
                show: true, 
                message: 'Hubungi super admin untuk mendapatkan akses fitur ini', 
                type: 'error' 
            });
            return;
        }

        if (cooldownTimer > 0) {
            setAlertModal({ 
                show: true, 
                message: `Mohon tunggu ${cooldownTimer} detik lagi sebelum menyimpan`, 
                type: 'error' 
            });
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            if (res.ok) {
                setAlertModal({ show: true, message: 'Pengaturan berhasil disimpan!', type: 'success' });
                setCooldownTimer(60);
                fetchAccessInfo();
            } else {
                const err = await res.json();
                if (err.cooldown) {
                    setCooldownTimer(err.remainingSeconds);
                }
                if (err.accessDenied) {
                    setHasAccess(false);
                }
                setAlertModal({ show: true, message: err.error || 'Gagal menyimpan pengaturan', type: 'error' });
            }
        } catch (err) {
            setAlertModal({ show: true, message: 'Terjadi kesalahan', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Compress image before saving
        const compressImage = (file: File, maxWidth: number = 200, quality: number = 0.8): Promise<string> => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;
                        
                        // Resize if larger than maxWidth
                        if (width > maxWidth) {
                            height = (height * maxWidth) / width;
                            width = maxWidth;
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        
                        const ctx = canvas.getContext('2d');
                        ctx?.drawImage(img, 0, 0, width, height);
                        
                        // Convert to compressed base64
                        const dataUrl = canvas.toDataURL('image/jpeg', quality);
                        resolve(dataUrl);
                    };
                    img.src = e.target?.result as string;
                };
                reader.readAsDataURL(file);
            });
        };

        try {
            const compressedDataUrl = await compressImage(file, 200, 0.8);
            setSettings(prev => ({ ...prev, logo_url: compressedDataUrl }));
        } catch {
            // Fallback to original if compression fails
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                setSettings(prev => ({ ...prev, logo_url: dataUrl }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSelectPreset = (preset: BrandingPreset) => {
        setSettings({
            logo_url: preset.logo_url,
            company_name: preset.company_name,
            company_tagline: preset.company_tagline,
            primary_color: preset.primary_color
        });
        setShowPresetDropdown(false);
    };

    const handleSaveCurrentPreset = async () => {
        if (!newPresetName.trim()) {
            setAlertModal({ show: true, message: 'Nama preset harus diisi', type: 'error' });
            return;
        }

        try {
            const res = await fetch('/api/settings/branding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: newPresetName, 
                    logo_url: settings.logo_url,
                    company_name: settings.company_name,
                    company_tagline: settings.company_tagline,
                    primary_color: settings.primary_color
                })
            });

            if (res.ok) {
                setAlertModal({ show: true, message: 'Preset berhasil disimpan!', type: 'success' });
                setShowSavePresetModal(false);
                setNewPresetName('');
                fetchPresets();
            } else {
                const err = await res.json();
                setAlertModal({ show: true, message: err.error || 'Gagal menyimpan preset', type: 'error' });
            }
        } catch (err) {
            setAlertModal({ show: true, message: 'Terjadi kesalahan', type: 'error' });
        }
    };

    const handleDeletePreset = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Yakin ingin menghapus preset ini?')) return;

        try {
            const res = await fetch(`/api/settings/branding?id=${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setAlertModal({ show: true, message: 'Preset berhasil dihapus', type: 'success' });
                fetchPresets();
            } else {
                const err = await res.json();
                setAlertModal({ show: true, message: err.error || 'Gagal menghapus preset', type: 'error' });
            }
        } catch (err) {
            setAlertModal({ show: true, message: 'Terjadi kesalahan', type: 'error' });
        }
    };

    // Find current preset match
    const currentPreset = presets.find(p => 
        p.logo_url === settings.logo_url && 
        p.company_name === settings.company_name && 
        p.company_tagline === settings.company_tagline && 
        p.primary_color === settings.primary_color
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // No access view
    if (!hasAccess) {
        return (
            <div className="min-h-screen bg-gray-50">
                {/* Navbar */}
                <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 shadow-sm sticky top-0 z-10">
                    <button
                        onClick={() => router.push('/admin/dashboard')}
                        className="text-gray-600 hover:text-gray-800"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <img src="/asisya.png" alt="Asisya" className="w-10 h-10 rounded-lg shadow-md" />
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Pengaturan Branding</h1>
                        <p className="text-xs text-gray-500">Kustomisasi tampilan untuk kandidat</p>
                    </div>
                </nav>

                <main className="max-w-2xl mx-auto p-6">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Lock size={40} className="text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">Akses Ditolak</h2>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                            Anda tidak memiliki akses untuk mengubah pengaturan branding. 
                            Hubungi Super Admin untuk mendapatkan akses fitur ini.
                        </p>
                        <button
                            onClick={() => router.push('/admin/dashboard')}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                            Kembali ke Dashboard
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <>
            {/* Alert Modal */}
            {alertModal.show && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
                        <div className={`w-16 h-16 ${alertModal.type === 'success' ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                            {alertModal.type === 'success' ? (
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{alertModal.type === 'success' ? 'Berhasil' : 'Error'}</h3>
                        <p className="text-gray-600 mb-6">{alertModal.message}</p>
                        <button
                            onClick={() => setAlertModal({ show: false, message: '', type: 'success' })}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            <div className="min-h-screen bg-gray-50">
                {/* Navbar */}
                <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/admin/dashboard')}
                            className="text-gray-600 hover:text-gray-800"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <img src="/asisya.png" alt="Asisya" className="w-10 h-10 rounded-lg shadow-md" />
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Pengaturan Branding</h1>
                            <p className="text-xs text-gray-500">Kustomisasi tampilan untuk kandidat</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {cooldownTimer > 0 && (
                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg text-sm">
                                <Clock size={16} />
                                <span>Tunggu {cooldownTimer}s</span>
                            </div>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={saving || cooldownTimer > 0}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-md"
                        >
                            <Save size={18} />
                            {saving ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </nav>

                <main className="max-w-4xl mx-auto p-6">
                    {/* Info Banner */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                                <Building2 size={20} className="text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-blue-900">Tentang Pengaturan Branding</h3>
                                <p className="text-sm text-blue-700 mt-1">
                                    Pengaturan ini hanya mempengaruhi tampilan untuk <strong>kandidat</strong> (halaman login kandidat, dashboard kandidat, dan halaman ujian).
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Cooldown Info */}
                    {accessInfo?.lastUpdate && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <Clock size={20} className="text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-medium text-amber-900">Info Cooldown</div>
                                    <div className="text-sm text-amber-700">
                                        Terakhir diubah: {new Date(accessInfo.lastUpdate).toLocaleString('id-ID')} 
                                        {accessInfo.lastUpdater && ` oleh ${accessInfo.lastUpdater === 'super_admin' ? 'Super Admin' : 'Admin Owner'}`}
                                    </div>
                                    <div className="text-xs text-amber-600 mt-1">
                                        Harus menunggu 1 menit setelah perubahan terakhir untuk menyimpan lagi.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Settings Cards */}
                    <div className="space-y-6">
                        {/* Branding Presets - Dropdown */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                    <RefreshCw size={20} className="text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Preset Branding Tersimpan</h2>
                                    <p className="text-sm text-gray-500">Pilih preset yang sudah disimpan untuk mengganti semua pengaturan sekaligus</p>
                                </div>
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                                    className="w-full flex items-center gap-4 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 bg-white"
                                >
                                    {/* Preview box */}
                                    <div className="w-12 h-12 border-2 border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden shrink-0">
                                        {settings.logo_url ? (
                                            <img src={settings.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <ImageIcon size={20} className="text-gray-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="font-medium text-gray-900 truncate">
                                            {currentPreset?.name || 'Pengaturan Kustom'}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">
                                            {settings.company_name} • {settings.primary_color}
                                        </div>
                                    </div>
                                    <ChevronDown size={18} className={`transition-transform shrink-0 ${showPresetDropdown ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {showPresetDropdown && (
                                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-auto">
                                        {presets.length === 0 ? (
                                            <div className="p-4 text-center text-gray-500 text-sm">Belum ada preset tersimpan</div>
                                        ) : (
                                            presets.map(preset => (
                                                <div
                                                    key={preset.id}
                                                    onClick={() => handleSelectPreset(preset)}
                                                    className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 ${
                                                        currentPreset?.id === preset.id ? 'bg-blue-50' : ''
                                                    }`}
                                                >
                                                    <div className="w-12 h-12 border-2 border-gray-200 rounded-lg flex items-center justify-center bg-white overflow-hidden shrink-0">
                                                        <img src={preset.logo_url} alt={preset.name} className="max-w-full max-h-full object-contain" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-gray-900 truncate">{preset.name}</div>
                                                        <div className="text-xs text-gray-500 truncate">{preset.company_name}</div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div 
                                                                className="w-4 h-4 rounded-full border border-gray-200" 
                                                                style={{ backgroundColor: preset.primary_color }}
                                                            />
                                                            <span className="text-xs text-gray-400">{preset.primary_color}</span>
                                                            {preset.is_default && (
                                                                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Default</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {!preset.is_default && (
                                                        <button
                                                            onClick={(e) => handleDeletePreset(preset.id, e)}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                                                            title="Hapus preset"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setShowSavePresetModal(true)}
                                className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                            >
                                <Plus size={16} />
                                Simpan Pengaturan Saat Ini sebagai Preset Baru
                            </button>
                        </div>

                        {/* Logo Setting */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <ImageIcon size={20} className="text-purple-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Logo Perusahaan</h2>
                                    <p className="text-sm text-gray-500">Logo yang ditampilkan di halaman kandidat</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                                {/* Preview */}
                                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden">
                                    {settings.logo_url ? (
                                        <img src={settings.logo_url} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                                    ) : (
                                        <ImageIcon size={40} className="text-gray-300" />
                                    )}
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div className="flex flex-wrap gap-2">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                                        >
                                            <Upload size={16} />
                                            Upload Logo Baru
                                        </button>
                                    </div>
                                    
                                    <p className="text-xs text-gray-500">Format: PNG, JPG, SVG. Maksimal 2MB. Rekomendasi: 200x200px</p>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Atau masukkan URL logo:</label>
                                        <input
                                            type="text"
                                            value={settings.logo_url}
                                            onChange={(e) => setSettings(prev => ({ ...prev, logo_url: e.target.value }))}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                                            placeholder="/asisya.png"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Company Name Setting */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <Building2 size={20} className="text-green-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Nama & Tagline Perusahaan</h2>
                                    <p className="text-sm text-gray-500">Nama yang ditampilkan di halaman kandidat</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nama Perusahaan</label>
                                    <input
                                        type="text"
                                        value={settings.company_name}
                                        onChange={(e) => setSettings(prev => ({ ...prev, company_name: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                        placeholder="Nama Perusahaan"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tagline</label>
                                    <input
                                        type="text"
                                        value={settings.company_tagline}
                                        onChange={(e) => setSettings(prev => ({ ...prev, company_tagline: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                        placeholder="Platform asesmen psikologi profesional"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Color Setting */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                    <Palette size={20} className="text-amber-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Warna Aksen</h2>
                                    <p className="text-sm text-gray-500">Warna utama untuk elemen UI di halaman kandidat</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <input
                                    type="color"
                                    value={settings.primary_color}
                                    onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                                    className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-200"
                                />
                                <div>
                                    <input
                                        type="text"
                                        value={settings.primary_color}
                                        onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                                        className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-mono"
                                        placeholder="#0891b2"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Format HEX color</p>
                                </div>
                            </div>
                        </div>

                        {/* Preview Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                        <RefreshCw size={20} className="text-slate-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">Preview</h2>
                                        <p className="text-sm text-gray-500">Pratinjau tampilan untuk kandidat</p>
                                    </div>
                                </div>
                            </div>

                            {/* Mock Login Preview */}
                            <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                                <div 
                                    className="h-32 flex items-center justify-center px-6"
                                    style={{ background: `linear-gradient(to bottom right, ${settings.primary_color}E6, ${settings.primary_color}F2)` }}
                                >
                                    <div className="flex items-center gap-3">
                                        {settings.logo_url && (
                                            <img src={settings.logo_url} alt="Logo" className="h-10 w-10 brightness-0 invert object-contain" />
                                        )}
                                        <div className="text-white">
                                            <h3 className="font-bold text-lg">{settings.company_name}</h3>
                                            <p className="text-white/80 text-sm">{settings.company_tagline}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 bg-white">
                                    <div className="max-w-xs mx-auto space-y-4">
                                        <div className="h-10 bg-gray-100 rounded-lg animate-pulse"></div>
                                        <button 
                                            className="w-full py-3 rounded-lg text-white font-bold"
                                            style={{ backgroundColor: settings.primary_color }}
                                        >
                                            Masuk
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Save Preset Modal */}
            {showSavePresetModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Simpan sebagai Preset Baru</h3>
                            <button onClick={() => setShowSavePresetModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 border-2 border-gray-200 rounded-lg flex items-center justify-center bg-white overflow-hidden">
                                    <img src={settings.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 truncate">{settings.company_name}</div>
                                    <div className="text-xs text-gray-500 truncate">{settings.company_tagline}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div 
                                            className="w-4 h-4 rounded-full border border-gray-200" 
                                            style={{ backgroundColor: settings.primary_color }}
                                        />
                                        <span className="text-xs text-gray-400">{settings.primary_color}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nama Preset</label>
                            <input
                                type="text"
                                value={newPresetName}
                                onChange={(e) => setNewPresetName(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                placeholder="Contoh: Branding Perusahaan ABC"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowSavePresetModal(false); setNewPresetName(''); }}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSaveCurrentPreset}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
