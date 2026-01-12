const https = require('https');
const fs = require('fs');

const BASE_URL = 'https://asisya-web-pipe.vercel.app';

async function downloadExcel() {
    // Login as admin
    console.log('🔐 Logging in...');
    const loginData = JSON.stringify({username:'admin',password:'admin123'});
    
    const cookie = await new Promise((resolve, reject) => {
        const req = https.request(BASE_URL + '/api/auth/login', {
            method: 'POST',
            headers: {'Content-Type':'application/json','Content-Length':loginData.length}
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                const setCookie = res.headers['set-cookie']?.[0]?.split(';')[0];
                resolve(setCookie);
            });
        });
        req.on('error', reject);
        req.write(loginData);
        req.end();
    });
    
    console.log('✅ Logged in');
    
    // Download PSS Excel (exam ID 9)
    console.log('\n📥 Downloading PSS Excel...');
    const pssStart = Date.now();
    await downloadFile(BASE_URL + '/api/admin/exams/9/download', cookie, '/Users/macos/Downloads/PSS_Results.xlsx');
    console.log('✅ PSS Excel downloaded (' + (Date.now() - pssStart) + 'ms)');
    
    // Download SRQ Excel (exam ID 10)
    console.log('\n📥 Downloading SRQ Excel...');
    const srqStart = Date.now();
    await downloadFile(BASE_URL + '/api/admin/exams/10/download', cookie, '/Users/macos/Downloads/SRQ_Results.xlsx');
    console.log('✅ SRQ Excel downloaded (' + (Date.now() - srqStart) + 'ms)');
    
    // Download MMPI Excel (exam ID 5)
    console.log('\n📥 Downloading MMPI Excel...');
    const mmpiStart = Date.now();
    await downloadFile(BASE_URL + '/api/admin/exams/5/download', cookie, '/Users/macos/Downloads/MMPI_Results.xlsx');
    console.log('✅ MMPI Excel downloaded (' + (Date.now() - mmpiStart) + 'ms)');
    
    console.log('\n📂 Files saved to /Users/macos/Downloads/');
    console.log('   - PSS_Results.xlsx');
    console.log('   - SRQ_Results.xlsx');
    console.log('   - MMPI_Results.xlsx');
}

function downloadFile(url, cookie, filepath) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { Cookie: cookie } }, (res) => {
            if (res.statusCode !== 200) {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => {
                    console.log('❌ Error:', res.statusCode, data.substring(0, 200));
                    resolve();
                });
                return;
            }
            
            // Get file size from header
            const contentLength = res.headers['content-length'];
            console.log('   File size:', contentLength ? (parseInt(contentLength) / 1024).toFixed(2) + ' KB' : 'unknown');
            
            const file = fs.createWriteStream(filepath);
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', reject);
    });
}

downloadExcel().catch(console.error);
