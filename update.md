Disisni kita akan ada update fitur, pergantian logic dan laporan error.

- di superadmin fitur kelola B2B error atau mungkin dia apinya salah
- di admin di pembagian kandidat ganti namanya jadi pembagian peserta dan disana kasi fitur search peserta kecil diatas kolom peserta di sebelah kanan.
- saat psikolog liat nilai di salah satu ujian contohnya di test 1, dia langsung memperlihatkan hanya yang di assign ke dia, nah disana kan ada tombol semua. aku mau jika itu dipencet maka akan menampilkan semua hasil kandidat. aku suka hasil excelnya soalnya dia sudah sangat benar.
- untuk di admin dan psikolog aku mau kita juga bisa lihat semua kandidat, baik yang selesai maupun yang belum. (yang belum mengerjakan atau start tidak dihitung )
- untuk code peserta aku mau sekarang ada 12 nomer aja, nanti tolong ganti di UI peserta juga.

formatnya adalah : bulan,tahun - tipe,kodeperusahaa - nomor peserta
contoh : 0126 - 2010 - 0001
nah untuk kode perusahaan itu ada sistemasinya.
jadi nanti superadmin harus bikin kode perusahaan dengan nama perusahaannya.
nanti saat admin mau generate kode/import kode selalu ada pertanyaan wajib yaitu dropdown pilihan nama perusaanya.
semisal superadmin bikin kimia farma adalah 2010->admin memilih kimia farma maka semua nomor tersebut nantinya ditengahnilainya akan 2010.  ingat kode bisa di tambah dan hapus. kode tidak bisa diedit/dihapus apabila sudah dipakai oleh user.


ada 2 soal seperti MMPI baru yang tidak bisa dihapus. 


ada pop up peringatan sebelum ujian kaya MMPI untuk 2 soal tersebut

Soal 1 : PERCEIVED STRESS SCALE (PSS)

popup---
Petunjuk Pengisian:
1. Bacalah pertanyaan dan pernyataan berikut dengan baik
2. Anda sebagai responden diperbolehkan bertanya kepada peneliti, jika ada
pertanyaan / pernyataan yang tidak dimengerti
3. Lengkapilah identitas terlebih dahulu
4. Berikan tanda centang () pada salah satu pilihan jawaban yang paling sesuai
dengan perasaan dan pikiran anda selama satu bulan terakhir
5. Jumlahkan skor total dari semua pertanyaan / pernyataan
6. Berikan kode sesuai hasil skor anda
7. Untuk pertanyaan positif (4,5,7,8) bernilai kebalikannya (0=4, 1=3, 2=2, 3=1,
4=0)
8. Selamat mengisi dan terima kasih atas kerjasamanya
Keterangan :
0 : Tidak pernah.
1 : Hampir tidak pernah (1-2 kali). 2 : Kadang-kadang (3-4 kali).
3 : Hampir sering (5-6 kali) .
4 : Sangat sering (lebih dari 6 kali).
Soal---

  pilihan nya 0,1,2,3,4
1.
Selama sebulan terakhir, seberapa sering anda marah karena sesuatu yang tidak terduga
2.
Selama sebulan terakhir, seberapa sering anda merasa tidakmampu mengontrol hal-hal yang penting dalam kehidupan anda
3.
Selama sebulan terakhir, seberapa sering anda merasa gelisah dan tertekan
4.
Selama sebulan terakhir, seberapa sering anda merasa yakin terhadap kemampuan diri untuk mengatasi masalah pribadi
5.
Selama sebulan terakhir, seberapa sering anda merasa segala sesuatu yang terjadi sesuai dengan harapan anda
6.
Selama sebulan terakhir, seberapa sering anda merasa tidak mampu menyelesaikan hal-hal yang harus dikerjakan
7.
Selama sebulan terakhir, seberapa sering anda mampu mengontrol rasa mudah tersinggung dalam kehidupan anda
                                   
8.
Selama sebulan terakhir, seberapa sering anda merasa lebih mampu mengatasi masalah jika dibandingkan dengan orang lain
9.
Selama sebulan terakhir, seberapa sering anda marah karena adanya masalah yang tidak dapat anda kendalikan
10.
Selama sebulan terakhir, seberapa sering anda merasakan kesulitan yang menumpuk sehingga anda tidak mampu untuk mengatasinya

kalkulator---
aku mau nanti diakhir bisa langsung keluar hasilnya jadi karena ini hasilnya hanya 
Kode 1 : skor total 1-13 Kode 2 : skor total 14-26 Kode 3 : skor total 27-40
kode 1 stres ringan, kode 2 stres sedang, kode 3 stres berat

jadi nanti saat psikolog buka hasil sudah ada label antara 3 kode itu di sebelah namanya. dan apabila psikolog mau download excelnya isinya hanya [nama,gender, keterangan tadi Skor Total dan keterangan kode 1 stres ringan / kode 2 stres sedang/ kode 3 stres berat]. kalau mereka mau lihat pernomor biar mereka liat dari app aja

Soal 2 : SELF-REPORTING QUESTIONARE-29

--popup
Bacalah petunjuk ini seluruhnya sebelum mulai mengisi.
Pertanyaan berikut berhubungan dengan masalah yang mungkin mengganggu anda selama 30 hari terakhir.
Apabila Anda menganggap pertanyaan itu anda alami dalam 30 hari terakhir, berilah jawaban ya (berarti Ya).
Apabila Anda menganggap pertanyaan itu Tidak anda alami dalam 30 hari terakhir, berilah jawaban tidak (berarti Tidak).
Jika anda tidak yakin dengan jawabannya, berilah jawaban yang paling sesuai diantara Y dan T.
Kami tegaskan bahwa jawaban Anda bersifat rahasia dan akan digunakan hanya untuk membantu pemecahan masalah anda.

-- soal

SRQ1	Apakah Anda sering merasa sakit kepala?		
SRQ2	Apakah Anda kehilangan nafsu makan?		
SRQ3	Apakah tidur anda tidak nyenyak?		
SRQ4	Apakah anda mudah merasa takut?		
SRQ5	Apakah anda merasa cemas, tegang, atau khawatir?		
SRQ6	Apakah tangan anda gemetar?		
SRQ7	Apakah anda mengalami gangguan pencernaan?		
SRQ8	Apakah anda merasa sulit berpikir jernih?		
SRQ9	Apakah anda merasa tidak Bahagia?		
SRQ10	Apakah anda lebih sering menangis?		
SRQ11	Apakah anda merasa sulit untuk menikmati aktivitas sehari-hari?		
SRQ12	Apakah anda mengalami kesulitan untuk mengambil keputusan?		
SRQ13	Apakah aktivitas/tugas sehari-hari anda terbengkalai?		
SRQ14	Apakah anda merasa tidak mampu berperan dalam kehidupan ini?		
SRQ15	Apakah anda kehilangan minat terhadap banyak hal?		
SRQ16	Apakah anda merasa tidak berharga?		
SRQ17	Apakah anda mempunyai pikiran untuk mengakhiri hidup anda?		
SRQ18	Apakah anda merasa Lelah sepanjang waktu?		
SRQ19	Apakah anda merasa tidak enak di perut?		
SRQ20	Apakah anda mudah Lelah?		
SRQ21	Apakah anda minum alcohol lebih banyak dari biasanya atau apakah anda menggunakan narkoba?		
SRQ22	Apakah anda yakin bahwa seseorang mencoba mencelakai anda dengan cara tertentu?		
SRQ23	Apakah ada yang mengganggu atau hal yang tidak biasa dalam pikiran anda?		
SRQ24	Apakah anda pernah mendengar suara tanpa tahu sumbernya atau yang orang lain tidak dapat mendengar?		
SRQ25	Apakah anda mengalami mimpi yang mengganggu tentang suatu bencana/musibah atau adakah saat-saat anda seolah mengalami Kembali bencana itu?		
SRQ26	Apakah anda menghindari kegiatan, tempat, orang atau pikiran yang mengingatkan anda akan bencana tersebut?		
SRQ27	Apakah minat anda terhadap teman dan kegiatan yang biasa anda lakukan berkurang?		
SRQ28	Apakah anda merasa sangat terganggu jika berada dalam situasi yang mengingatkan anda akan bencana atau jika anda berpikir tentang bencana itu?		
SRQ29	Apakah anda kesulitan memahami atau mengekspresikan perasaan anda?		


-- kalkulator
INTERPRETASI
1. Apabila terdapat 5 atau lebih jawaban YA pada No. 1-20 berarti terdapat masalah psikologis seperti cemas dan depresi
2. Apabila terdapat jawaban YA pada No. 21 berarti terdapat penggunaan zat psikoaktif / narkoba
3. Apabila terdapat satu atau lebih jawaban YA dari No. 22-24 berarti terdapat gejala gangguan psikotik (gangguan dalam penilaian realitas) yang perlu penanganan serius
4. Apabila terdapat satu atau lebih jawaban YA dari No. 25-29 berarti terdapat gejala-gejala gangguan PTSD (Post Traumatic Stress Disorder) / gangguan stres setelah trauma
KESIMPULAN
1. Normal (tidak ada hasil dengan Interpretasi sebagaimana No. 1 – 4 diatas)
2. Cemas/ Depresi (terdapat hasil dengan Interpretasi sebagaimana No. 1 diatas)
3. Terdapat Penggunaan Zat Psikoaktif/ Narkoba (terdapat hasil dengan Interpretasi sebagaimana No. 2 diatas)
4. Gejala Gangguan Psikotik (terdapat hasil dengan Interpretasi sebagaimana No. 3 diatas)
5. Gejala Gangguan PTSD (terdapat hasil dengan Interpretasi sebagaimana No. 4 diatas)
6. Tidak Dilakukan (Tidak melakukan pengisian SRQ-29)

hasil yang di tampilkan di excel dan didalam  detail nilai, tidak labeling kaya pss

8 Distinct Results (Original Text) = output hasil
1. Normal

text
Normal. Tidak terdapat gejala psikologis seperti cemas dan depresi. Tidak terdapat penggunaan zat psikoaktif/narkoba, gejala episode psikotik, gejala PTSD/gejala stress setelah trauma
2. Tidak Normal - PTSD Only

text
Tidak Normal. Terdapat gejala PTSD/gejala stress setelah trauma. Namun, tidak terdapat gejala psikologis seperti cemas dan depresi, penggunaan zat psikoaktif/narkoba, dan gejala episode psikotik.
3. Tidak Normal - Cemas & Depresi

text
Tidak Normal. Terdapat gejala psikologis seperti cemas dan depresi. Namun tidak terdapat penggunaan zat psikoaktif/narkoba, gejala episode psikotik dan gejala PTSD/gejala stress setelah trauma
4. Tidak Normal - Episode Psikotik Only

text
Tidak Normal. Terdapat gejala episode psikotik. Namun tidak terdapat gejala psikologis seperti cemas dan depresi, penggunaan zat psikoaktif/narkoba, dan gejala PTSD/gejala stress setelah trauma
5. Tidak Normal - PTSD + Psikotik

text
Tidak Normal. Terdapat gejala episode psikotik dan gejala PTSD/stress setelah trauma. Namun tidak terdapat gejala cemas/depresi dan penggunaan zat adiktif/narkoba
6. Tidak Normal - Cemas, Depresi, PTSD

text
Tidak Normal. Terdapat gejala psikologis seperti cemas, depresi dan PTSD. Namun tidak terdapat gejala episode psikotik dan penggunaan zat psikoaktif/narkoba
7. Tidak Normal - Cemas, Depresi, Psikotik

text
Tidak Normal. Terdapat gejala psikologis seperti cemas, depresi dan gejala episode psikotik. Namun tidak terdapat gejala PTSD dan penggunaan zat psikoaktif/narkoba
8. Tidak Normal - All Symptoms

text
Tidak Normal. Terdapat gejala psikologis seperti cemas, depresi, gejala episode psikotik, dan PTSD/gejala stress setelah trauma. Namun, tidak terdapat penggunaan zat adiktif/narkoba

format hasil di excel sama kaya pss [nama,gender,total nilai, output hasil]

perhatikan ya yang srq kamu harus benar karena jawabanya dia bervariasi berdasarkan interpretasi dulu, lalu lihat kesimpulan dari kesimpulan kamu bisa memilih template output hasil.