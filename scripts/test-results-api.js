const https = require('https');

// Login first - using username field based on login API
const loginData = JSON.stringify({username: 'admin', password: 'Admin123!'});
const loginReq = https.request({
    hostname: 'asisya-web-pipe.vercel.app',
    path: '/api/auth/login',
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData)}
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('Login status:', res.statusCode);
        console.log('Login response:', body.substring(0, 200));
        
        let cookies = res.headers['set-cookie'] || [];
        let sessionCookie = cookies.find(c => c.includes('user_session'));
        if (!sessionCookie) {
            console.log('No session cookie - check credentials');
            return;
        }
        let cookie = sessionCookie.split(';')[0];
        console.log('Got session, fetching exams...\n');
        
        // Fetch all exams to find PSS, SRQ, MMPI
        const examsReq = https.request({
            hostname: 'asisya-web-pipe.vercel.app',
            path: '/api/admin/exams',
            method: 'GET',
            headers: {'Cookie': cookie}
        }, (res2) => {
            let data = '';
            res2.on('data', chunk => data += chunk);
            res2.on('end', () => {
                try {
                    const exams = JSON.parse(data);
                    console.log('=== ALL EXAMS ===');
                    exams.forEach(e => console.log(`ID: ${e.id}, Type: ${e.exam_type}, Title: ${e.title}`));
                    
                    // Find PSS exam
                    const pssExam = exams.find(e => e.exam_type === 'pss');
                    const srqExam = exams.find(e => e.exam_type === 'srq29');
                    const mmpiExam = exams.find(e => e.title?.toLowerCase().includes('mmpi'));
                    
                    console.log('\n=== CHECKING RESULTS ===');
                    
                    // Check PSS results
                    if (pssExam) {
                        fetchResults(cookie, pssExam.id, 'PSS');
                    } else {
                        console.log('No PSS exam found');
                    }
                    // Check SRQ results
                    if (srqExam) {
                        setTimeout(() => fetchResults(cookie, srqExam.id, 'SRQ'), 500);
                    } else {
                        console.log('No SRQ exam found');
                    }
                    // Check MMPI results
                    if (mmpiExam) {
                        setTimeout(() => fetchResults(cookie, mmpiExam.id, 'MMPI'), 1000);
                    }
                } catch (e) {
                    console.log('Error parsing exams:', e.message);
                    console.log('Response:', data.substring(0, 500));
                }
            });
        });
        examsReq.end();
    });
});

loginReq.on('error', (e) => console.error('Login error:', e.message));
loginReq.write(loginData);
loginReq.end();

function fetchResults(cookie, examId, examName) {
    const req = https.request({
        hostname: 'asisya-web-pipe.vercel.app',
        path: `/api/admin/exams/${examId}/results?showAll=true`,
        method: 'GET',
        headers: {'Cookie': cookie}
    }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                console.log(`\n--- ${examName} (ID: ${examId}) ---`);
                console.log(`Exam: ${json.exam?.title}`);
                console.log(`Exam type: ${json.exam?.exam_type}`);
                console.log(`Results count: ${json.results?.length}`);
                
                if (json.results?.length > 0) {
                    console.log('\nFirst 3 results:');
                    json.results.slice(0, 3).forEach((r, i) => {
                        console.log(`  ${i+1}. ${r.student}`);
                        console.log(`     - score: ${r.score}`);
                        console.log(`     - pss_category: "${r.pss_category || 'NULL'}"`);
                        console.log(`     - srq_conclusion: "${r.srq_conclusion || 'NULL'}"`);
                        console.log(`     - correct_count: ${r.correct_count}, incorrect_count: ${r.incorrect_count}`);
                    });
                }
            } catch (e) {
                console.log(`${examName} Error:`, e.message);
                console.log('Response:', data.substring(0, 200));
            }
        });
    });
    req.on('error', (e) => console.error(`${examName} request error:`, e.message));
    req.end();
}
