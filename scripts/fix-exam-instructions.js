require('dotenv').config({ path: '../.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixInstructions() {
  console.log('Fixing exam instructions...\n');
  
  const pssInstructions = `Petunjuk Pengisian:

1. Bacalah pertanyaan dan pernyataan berikut dengan baik
2. Anda diperbolehkan bertanya kepada peneliti jika ada pertanyaan/pernyataan yang tidak dimengerti
3. Berikan tanda centang pada salah satu pilihan jawaban yang paling sesuai dengan perasaan dan pikiran Anda selama SATU BULAN TERAKHIR

Keterangan Pilihan Jawaban:
• 0 : Tidak pernah
• 1 : Hampir tidak pernah (1-2 kali)
• 2 : Kadang-kadang (3-4 kali)
• 3 : Hampir sering (5-6 kali)
• 4 : Sangat sering (lebih dari 6 kali)

Selamat mengisi dan terima kasih atas kerjasamanya.`;

  const srqInstructions = `Bacalah petunjuk ini seluruhnya sebelum mulai mengisi.

Pertanyaan berikut berhubungan dengan masalah yang mungkin mengganggu Anda selama 30 hari terakhir.

• Apabila Anda menganggap pertanyaan itu Anda alami dalam 30 hari terakhir, berilah jawaban YA
• Apabila Anda menganggap pertanyaan itu TIDAK Anda alami dalam 30 hari terakhir, berilah jawaban TIDAK
• Jika Anda tidak yakin dengan jawabannya, berilah jawaban yang paling sesuai

Kami tegaskan bahwa jawaban Anda bersifat RAHASIA dan akan digunakan hanya untuk membantu pemecahan masalah Anda.`;

  try {
    // Update PSS
    const pss = await pool.query(
      "UPDATE exams SET instructions = $1 WHERE exam_type = 'pss' RETURNING id, title",
      [pssInstructions]
    );
    console.log('PSS updated:', pss.rows);

    // Update SRQ
    const srq = await pool.query(
      "UPDATE exams SET instructions = $1 WHERE exam_type = 'srq29' RETURNING id, title",
      [srqInstructions]
    );
    console.log('SRQ updated:', srq.rows);

    console.log('\n✅ Instructions fixed! INTERPRETASI removed.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

fixInstructions();
