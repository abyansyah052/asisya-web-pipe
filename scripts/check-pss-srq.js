const https = require('https');

function request(url, options = {}, cookie = '') {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const req = https.request({
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(cookie ? { Cookie: cookie } : {}),
                ...(options.headers || {})
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data), cookie: res.headers['set-cookie']?.[0]?.split(';')[0] });
                } catch(e) {
                    resolve({ status: res.statusCode, data, cookie: res.headers['set-cookie']?.[0]?.split(';')[0] });
                }
            });
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

async function main() {
    // Login
    const login = await request('https://asisya-web-pipe.vercel.app/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const cookie = login.cookie;
    console.log('Logged in\n');

    // Get PSS results (exam 9)
    const pssResults = await request('https://asisya-web-pipe.vercel.app/api/admin/exams/9/results', {}, cookie);
    console.log('=== PSS Results (Exam 9) ===');
    console.log('Total results:', pssResults.data?.results?.length);
    if (pssResults.data?.results?.length > 0) {
        const r = pssResults.data.results[0];
        console.log('First result:');
        console.log('  Student:', r.student);
        console.log('  Score:', r.score);
        console.log('  PSS Category:', r.pss_category || 'MISSING');
        console.log('  Correct:', r.correct_count, 'Incorrect:', r.incorrect_count);
    }

    // Get PSS detail answers for latest attempt
    const pssAttempts = pssResults.data?.results?.map(r => r.attempt_id) || [];
    if (pssAttempts.length > 0) {
        const latestAttempt = Math.max(...pssAttempts);
        const pssAnswers = await request('https://asisya-web-pipe.vercel.app/api/admin/exams/answers/' + latestAttempt, {}, cookie);
        console.log('\n=== PSS Attempt', latestAttempt, 'Detail ===');
        console.log('  Total Questions:', pssAnswers.data?.totalQuestions);
        console.log('  Answered:', pssAnswers.data?.answeredQuestions);
        console.log('  PSS Category:', pssAnswers.data?.pssCategory || 'MISSING');
        console.log('  PSS Result:', JSON.stringify(pssAnswers.data?.pssResult, null, 2));
        console.log('  Exam Type:', pssAnswers.data?.examType);
        console.log('  Attempt Score:', pssAnswers.data?.attempt?.score);
    }

    // Get SRQ results (exam 10)
    const srqResults = await request('https://asisya-web-pipe.vercel.app/api/admin/exams/10/results', {}, cookie);
    console.log('\n=== SRQ Results (Exam 10) ===');
    console.log('Total results:', srqResults.data?.results?.length);
    if (srqResults.data?.results?.length > 0) {
        const r = srqResults.data.results[0];
        console.log('First result:');
        console.log('  Student:', r.student);
        console.log('  Score:', r.score);
        console.log('  SRQ Conclusion:', r.srq_conclusion || 'MISSING');
        console.log('  Correct:', r.correct_count, 'Incorrect:', r.incorrect_count);
    }

    // Get SRQ detail answers
    const srqAttempts = srqResults.data?.results?.map(r => r.attempt_id) || [];
    if (srqAttempts.length > 0) {
        const latestAttempt = Math.max(...srqAttempts);
        const srqAnswers = await request('https://asisya-web-pipe.vercel.app/api/admin/exams/answers/' + latestAttempt, {}, cookie);
        console.log('\n=== SRQ Attempt', latestAttempt, 'Detail ===');
        console.log('  Total Questions:', srqAnswers.data?.totalQuestions);
        console.log('  Answered:', srqAnswers.data?.answeredQuestions);
        console.log('  SRQ Conclusion:', srqAnswers.data?.srqConclusion || 'MISSING');
        console.log('  SRQ Result:', JSON.stringify(srqAnswers.data?.srqResult, null, 2));
        console.log('  Exam Type:', srqAnswers.data?.examType);
        console.log('  Attempt Score:', srqAnswers.data?.attempt?.score);
    }
}

main().catch(console.error);
