untuk auth :
auth belum user friendly baik kandidat maupun adminpsi
candidate : sherusnya gambar juga di round ga hanya placeholdernya aja
adminpsi : kasi logo asisya karena kan dia ga dinamis ya authnya jadi langsung kasi logo asisya

Admin Page :
- Button masi ga align untuk  pembagian kandidat dengan kelola psikolog juga kelola kode akses
- untuk fitur pengaturan konfigurasi organisasi khusus di admin di kasi popup dulu aja bahwa sedang dalam pengembangan kaya laporan jadi admi ga bisa buka opsi itu.
- warna kode di pengelolaan kode jangan gray harus hitam, begitu juga dengan text buller point di pembagian kandidat, harus hitam
- popup saat import kode peserta masi hitam backgorundnya yang menandakan dia page tersendiri bukan popup menjadi overlay.
- setelah di import hanya ada kode baru tapi nama kandidat (-)


Kandidat Page : 
- dashboard sudah benar kimia farma dan orange auth kandidat juga dibuat kimia farma dan orange kaya di dahsboard
- untuk tombol mengumpulkan di mode web belum ada
- Tombol Submit/Kumpulkan yang freeze dibagian bawah muncul mau di mobile dan di web view. (tulisan kumpulkan wajib kelihatan di format apapun mau web/mobile). pastikan tulisan mengumpulkan terlihat di mode apapun jangan hanya iconya, bahkan kondisi sekarang di web view ga ada fitur mengumpulkan dan melihat soal
- Pastikan tetap ada bar soal yangbisa dibuka & diminimize sewaktu" untuk memudahkan perpindahan soal di web maupun di mobile view harus ada.


  -- Untuk Psikolog:


1 of 1 error
Next.js (15.1.0) is outdated (learn more)

Unhandled Runtime Error

TypeError: Cannot read properties of null (reading 'charAt')

Source
src/app/admin/exams/[id]/page.tsx (157:62) @ charAt

  155 |                                         <td className="px-6 py-4 font-medium text-gray-800 flex items-center gap-2">
  156 |                                             <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
> 157 |                                                 {res.student.charAt(0)}
      |                                                              ^
  158 |                                             </div>
  159 |                                             {res.student}
  160 |                                         </td>

  - error ini antara status dan card ga sama, di card tulisanya yang ditugaskan padaku 2 tapi di status tulisanya ini 3 hasil yang di tugaskan untukmu


1. kasi Tag ujian yang memang dikasi/ditugaskan untuk user yang login (yang assign owner)
2. periksa API Detail jawaban kayanya authoritynya salah, harusnya kan untuk psikolog, soalnya ini psikolog gabisa masuk. begitupun untuk yang data diri Psikolog gabisa masuk untuk lihat
3. ingat untuk detail jawaban walaupun dia hanya menjawab satu di nomor 183, tulisan di detail jawaban ya juga 183. tampilkan soal yang terjawab aja ya kalau di web semisal terjawab 1,4,5,6 ya tampilkan itu aja. kalau di excel beda lagi format bisa dilihat di line 59 ++
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
