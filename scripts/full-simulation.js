const { Pool } = require('pg');

const BASE_URL = 'https://asisya-web-pipe.vercel.app';
const DATABASE_URL = 'postgresql://neondb_owner:npg_iNjfX2mduDK1@ep-plain-dew-a1dxkrai-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

// Store cookies/sessions
let adminCookie = '';
let candidateCookie = '';
let psychologistCookie = '';
let generatedCode = '';
let candidateId = null;
let pssAttemptId = null;
let srqAttemptId = null;
let mmpiAttemptId = null;

// Ensure correct roles before testing
async function ensureCorrectRoles() {
    console.log('🔧 Ensuring correct user roles...\n');
    const pool = new Pool({ connectionString: DATABASE_URL, ssl: true });
    const client = await pool.connect();
    
    try {
        // Define expected roles
        const expectedRoles = [
            { username: 'admin', expectedRole: 'admin' },
            { username: 'dev.asisya.adm', expectedRole: 'super_admin' },
            { username: 'Psikolog', expectedRole: 'psychologist' }
        ];
        
        for (const { username, expectedRole } of expectedRoles) {
            const result = await client.query(
                'SELECT id, username, role FROM users WHERE username = $1',
                [username]
            );
            
            if (result.rows.length > 0) {
                const user = result.rows[0];
                if (user.role !== expectedRole) {
                    await client.query(
                        'UPDATE users SET role = $1 WHERE username = $2',
                        [expectedRole, username]
                    );
                    console.log(`   ✅ Fixed ${username}: ${user.role} → ${expectedRole}`);
                } else {
                    console.log(`   ✓ ${username}: ${user.role} (correct)`);
                }
            } else {
                console.log(`   ⚠️ User ${username} not found`);
            }
        }
        console.log('');
    } finally {
        client.release();
        pool.end();
    }
}

// Helper to make API calls with timing
async function api(endpoint, options = {}, cookie = '') {
    const start = Date.now();
    try {
        const headers = {
            'Content-Type': 'application/json',
            ...(cookie ? { 'Cookie': cookie } : {}),
            ...options.headers
        };
        
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers,
            redirect: 'manual'
        });
        
        const elapsed = Date.now() - start;
        const setCookie = response.headers.get('set-cookie');
        
        let data = null;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json().catch(() => null);
        }
        
        return { 
            status: response.status, 
            ok: response.ok, 
            data, 
            elapsed,
            setCookie,
            slow: elapsed > 500
        };
    } catch (err) {
        const elapsed = Date.now() - start;
        return { status: 0, ok: false, error: err.message, elapsed, slow: elapsed > 500 };
    }
}

function log(icon, msg, elapsed = null) {
    const time = elapsed !== null ? ` (${elapsed}ms${elapsed > 500 ? ' ⚠️ SLOW' : ''})` : '';
    console.log(`${icon} ${msg}${time}`);
}

async function runTests() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║      ASISYA FULL BUSINESS PROCESS SIMULATION                   ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // ==================== PRE-CHECK: ENSURE CORRECT ROLES ====================
    await ensureCorrectRoles();

    // ==================== ADMIN FLOW ====================
    console.log('═══════════════════════════════════════════════════════════');
    console.log('👔 ADMIN FLOW - Login & Create Code');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Login as admin
    log('🔐', 'Logging in as admin...');
    const adminLogin = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    if (!adminLogin.ok) {
        log('❌', `Admin login failed: ${adminLogin.status} - ${JSON.stringify(adminLogin.data)}`, adminLogin.elapsed);
        return;
    }
    adminCookie = adminLogin.setCookie?.split(';')[0] || '';
    log('✅', `Admin logged in`, adminLogin.elapsed);

    // Create a registration code
    log('🎫', 'Creating registration code...');
    const createCode = await api('/api/admin/codes/generate', {
        method: 'POST',
        body: JSON.stringify({
            count: 1,
            companyCodeId: 2, // Company code 0000 (Default)
            expiresInDays: 7
        })
    }, adminCookie);

    if (!createCode.ok) {
        log('❌', `Failed to create code: ${createCode.status} - ${JSON.stringify(createCode.data)}`, createCode.elapsed);
        return;
    }
    // Response is { codes: ['0126-0000-0001', ...] }
    generatedCode = createCode.data?.codes?.[0] || createCode.data?.code;
    log('✅', `Created code: ${generatedCode}`, createCode.elapsed);

    // ==================== CANDIDATE FLOW ====================
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('👤 CANDIDATE FLOW - Login with Code, Profile, Take Exams');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Candidate login with code (not traditional register/login)
    log('🔐', 'Candidate login with code...');
    const candidateLogin = await api('/api/auth/candidate-login', {
        method: 'POST',
        body: JSON.stringify({ code: generatedCode })
    });

    if (!candidateLogin.ok) {
        log('❌', `Candidate login failed: ${candidateLogin.status} - ${JSON.stringify(candidateLogin.data)}`, candidateLogin.elapsed);
        return;
    }
    candidateCookie = candidateLogin.setCookie?.split(';')[0] || '';
    candidateId = candidateLogin.data?.user?.id;
    log('✅', `Candidate logged in (ID: ${candidateId})`, candidateLogin.elapsed);

    // Complete profile (data diri) - POST to profile-completion
    log('📋', 'Completing profile (data diri)...');
    const profile = await api('/api/candidate/profile-completion', {
        method: 'POST',
        body: JSON.stringify({
            full_name: 'Test Simulation User',
            jenis_kelamin: 'Laki-laki',
            tanggal_lahir: '1995-05-15',
            pendidikan_terakhir: 'S1',
            pekerjaan: 'Software Engineer',
            lokasi_test: 'Online',
            alamat_ktp: 'Jakarta Selatan, DKI Jakarta',
            nik: '3175012345670001',
            marital_status: 'Belum Menikah'
        })
    }, candidateCookie);

    if (!profile.ok) {
        log('❌', `Profile update failed: ${profile.status} - ${JSON.stringify(profile.data)}`, profile.elapsed);
    } else {
        log('✅', 'Profile completed', profile.elapsed);
    }

    // Get available exams from dashboard
    log('📚', 'Fetching available exams from dashboard...');
    const dashboard = await api('/api/candidate/dashboard', {}, candidateCookie);
    if (!dashboard.ok) {
        log('❌', `Failed to fetch dashboard: ${dashboard.status}`, dashboard.elapsed);
        return;
    }
    const availableExams = dashboard.data?.todo || [];
    log('✅', `Found ${availableExams.length} available exams`, dashboard.elapsed);

    // Find PSS, SRQ, and MMPI/Test 1 from todo list
    const pssExam = availableExams.find(e => e.title?.toLowerCase().includes('pss'));
    const srqExam = availableExams.find(e => e.title?.toLowerCase().includes('srq'));
    const mmpiExam = availableExams.find(e => e.title?.includes('TES 1') || e.title?.toLowerCase().includes('mmpi'));

    console.log(`   PSS: ${pssExam ? `ID ${pssExam.id}` : 'NOT FOUND'}`);
    console.log(`   SRQ: ${srqExam ? `ID ${srqExam.id}` : 'NOT FOUND'}`);
    console.log(`   MMPI: ${mmpiExam ? `ID ${mmpiExam.id}` : 'NOT FOUND'}`);

    // Take PSS Exam
    if (pssExam) {
        console.log('\n--- Taking PSS Exam ---');
        pssAttemptId = await takeExam(pssExam.id, 'PSS', candidateCookie, 10);
    }

    // Take SRQ Exam
    if (srqExam) {
        console.log('\n--- Taking SRQ-29 Exam ---');
        srqAttemptId = await takeExam(srqExam.id, 'SRQ', candidateCookie, 29);
    }

    // Take MMPI/Test 1 (just first 10 questions for speed)
    if (mmpiExam) {
        console.log('\n--- Taking MMPI/Test 1 Exam (first 10 questions) ---');
        mmpiAttemptId = await takeExam(mmpiExam.id, 'MMPI', candidateCookie, 10);
    }

    // ==================== PSYCHOLOGIST FLOW ====================
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧠 PSYCHOLOGIST FLOW - Edit Exams, View Results, Export');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Login as psychologist (using admin since they have psychologist access)
    log('🔐', 'Logging in as psychologist (admin)...');
    psychologistCookie = adminCookie; // Admin has psychologist features
    log('✅', 'Using admin session for psychologist features');

    // Edit PSS to require all answers
    if (pssExam) {
        log('✏️', 'Fetching PSS exam for editing...');
        const pssEdit = await api(`/api/admin/exams/${pssExam.id}/edit`, {}, psychologistCookie);
        log('📥', `PSS edit data fetched`, pssEdit.elapsed);

        if (pssEdit.ok && pssEdit.data) {
            const pssData = pssEdit.data;
            log('💾', 'Saving PSS with require_all_answers=true...');
            const savePss = await api(`/api/admin/exams/${pssExam.id}/edit`, {
                method: 'PUT',
                body: JSON.stringify({
                    title: pssData.exam.title,
                    description: pssData.exam.description,
                    duration_minutes: pssData.exam.duration_minutes,
                    status: pssData.exam.status,
                    display_mode: pssData.exam.display_mode,
                    thumbnail: pssData.exam.thumbnail,
                    require_all_answers: true,
                    questions: pssData.questions.map(q => ({
                        id: q.id,
                        text: q.text,
                        marks: q.marks,
                        options: q.options.map(o => ({
                            id: o.id,
                            text: o.text,
                            isCorrect: o.is_correct
                        }))
                    }))
                })
            }, psychologistCookie);

            if (savePss.ok) {
                log('✅', 'PSS saved with require_all_answers', savePss.elapsed);
            } else {
                log('❌', `Failed to save PSS: ${savePss.status} - ${JSON.stringify(savePss.data)}`, savePss.elapsed);
            }
        }
    }

    // Edit SRQ to require all answers
    if (srqExam) {
        log('✏️', 'Fetching SRQ exam for editing...');
        const srqEdit = await api(`/api/admin/exams/${srqExam.id}/edit`, {}, psychologistCookie);
        log('📥', `SRQ edit data fetched`, srqEdit.elapsed);

        if (srqEdit.ok && srqEdit.data) {
            const srqData = srqEdit.data;
            log('💾', 'Saving SRQ with require_all_answers=true...');
            const saveSrq = await api(`/api/admin/exams/${srqExam.id}/edit`, {
                method: 'PUT',
                body: JSON.stringify({
                    title: srqData.exam.title,
                    description: srqData.exam.description,
                    duration_minutes: srqData.exam.duration_minutes,
                    status: srqData.exam.status,
                    display_mode: srqData.exam.display_mode,
                    thumbnail: srqData.exam.thumbnail,
                    require_all_answers: true,
                    questions: srqData.questions.map(q => ({
                        id: q.id,
                        text: q.text,
                        marks: q.marks,
                        options: q.options.map(o => ({
                            id: o.id,
                            text: o.text,
                            isCorrect: o.is_correct
                        }))
                    }))
                })
            }, psychologistCookie);

            if (saveSrq.ok) {
                log('✅', 'SRQ saved with require_all_answers', saveSrq.elapsed);
            } else {
                log('❌', `Failed to save SRQ: ${saveSrq.status} - ${JSON.stringify(saveSrq.data)}`, saveSrq.elapsed);
            }
        }
    }

    // View PSS Results
    if (pssExam) {
        console.log('\n--- Viewing PSS Results ---');
        log('📊', 'Fetching PSS results...');
        const pssResults = await api(`/api/admin/exams/${pssExam.id}/results`, {}, psychologistCookie);
        log('📥', `PSS results fetched`, pssResults.elapsed);

        if (pssResults.ok && pssResults.data?.results) {
            const myResult = pssResults.data.results.find(r => r.user_id === candidateId);
            if (myResult) {
                console.log('   ┌─────────────────────────────────────────┐');
                console.log(`   │ Student: ${myResult.student}`);
                console.log(`   │ Score: ${myResult.score}`);
                console.log(`   │ PSS Category: ${myResult.pss_category || '❌ MISSING'}`);
                console.log(`   │ Correct: ${myResult.correct_count}, Incorrect: ${myResult.incorrect_count}`);
                console.log('   └─────────────────────────────────────────┘');
                
                if (!myResult.pss_category) {
                    log('⚠️', 'PSS Category label is MISSING!');
                } else {
                    log('✅', `PSS Label OK: ${myResult.pss_category}`);
                }
            }

            // View detail answers
            if (pssAttemptId) {
                log('📋', 'Fetching PSS detail answers...');
                const pssAnswers = await api(`/api/admin/exams/answers/${pssAttemptId}`, {}, psychologistCookie);
                log('📥', `PSS answers fetched`, pssAnswers.elapsed);
                
                if (pssAnswers.ok) {
                    console.log(`   Answers count: ${pssAnswers.data?.answers?.length || 0}`);
                    console.log(`   Exam type: ${pssAnswers.data?.examType}`);
                    console.log(`   PSS Category: ${pssAnswers.data?.pssCategory || '❌ MISSING'}`);
                    
                    if (pssAnswers.data?.answers?.length === 0) {
                        log('⚠️', 'PSS detail answers are EMPTY!');
                    } else {
                        log('✅', `PSS has ${pssAnswers.data?.answers?.length} answers`);
                    }
                }
            }
        }
    }

    // View SRQ Results
    if (srqExam) {
        console.log('\n--- Viewing SRQ Results ---');
        log('📊', 'Fetching SRQ results...');
        const srqResults = await api(`/api/admin/exams/${srqExam.id}/results`, {}, psychologistCookie);
        log('📥', `SRQ results fetched`, srqResults.elapsed);

        if (srqResults.ok && srqResults.data?.results) {
            const myResult = srqResults.data.results.find(r => r.user_id === candidateId);
            if (myResult) {
                console.log('   ┌─────────────────────────────────────────┐');
                console.log(`   │ Student: ${myResult.student}`);
                console.log(`   │ Score: ${myResult.score}`);
                console.log(`   │ SRQ Conclusion: ${myResult.srq_conclusion || '❌ MISSING'}`);
                console.log(`   │ Correct: ${myResult.correct_count}, Incorrect: ${myResult.incorrect_count}`);
                console.log('   └─────────────────────────────────────────┘');
                
                if (!myResult.srq_conclusion) {
                    log('⚠️', 'SRQ Conclusion label is MISSING!');
                } else {
                    log('✅', `SRQ Label OK: ${myResult.srq_conclusion}`);
                }
            }

            // View detail answers
            if (srqAttemptId) {
                log('📋', 'Fetching SRQ detail answers...');
                const srqAnswers = await api(`/api/admin/exams/answers/${srqAttemptId}`, {}, psychologistCookie);
                log('📥', `SRQ answers fetched`, srqAnswers.elapsed);
                
                if (srqAnswers.ok) {
                    console.log(`   Answers count: ${srqAnswers.data?.answers?.length || 0}`);
                    console.log(`   Exam type: ${srqAnswers.data?.examType}`);
                    console.log(`   SRQ Conclusion: ${srqAnswers.data?.srqConclusion || '❌ MISSING'}`);
                    
                    if (srqAnswers.data?.answers?.length === 0) {
                        log('⚠️', 'SRQ detail answers are EMPTY!');
                    } else {
                        log('✅', `SRQ has ${srqAnswers.data?.answers?.length} answers`);
                    }
                }
            }
        }
    }

    // View MMPI Results
    if (mmpiExam) {
        console.log('\n--- Viewing MMPI Results ---');
        log('📊', 'Fetching MMPI results...');
        const mmpiResults = await api(`/api/admin/exams/${mmpiExam.id}/results`, {}, psychologistCookie);
        log('📥', `MMPI results fetched`, mmpiResults.elapsed);

        if (mmpiResults.ok && mmpiResults.data?.results) {
            const myResult = mmpiResults.data.results.find(r => r.user_id === candidateId);
            if (myResult) {
                console.log('   ┌─────────────────────────────────────────┐');
                console.log(`   │ Student: ${myResult.student}`);
                console.log(`   │ Score: ${myResult.score}`);
                console.log(`   │ Correct: ${myResult.correct_count}, Incorrect: ${myResult.incorrect_count}`);
                console.log('   └─────────────────────────────────────────┘');
            }
        }
    }

    // Test Excel Export
    console.log('\n--- Testing Excel Export ---');
    if (pssExam) {
        log('📥', 'Testing PSS Excel download...');
        const pssExcel = await api(`/api/admin/exams/${pssExam.id}/download?filter=all`, {}, psychologistCookie);
        log(pssExcel.ok ? '✅' : '❌', `PSS Excel: ${pssExcel.status}`, pssExcel.elapsed);
    }
    if (srqExam) {
        log('📥', 'Testing SRQ Excel download...');
        const srqExcel = await api(`/api/admin/exams/${srqExam.id}/download?filter=all`, {}, psychologistCookie);
        log(srqExcel.ok ? '✅' : '❌', `SRQ Excel: ${srqExcel.status}`, srqExcel.elapsed);
    }

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    SIMULATION COMPLETE                         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
}

async function takeExam(examId, examName, cookie, expectedQuestions) {
    // Get questions (this auto-creates attempt in the API)
    log('🚀', `Starting ${examName} exam - fetching questions...`);
    const questions = await api(`/api/candidate/exam/${examId}/questions`, {}, cookie);

    if (!questions.ok) {
        log('❌', `Failed to start ${examName}: ${questions.status} - ${JSON.stringify(questions.data)}`, questions.elapsed);
        return null;
    }
    
    const attemptId = questions.data?.attemptId;
    const qs = questions.data?.questions || [];
    log('✅', `${examName} started (attempt: ${attemptId}) - Got ${qs.length} questions`, questions.elapsed);

    // Build answers (select first option for each question)
    const answers = {};
    const answeredCount = Math.min(qs.length, expectedQuestions);
    
    for (let i = 0; i < answeredCount; i++) {
        const q = qs[i];
        if (q.options && q.options.length > 0) {
            // For variety, select different options
            const optionIndex = i % q.options.length;
            answers[q.id] = q.options[optionIndex].id;
        }
    }

    // Save answers periodically
    log('💾', `Saving ${Object.keys(answers).length} answers...`);
    const save = await api(`/api/candidate/exam/${examId}/save`, {
        method: 'POST',
        body: JSON.stringify({ attemptId, answers })
    }, cookie);
    log(save.ok ? '✅' : '⚠️', `Answers saved`, save.elapsed);

    // Submit exam
    log('📤', `Submitting ${examName}...`);
    const submit = await api(`/api/candidate/exam/${examId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ attemptId, answers })
    }, cookie);

    if (!submit.ok) {
        log('❌', `Failed to submit ${examName}: ${submit.status} - ${JSON.stringify(submit.data)}`, submit.elapsed);
    } else {
        log('✅', `${examName} submitted, score: ${submit.data?.score}`, submit.elapsed);
    }

    return attemptId;
}

runTests().catch(console.error);
