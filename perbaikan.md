NOTE WAJIB :aku merasa ada banyak miss API tolong audit 
- authority pastikan setiap page di masing" auth autorirynya sesua tadi aku menemukan beberapa fitur yang aku temui padahal aku nemunya di admin aku malah gabisa buka di admin tapi aku harus jadi super admin atau psikologi dulu dan lain-lain
- kode di kelola kode akses harusnya warna hitam
- bullet point di pembagian kandidat textnya harusnya hitam
- API di pembagian kandidat masih salah, aku tidak bisa melihat datanya, data tidak muncul 
- waktu pengerjaan akan auto submit apabila waktu < 0 / == 0 (walaupun user tidak on session akan tetap terkumpul)
- ada bug ketika kandidat refresh waktu kembali/ ke reset ke waktu awal yang ditentukan.
- nama dir masi banyak salah
- API tiap card di tiap page di audit apakah berjalan dengan benar
- ada kotak putih di adminpsi auth yang belum berlogo asisya dan di auth candidate yang bagian putihnya belum dinamis mengikuti fitur perubahan logo.
- pastikan auth kandidat dan admin mobile friendly.

yo may implement this also 
1. DATABASE POOL (lib/db.ts)
    allowExitOnIdle: false (prevent pool death in serverless)
    max connections: 20 → 50 (for 800 users)
    min connections: 2 → 10 (warm pool)
   
2. RATE LIMITING (lib/ratelimit.ts)
    Changed from fail-open → fail-closed in production
    Blocks requests if Redis down (security)
   
3. INPUT VALIDATION (lib/validation.ts) - NEW FILE
    Manual validation tanpa external dependency
    validateGenerateCodes, validateSubmitExam, validateProfile
   
4. EXAM QUESTIONS API (api/candidate/exam/[id]/questions)
    Map lookup O(1) instead of filter O(N*M)
    90% faster question loading
   
5. SUBMIT EXAM API (api/candidate/exam/[id]/submit)
    Input validation added
    Explicit type casting: ANY($1::int[])
   
6. DATABASE INDEXES (database-indexes.sql)
    27 indexes created for optimal queries
    Login: 500ms → 30ms (94% faster)
    Dashboard: 800ms → 150ms (81% faster)

[2026-01-08]
7. SETTINGS API CACHING (api/settings/route.ts)
    In-memory cache with 30s TTL
    Cache invalidation on update
    Index on site_settings(setting_key)

8. LOGO IMAGE COMPRESSION (admin/settings, superadmin/settings)
    Client-side image compression before upload
    Max 200px width, JPEG quality 80%
    Reduces base64 from ~26KB to ~3-5KB

9. SESSION COOKIE FIX (api/superadmin/*)
    Fixed getSession() missing cookie parameter
    Proper cookie extraction from cookies() store

10. ADMIN DASHBOARD UI FIX (admin/dashboard/page.tsx)
     Fixed card button alignment with flexbox
     Equal height cards with flex-grow on descriptions
     Buttons aligned at bottom with mt-auto

11. PSYCHOLOGIST EXAM FILTER (api/psychologist/exams, api/admin/exams)
     Psychologist ONLY see exams assigned to them
     Admin/Super Admin see ALL exams
     Filter via exam_assessors table

12. DATABASE POOL OPTIMIZATION (lib/db.ts)
     max connections: 50 → 100 (2x capacity)
     min connections: 10 → 20 (warm pool)
     Reduced timeouts for faster failover (30s → 20s)
     connectionTimeout: 5s → 3s

13. CACHE LIBRARY (lib/cache.ts) - NEW FILE
     In-memory cache with Redis fallback
     getCached(), invalidateCache(), setCache()
     Auto-cleanup expired entries

14. CANDIDATE DASHBOARD CACHING (api/candidate/dashboard)
     30 second cache per user
     Cache invalidation on exam submit
     Expected: 150ms → <30ms (80% faster)

15. ADMIN STATS CACHING (api/admin/stats)
     60 second cache per admin
     Removed console.log debug statements

dan untuk fitur yang aku mau aman adalah.

--untuk Super Admin: 
1. di beberapa fungsi API masih salah sehingga fungsi tidak bisa berjalan dengan benar
2. pengelolaan LOGO dan tema tolong realisasikan tetapi hanya affect di kandidat aja ya, jadi yang bisa diganti adalah logo, warna tema auth, dan text yang di auth candidate. fitur sudah ada tetapi API masi belum benar dan pastikan kau membenarkan fitur yang sama di admin

--untuk admin owner :
1. admin bisa membuat code dengan cepat, bisa download template, bisa import data. dan bisa download data. semua format adalah xlsx.
Rincian : 
- isi tabel template adalah nama dan rentang/masa berlaku kode
- pastikan bisa import
- popup import tidak boleh beda directory atau beda page harus menjadi popup overlay di ...admin/codes
- export harus jadi xlsx biar tabel jelas
2. button pembagian kandidat masi kurang sejajar dengan card kanan kirinya
3. Fitur Laporan kasi PopUp bahwa fitur ini masi dalam tahap pengembangan 
4. Soft delete berhasil di backend tetapi di frontend masi belum buktinya masi ada itemnya saat dihapus (terutama di pengelolaan kode)

-- Untuk Psikolog:
1. kasi Tag ujian yang memang dikasi/ditugaskan untuk user yang login (yang assign owner)
2. periksa API Detail jawaban kayanya authoritynya salah, harusnya kan untuk psikolog, soalnya ini psikolog gabisa masuk. begitupun untuk yang data diri Psikolog gabisa masuk untuk lihat
3. ingat untuk detail jawaban walaupun dia hanya menjawab satu di nomor 183, tulisan di detail jawaban ya juga 183.
4. untuk fitur ketika melihat detail jawaban untuk alur data sudah benar yaitu yang tampil/kelihatan adalah yang di assign ke psikolog tersebut. namun disiini ada kesalahan logic : 
    - Psikolog Harus tetap Bisa melihat semua jawaban peserta baik yang sudah selesai maupun belum (kalau belum, ada label belum selesai) yaitu dengan menggunakan filter diatas 
    semua : show all participant yang mengikuti MMPI test
    per psikolog : dropdown sesuai dengan pembagian yang ada di Admin page, patikan API nya benar.
    cntoh : semisal 
            -Dodo : di assign 7
            -dodi : di assign 5
            -bahrun : di assign 8
        nah nanti yang keluar di app ya sesuai pembagian itu.
5. Ada fitur Download data dari hasil jawaban peserta untuk formatnya adalah xlsx, bisa download hanya untuk peserta yang di assign atau bisa download semuanya.

contoh:
format excel/xlsx :
TAB 1 : Nama, Gender, jawaban (jadi jawaban mengikuti ke kanan sampai 183)
No	Nama	Gender	1	2	3 4 5 6 7 8 9 10 .. 183
1	Bager	Laki-laki	benar		
2	Testering	Laki-laki	salah		
TAB 2 : Data diri 
No	Nama	Email	Jenis Kelamin	Tanggal Lahir	Usia	Alamat KTP	NIK	Pendidikan	Pekerjaan	Lokasi Test	Status Perkawinan	Nilai	Waktu Selesai
1	Bager	admin@demo.com	Laki-laki	1/1/2018	7	adnjladnladsla	1236972391628913	SMP	Pelajar	Surabaya	-	0	2/1/2026, 13.57.07
2	Testering	candidate_ldp3gb58298t@candidate.local	Laki-laki	9/5/2000	25	Rungkut	1234567890123456	SMA/K	SMO	Surabaya	-	1	7/1/2026, 02.32.12
6. Dalam pembuatan soal ada fitur bullet point dengan text itu memudahkan apabila ada soal yang menggunakan skala.



--untuk peserta :
1. error saat submit data diri :
<!-- Profile fetch error: error: column "tanggal_lahir" does not exist
    at async query (src/lib/db.ts:77:19)
    at async GET (src/app/api/candidate/profile-completion/route.ts:18:25)
  75 | export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  76 |     const start = Date.now();
> 77 |     const result = await pool.query(text, params);
     |                   ^
  78 |     const duration = Date.now() - start;
  79 |
  80 |     // Log slow queries {
  length: 113,
  severity: 'ERROR',
  code: '42703',
  detail: undefined,
  hint: undefined,
  position: '19',
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
  file: 'parse_relation.c',
  line: '3721',
  routine: 'errorMissingColumn'
}
 GET /api/candidate/profile-completion 500 in 972ms
Profile fetch error: error: column "tanggal_lahir" does not exist
    at async query (src/lib/db.ts:77:19)
    at async GET (src/app/api/candidate/profile-completion/route.ts:18:25)
  75 | export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  76 |     const start = Date.now();
> 77 |     const result = await pool.query(text, params);
     |                   ^
  78 |     const duration = Date.now() - start;
  79 |
  80 |     // Log slow queries {
  length: 113,
  severity: 'ERROR',
  code: '42703',
  detail: undefined,
  hint: undefined,
  position: '19',
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
  file: 'parse_relation.c',
  line: '3721',
  routine: 'errorMissingColumn'
}
 GET /api/candidate/profile-completion 500 in 147ms
✅ DB connection established
Profile save error: error: column "tanggal_lahir" of relation "users" does not exist
    at async query (src/lib/db.ts:77:19)
    at async POST (src/app/api/candidate/profile-completion/route.ts:66:8)
  75 | export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  76 |     const start = Date.now();
> 77 |     const result = await pool.query(text, params);
     |                   ^
  78 |     const duration = Date.now() - start;
  79 |
  80 |     // Log slow queries {
  length: 133,
  severity: 'ERROR',
  code: '42703',
  detail: undefined,
  hint: undefined,
  position: '67',
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
  file: 'analyze.c',
  line: '2536',
  routine: 'transformUpdateTargetList'
}
 POST /api/candidate/profile-completion 500 in 339ms -->
2. Pastikan semua page yang dilewati kandidat mobile user friendly.
3. Tombol Submit/Kumpulkan yang freeze dibagian bawah muncul mau di mobile dan di web view. (tulisan kumpulkan wajib kelihatan di format apapun mau web/mobile). pastikan tulisan mengumpulkan terlihat di mode apapun jangan hanya iconya, bahkan kondisi sekarang di web view ga ada fitur mengumpulkan dan melihat soal
4. Pastikan tetap ada bar soal yangbisa dibuka & diminimize sewaktu" untuk memudahkan perpindahan soal di web maupun di mobile view harus ada.
5. perubahan tampilan UI !!! untuk di dashboard peserta semua tulisan perusahaan Asisya diganti dengan Kimia Farma. untuk logo bisa diganti menggunakan logo kimia farma /Users/macos/Documents/UNIV/SM5/Asisya/asisya-web-clean/Kimia Farma Logo.jpg dan ubah menjadi warna orange.
6. pastikan semua API disini benar.

SETELAH SEMMUA INI KAMU WAJIB CURLING UNTUK MEMASTIKAN TIAP FUNGSI BERJALAN. dengan curling
kamu juga bisa lihat /Users/macos/Documents/UNIV/SM5/Asisya/asisya-web-clean/saran.md untuk ide optimalisasi performance aplikasi.

TETAP IKUTI BEST PRACTICE DAN DAHULUKAN KECEPATAN APLIKASI DAN PERFORMA INGAT INI APLIKASI UNTK USER SKALA BESAR PASTIKAN CONNECTION POOL BISA UNTUK 800 orang 