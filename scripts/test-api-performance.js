// Test API performance dengan concurrent requests
const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function makeRequest(path, cookie = '') {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET',
            headers: cookie ? { 'Cookie': cookie } : {}
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const duration = Date.now() - start;
                resolve({ status: res.statusCode, duration, path });
            });
        });

        req.on('error', reject);
        req.setTimeout(120000); // 120 second timeout
        req.end();
    });
}

async function testConcurrentRequests(path, count, cookie = '') {
    console.log(`\n🔥 Testing ${count} concurrent requests to ${path}...`);
    const start = Date.now();
    
    const requests = Array(count).fill(0).map(() => makeRequest(path, cookie));
    const results = await Promise.all(requests);
    
    const totalTime = Date.now() - start;
    const avgTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const maxTime = Math.max(...results.map(r => r.duration));
    const minTime = Math.min(...results.map(r => r.duration));
    
    console.log(`✅ Completed in ${totalTime}ms`);
    console.log(`   Average: ${Math.round(avgTime)}ms`);
    console.log(`   Min: ${minTime}ms, Max: ${maxTime}ms`);
    console.log(`   Throughput: ${Math.round(count / (totalTime / 1000))} req/s`);
    
    return { avgTime, maxTime, minTime, totalTime };
}

async function testSequentialRequests(path, count, cookie = '') {
    console.log(`\n📊 Testing ${count} sequential requests to ${path}...`);
    const start = Date.now();
    
    const durations = [];
    for (let i = 0; i < count; i++) {
        const result = await makeRequest(path, cookie);
        durations.push(result.duration);
        if ((i + 1) % 10 === 0) {
            process.stdout.write(`\r   Progress: ${i + 1}/${count}`);
        }
    }
    console.log(); // New line
    
    const totalTime = Date.now() - start;
    const avgTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const maxTime = Math.max(...durations);
    const minTime = Math.min(...durations);
    
    console.log(`✅ Completed in ${totalTime}ms`);
    console.log(`   Average: ${Math.round(avgTime)}ms`);
    console.log(`   Min: ${minTime}ms, Max: ${maxTime}ms`);
    
    return { avgTime, maxTime, minTime, totalTime };
}

async function main() {
    console.log('🚀 API Performance Test for 800 Concurrent Users');
    console.log('='.repeat(60));
    
    try {
        // 1. Test settings API (public endpoint)
        console.log('\n1️⃣ Testing /api/settings (public)');
        await testSequentialRequests('/api/settings', 5);
        await testConcurrentRequests('/api/settings', 10);
        await testConcurrentRequests('/api/settings', 50);
        await testConcurrentRequests('/api/settings', 100);
        
        // 2. Test with cache (second batch)
        console.log('\n2️⃣ Testing /api/settings with cache');
        await testConcurrentRequests('/api/settings', 100);
        
        console.log('\n\n' + '='.repeat(60));
        console.log('✅ Performance test completed!');
        console.log('\nInterpretation for 800 users:');
        console.log('- If avg < 100ms: Excellent ✅');
        console.log('- If avg < 500ms: Good 👍');
        console.log('- If avg < 2000ms: Acceptable ⚠️');
        console.log('- If avg > 2000ms: Problem ❌');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

main();
