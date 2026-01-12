const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

const PSS_INSTRUCTIONS = `PETUNJUK PENGISIAN

1. Bacalah pertanyaan dan pernyataan berikut dengan baik
2. Anda diperbolehkan bertanya kepada peneliti jika ada pertanyaan yang tidak dimengerti
3. Berikan tanda centang (✓) pada salah satu pilihan jawaban yang paling sesuai dengan perasaan dan pikiran anda selama SATU BULAN TERAKHIR
4. Untuk pertanyaan nomor 4, 5, 7, dan 8 merupakan pertanyaan positif yang skornya akan dihitung terbalik secara otomatis

KETERANGAN SKOR:
• 0 = Tidak pernah
• 1 = Hampir tidak pernah (1-2 kali)
• 2 = Kadang-kadang (3-4 kali)
• 3 = Hampir sering (5-6 kali)
• 4 = Sangat sering (lebih dari 6 kali)

KATEGORI HASIL:
• Skor 1-13 = Stres Ringan
• Skor 14-26 = Stres Sedang
• Skor 27-40 = Stres Berat

Selamat mengisi dan terima kasih atas kerjasamanya.`;

const SRQ_INSTRUCTIONS = `PETUNJUK PENGISIAN

Self-Reporting Questionnaire (SRQ-29) adalah alat skrining untuk mendeteksi gangguan kesehatan mental.

1. Bacalah setiap pertanyaan dengan seksama
2. Jawab setiap pertanyaan dengan jujur sesuai dengan kondisi yang Anda alami
3. Pilih "Ya" jika Anda mengalami gejala tersebut, atau "Tidak" jika tidak mengalaminya
4. Tidak ada jawaban benar atau salah

INTERPRETASI:
• Pertanyaan 1-20: Mendeteksi gejala kecemasan dan depresi
• Pertanyaan 21: Penggunaan zat psikoaktif/narkoba
• Pertanyaan 22-24: Gejala gangguan psikotik
• Pertanyaan 25-29: Gejala PTSD (Post-Traumatic Stress Disorder)

Hasil akan dihitung secara otomatis berdasarkan jawaban Anda.

Selamat mengisi.`;

(async () => {
    const client = await pool.connect();
    try {
        // Update PSS instructions
        const r1 = await client.query(
            `UPDATE exams SET instructions = $1 WHERE exam_type = 'pss' RETURNING id, title`,
            [PSS_INSTRUCTIONS]
        );
        console.log('Updated PSS:', r1.rows);
        
        // Update SRQ instructions
        const r2 = await client.query(
            `UPDATE exams SET instructions = $1 WHERE exam_type = 'srq29' RETURNING id, title`,
            [SRQ_INSTRUCTIONS]
        );
        console.log('Updated SRQ:', r2.rows);
        
        console.log('\n✅ Instructions added successfully!');
        
    } finally {
        client.release();
        await pool.end();
    }
})();
