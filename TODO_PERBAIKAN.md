# 📋 TODO List - Perbaikan ASISYA Web (Update)

**Tanggal**: 9 Januari 2026  
**Status**: Sebagian besar sudah diperbaiki

---

## ✅ SUDAH DIPERBAIKI

### 1. ✅ Tabel `exam_answers` - FIXED
- Tabel sudah ada dan berfungsi
- Cache `.next` sudah di-clear

### 2. ✅ Import Codes → Nama "unnamed" - FIXED
- `candidate-login/route.ts` sekarang mengambil nama dari `metadata.candidate_name`
- User lama sudah di-update via SQL

### 3. ✅ Tombol Download di Admin Exams - FIXED
- Sudah ada tombol Download Semua, Download Ditugaskan, Download Filter Ini

### 4. ✅ Excel Nama dari user_profiles - FIXED
- Query sekarang menggunakan `COALESCE(up.full_name, u.full_name, u.username)`

### 5. ✅ Pembagian Psikolog dropdown nama kosong - FIXED
- Query `adminAssignmentsQuery` sekarang menggunakan `COALESCE(u.full_name, u.username)`
- Psikolog dengan `full_name = NULL` sekarang akan tampil dengan username mereka

### 6. ✅ Autosave jawaban - FIXED
- Mengubah debounce 3 detik menjadi throttle 1 detik
- Menambahkan `beforeunload` event untuk save sebelum refresh
- Menggunakan `navigator.sendBeacon` untuk reliable save on unload

---

## ⚠️ PERLU PERHATIAN

### 7. Data Diri Admin Access
- **Status**: Sudah benar, `canAccessPsychologistFeatures` include admin
- Fungsi `canAccessPsychologistFeatures()` sudah return true untuk role: `psychologist`, `admin`, `super_admin`
- Jika masih tidak bisa, cek apakah ada redirect atau error di network tab browser

### 8. Detail Jawaban - Data Lama Korup
- **Masalah**: Data lama memiliki `selected_option_id` yang tidak sesuai dengan `question_id`
- **Contoh**: Question 382 memiliki option_id 773 yang seharusnya milik question 381
- **Penyebab**: Bug lama di frontend atau import data
- **Data baru sudah benar**: Tabel `exam_answers` tidak memiliki mismatch
- **Solusi untuk data lama**: Perlu clean-up data atau re-test dengan kandidat baru

---

## 🔧 STRUKTUR DATA

### Tabel `exam_answers` (draft/autosave saat ujian)
- Digunakan saat ujian berlangsung
- Data benar, tidak ada mismatch

### Tabel `answers` (final submit)
- Diisi saat submit ujian
- Data lama ada yang korup (option_id tidak match dengan question_id)

---

## 📝 CATATAN PENTING

### MMPI Test
- MMPI adalah tes psikologi, tidak ada "jawaban benar/salah"
- Semua opsi pertama di database memiliki `is_correct = true` (designed for MMPI)
- Untuk exam MMPI, display "benar/salah" tidak relevan
- Pertimbangkan menambahkan flag `exam_type` untuk membedakan tes akademis vs psikologi

---

## 🧪 TESTING YANG DIPERLUKAN

1. **Test autosave**:
   - Buka halaman ujian
   - Pilih beberapa jawaban
   - Refresh halaman
   - Cek apakah jawaban ter-restore

2. **Test download buttons**:
   - Login sebagai admin
   - Buka halaman hasil ujian
   - Cek tombol download muncul dan berfungsi

3. **Test psikolog filter**:
   - Login sebagai psikolog
   - Buka halaman hasil ujian
   - Cek dropdown menampilkan semua psikolog dengan nama yang benar

4. **Test data diri**:
   - Login sebagai admin
   - Buka detail kandidat
   - Cek apakah data diri tampil

---

## 📊 RINGKASAN FILE YANG DIUBAH

| File | Perubahan |
|------|-----------|
| `src/app/api/auth/candidate-login/route.ts` | Ambil nama dari metadata saat create user |
| `src/app/admin/exams/[id]/page.tsx` | Tambah download buttons |
| `src/app/api/admin/exams/[id]/download/route.ts` | COALESCE untuk nama dari user_profiles |
| `src/app/api/admin/exams/[id]/results/route.ts` | COALESCE untuk admin_name |
| `src/app/candidate/exam/[id]/page.tsx` | Autosave dengan throttle + beforeunload |
