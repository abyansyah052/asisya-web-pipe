-- Migration: Add PSS and SRQ-29 preset exams (IDEMPOTENT VERSION)
-- These exams cannot be deleted (is_standard = true) and have special UI handling
-- This migration is safe to run multiple times - it won't create duplicates

-- First ensure we have the exam_type and is_standard columns
ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_type VARCHAR(20) DEFAULT 'general';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS is_standard BOOLEAN DEFAULT false;

-- Update existing MMPI exam to be standard
UPDATE exams SET is_standard = true, exam_type = 'mmpi' WHERE title ILIKE '%MMPI%' OR title = 'TEST 1';

-- IDEMPOTENT: Only create PSS/SRQ if they don't exist
DO $$
DECLARE
    pss_exam_id INT;
    srq_exam_id INT;
    q_id INT;
    pss_exists BOOLEAN;
    srq_exists BOOLEAN;
BEGIN
    -- Check if PSS already exists
    SELECT EXISTS(SELECT 1 FROM exams WHERE exam_type = 'pss') INTO pss_exists;
    
    IF NOT pss_exists THEN
        -- Insert PSS Exam
        INSERT INTO exams (title, description, duration_minutes, status, display_mode, exam_type, is_standard)
        VALUES (
            'Perceived Stress Scale (PSS)',
            'Kuesioner untuk mengukur tingkat stres yang dirasakan selama satu bulan terakhir. Terdiri dari 10 pertanyaan dengan skala 0-4.',
            30,
            'published',
            'scroll',
            'pss',
            true
        );
        
        -- Get PSS exam id
        SELECT id INTO pss_exam_id FROM exams WHERE exam_type = 'pss' LIMIT 1;
        
        -- Insert PSS Questions (10 questions)
        INSERT INTO questions (exam_id, text, marks) VALUES 
            (pss_exam_id, 'Selama sebulan terakhir, seberapa sering anda marah karena sesuatu yang tidak terduga', 1),
            (pss_exam_id, 'Selama sebulan terakhir, seberapa sering anda merasa tidak mampu mengontrol hal-hal yang penting dalam kehidupan anda', 1),
            (pss_exam_id, 'Selama sebulan terakhir, seberapa sering anda merasa gelisah dan tertekan', 1),
            (pss_exam_id, 'Selama sebulan terakhir, seberapa sering anda merasa yakin terhadap kemampuan diri untuk mengatasi masalah pribadi', 1),
            (pss_exam_id, 'Selama sebulan terakhir, seberapa sering anda merasa segala sesuatu yang terjadi sesuai dengan harapan anda', 1),
            (pss_exam_id, 'Selama sebulan terakhir, seberapa sering anda merasa tidak mampu menyelesaikan hal-hal yang harus dikerjakan', 1),
            (pss_exam_id, 'Selama sebulan terakhir, seberapa sering anda mampu mengontrol rasa mudah tersinggung dalam kehidupan anda', 1),
            (pss_exam_id, 'Selama sebulan terakhir, seberapa sering anda merasa lebih mampu mengatasi masalah jika dibandingkan dengan orang lain', 1),
            (pss_exam_id, 'Selama sebulan terakhir, seberapa sering anda marah karena adanya masalah yang tidak dapat anda kendalikan', 1),
            (pss_exam_id, 'Selama sebulan terakhir, seberapa sering anda merasakan kesulitan yang menumpuk sehingga anda tidak mampu untuk mengatasinya', 1);
        
        -- Insert PSS Options (0-4 scale for each question)
        FOR q_id IN SELECT id FROM questions WHERE exam_id = pss_exam_id ORDER BY id LOOP
            INSERT INTO options (question_id, text, is_correct) VALUES
                (q_id, '0 - Tidak pernah', true),  -- First option as default correct for validation
                (q_id, '1 - Hampir tidak pernah (1-2 kali)', false),
                (q_id, '2 - Kadang-kadang (3-4 kali)', false),
                (q_id, '3 - Hampir sering (5-6 kali)', false),
                (q_id, '4 - Sangat sering (lebih dari 6 kali)', false);
        END LOOP;
        
        RAISE NOTICE 'Created PSS exam with ID %', pss_exam_id;
    ELSE
        RAISE NOTICE 'PSS exam already exists, skipping creation';
    END IF;

    -- Check if SRQ already exists
    SELECT EXISTS(SELECT 1 FROM exams WHERE exam_type = 'srq29') INTO srq_exists;
    
    IF NOT srq_exists THEN
        -- Insert SRQ-29 Exam
        INSERT INTO exams (title, description, duration_minutes, status, display_mode, exam_type, is_standard)
        VALUES (
            'Self-Reporting Questionnaire (SRQ-29)',
            'Kuesioner untuk mendeteksi gangguan kesehatan mental termasuk kecemasan, depresi, penggunaan zat, gangguan psikotik, dan PTSD. Terdiri dari 29 pertanyaan Ya/Tidak.',
            30,
            'published',
            'scroll',
            'srq29',
            true
        );

        -- Get SRQ exam id
        SELECT id INTO srq_exam_id FROM exams WHERE exam_type = 'srq29' LIMIT 1;

        -- Insert SRQ-29 Questions (29 questions)
        INSERT INTO questions (exam_id, text, marks) VALUES
            (srq_exam_id, 'Apakah Anda sering merasa sakit kepala?', 1),
            (srq_exam_id, 'Apakah Anda kehilangan nafsu makan?', 1),
            (srq_exam_id, 'Apakah tidur anda tidak nyenyak?', 1),
            (srq_exam_id, 'Apakah anda mudah merasa takut?', 1),
            (srq_exam_id, 'Apakah anda merasa cemas, tegang, atau khawatir?', 1),
            (srq_exam_id, 'Apakah tangan anda gemetar?', 1),
            (srq_exam_id, 'Apakah anda mengalami gangguan pencernaan?', 1),
            (srq_exam_id, 'Apakah anda merasa sulit berpikir jernih?', 1),
            (srq_exam_id, 'Apakah anda merasa tidak Bahagia?', 1),
            (srq_exam_id, 'Apakah anda lebih sering menangis?', 1),
            (srq_exam_id, 'Apakah anda merasa sulit untuk menikmati aktivitas sehari-hari?', 1),
            (srq_exam_id, 'Apakah anda mengalami kesulitan untuk mengambil keputusan?', 1),
            (srq_exam_id, 'Apakah aktivitas/tugas sehari-hari anda terbengkalai?', 1),
            (srq_exam_id, 'Apakah anda merasa tidak mampu berperan dalam kehidupan ini?', 1),
            (srq_exam_id, 'Apakah anda kehilangan minat terhadap banyak hal?', 1),
            (srq_exam_id, 'Apakah anda merasa tidak berharga?', 1),
            (srq_exam_id, 'Apakah anda mempunyai pikiran untuk mengakhiri hidup anda?', 1),
            (srq_exam_id, 'Apakah anda merasa Lelah sepanjang waktu?', 1),
            (srq_exam_id, 'Apakah anda merasa tidak enak di perut?', 1),
            (srq_exam_id, 'Apakah anda mudah Lelah?', 1),
            (srq_exam_id, 'Apakah anda minum alcohol lebih banyak dari biasanya atau apakah anda menggunakan narkoba?', 1),
            (srq_exam_id, 'Apakah anda yakin bahwa seseorang mencoba mencelakai anda dengan cara tertentu?', 1),
            (srq_exam_id, 'Apakah ada yang mengganggu atau hal yang tidak biasa dalam pikiran anda?', 1),
            (srq_exam_id, 'Apakah anda pernah mendengar suara tanpa tahu sumbernya atau yang orang lain tidak dapat mendengar?', 1),
            (srq_exam_id, 'Apakah anda mengalami mimpi yang mengganggu tentang suatu bencana/musibah atau adakah saat-saat anda seolah mengalami Kembali bencana itu?', 1),
            (srq_exam_id, 'Apakah anda menghindari kegiatan, tempat, orang atau pikiran yang mengingatkan anda akan bencana tersebut?', 1),
            (srq_exam_id, 'Apakah minat anda terhadap teman dan kegiatan yang biasa anda lakukan berkurang?', 1),
            (srq_exam_id, 'Apakah anda merasa sangat terganggu jika berada dalam situasi yang mengingatkan anda akan bencana atau jika anda berpikir tentang bencana itu?', 1),
            (srq_exam_id, 'Apakah anda kesulitan memahami atau mengekspresikan perasaan anda?', 1);
        
        -- Insert SRQ Options (Ya/Tidak for each question)
        FOR q_id IN SELECT id FROM questions WHERE exam_id = srq_exam_id ORDER BY id LOOP
            INSERT INTO options (question_id, text, is_correct) VALUES
                (q_id, 'Ya', true),  -- First option as default correct for validation
                (q_id, 'Tidak', false);
        END LOOP;
        
        RAISE NOTICE 'Created SRQ-29 exam with ID %', srq_exam_id;
    ELSE
        RAISE NOTICE 'SRQ-29 exam already exists, skipping creation';
    END IF;

END $$;
