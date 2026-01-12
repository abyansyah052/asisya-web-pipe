-- Re-create PSS Questions (10 questions) - exam_id = 9
DELETE FROM questions WHERE exam_id = 9;

INSERT INTO questions (exam_id, text, marks) VALUES 
    (9, 'Selama sebulan terakhir, seberapa sering anda marah karena sesuatu yang tidak terduga', 1),
    (9, 'Selama sebulan terakhir, seberapa sering anda merasa tidak mampu mengontrol hal-hal yang penting dalam kehidupan anda', 1),
    (9, 'Selama sebulan terakhir, seberapa sering anda merasa gelisah dan tertekan', 1),
    (9, 'Selama sebulan terakhir, seberapa sering anda merasa yakin terhadap kemampuan diri untuk mengatasi masalah pribadi', 1),
    (9, 'Selama sebulan terakhir, seberapa sering anda merasa segala sesuatu yang terjadi sesuai dengan harapan anda', 1),
    (9, 'Selama sebulan terakhir, seberapa sering anda merasa tidak mampu menyelesaikan hal-hal yang harus dikerjakan', 1),
    (9, 'Selama sebulan terakhir, seberapa sering anda mampu mengontrol rasa mudah tersinggung dalam kehidupan anda', 1),
    (9, 'Selama sebulan terakhir, seberapa sering anda merasa lebih mampu mengatasi masalah jika dibandingkan dengan orang lain', 1),
    (9, 'Selama sebulan terakhir, seberapa sering anda marah karena adanya masalah yang tidak dapat anda kendalikan', 1),
    (9, 'Selama sebulan terakhir, seberapa sering anda merasa menumpuknya kesulitan yang begitu tinggi sehingga tidak dapat diatasi', 1);

-- Insert PSS Options (5 options per question)
DO $$
DECLARE
    q_id INT;
BEGIN
    FOR q_id IN SELECT id FROM questions WHERE exam_id = 9 ORDER BY id LOOP
        INSERT INTO options (question_id, text, is_correct) VALUES
            (q_id, 'Tidak Pernah (0)', true),
            (q_id, 'Hampir Tidak Pernah (1)', false),
            (q_id, 'Kadang-kadang (2)', false),
            (q_id, 'Cukup Sering (3)', false),
            (q_id, 'Sangat Sering (4)', false);
    END LOOP;
END $$;

-- Re-create SRQ-29 Questions - exam_id = 10
DELETE FROM questions WHERE exam_id = 10;

INSERT INTO questions (exam_id, text, marks) VALUES 
    (10, 'Apakah Anda sering mengalami sakit kepala?', 1),
    (10, 'Apakah Anda kehilangan nafsu makan?', 1),
    (10, 'Apakah Anda sulit tidur?', 1),
    (10, 'Apakah Anda mudah takut?', 1),
    (10, 'Apakah Anda merasa tegang, cemas atau khawatir?', 1),
    (10, 'Apakah tangan Anda gemetar?', 1),
    (10, 'Apakah pencernaan Anda terganggu?', 1),
    (10, 'Apakah Anda sulit untuk berpikir jernih?', 1),
    (10, 'Apakah Anda merasa tidak bahagia?', 1),
    (10, 'Apakah Anda menangis lebih sering dari biasanya?', 1),
    (10, 'Apakah Anda sulit menikmati kegiatan sehari-hari?', 1),
    (10, 'Apakah Anda sulit mengambil keputusan?', 1),
    (10, 'Apakah pekerjaan sehari-hari Anda terganggu?', 1),
    (10, 'Apakah Anda tidak mampu berperan dalam kehidupan?', 1),
    (10, 'Apakah Anda kehilangan minat terhadap banyak hal?', 1),
    (10, 'Apakah Anda merasa tidak berharga?', 1),
    (10, 'Apakah Anda mempunyai pikiran untuk mengakhiri hidup?', 1),
    (10, 'Apakah Anda merasa lelah sepanjang waktu?', 1),
    (10, 'Apakah Anda merasa tidak enak di perut?', 1),
    (10, 'Apakah Anda mudah lelah?', 1),
    (10, 'Apakah Anda minum alkohol lebih banyak dari biasanya?', 1),
    (10, 'Apakah Anda yakin bahwa seseorang mencoba menyakiti Anda?', 1),
    (10, 'Apakah ada yang mengganggu atau hal tidak biasa dalam pikiran Anda?', 1),
    (10, 'Apakah Anda pernah mendengar suara tanpa tahu sumbernya atau orang lain tidak dapat mendengarnya?', 1),
    (10, 'Apakah mimpi Anda mengganggu pekerjaan Anda?', 1),
    (10, 'Apakah Anda menggunakan narkoba?', 1),
    (10, 'Apakah Anda mempunyai masalah dalam pernikahan?', 1),
    (10, 'Apakah Anda mempunyai pikiran yang sama berulang-ulang?', 1),
    (10, 'Apakah Anda pernah menyakiti diri sendiri?', 1);

-- Insert SRQ Options (2 options per question)
DO $$
DECLARE
    q_id INT;
BEGIN
    FOR q_id IN SELECT id FROM questions WHERE exam_id = 10 ORDER BY id LOOP
        INSERT INTO options (question_id, text, is_correct) VALUES
            (q_id, 'Ya', true),
            (q_id, 'Tidak', false);
    END LOOP;
END $$;

-- Verify
SELECT 'PSS Questions: ' || COUNT(*) FROM questions WHERE exam_id = 9;
SELECT 'PSS Options: ' || COUNT(*) FROM options WHERE question_id IN (SELECT id FROM questions WHERE exam_id = 9);
SELECT 'SRQ Questions: ' || COUNT(*) FROM questions WHERE exam_id = 10;
SELECT 'SRQ Options: ' || COUNT(*) FROM options WHERE question_id IN (SELECT id FROM questions WHERE exam_id = 10);
