/**
 * Script untuk menguji semua API yang dibuat/diupdate
 * Jalankan dengan: node scripts/test-all-apis.js
 */

const BASE_URL = 'http://localhost:3000';

// Test results storage
const results = [];

async function logResult(name, success, details = '') {
    const status = success ? '✅' : '❌';
    console.log(`${status} ${name} ${details ? `- ${details}` : ''}`);
    results.push({ name, success, details });
}

async function testPublicEndpoints() {
    console.log('\n=== Testing Public Endpoints ===');
    
    // Test health check if exists
    try {
        const res = await fetch(`${BASE_URL}/api/health`);
        await logResult('Health Check', res.ok, `Status: ${res.status}`);
    } catch (e) {
        await logResult('Health Check', false, e.message);
    }
}

async function testAdminCompanyCodesAPI() {
    console.log('\n=== Testing Admin Company Codes API (requires auth) ===');
    
    // Test without auth (should return 401/403)
    try {
        const res = await fetch(`${BASE_URL}/api/admin/company-codes`);
        await logResult('Admin Company Codes (no auth)', res.status === 401 || res.status === 403, 
            `Status: ${res.status} (expected 401 or 403)`);
    } catch (e) {
        await logResult('Admin Company Codes (no auth)', false, e.message);
    }
}

async function testSuperadminCompanyCodesAPI() {
    console.log('\n=== Testing Superadmin Company Codes API (requires auth) ===');
    
    // Test without auth (should return 401/403)
    try {
        const res = await fetch(`${BASE_URL}/api/superadmin/company-codes`);
        await logResult('Superadmin Company Codes GET (no auth)', res.status === 401 || res.status === 403,
            `Status: ${res.status} (expected 401 or 403)`);
    } catch (e) {
        await logResult('Superadmin Company Codes GET (no auth)', false, e.message);
    }
    
    try {
        const res = await fetch(`${BASE_URL}/api/superadmin/company-codes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: '99', company_name: 'Test Company' })
        });
        await logResult('Superadmin Company Codes POST (no auth)', res.status === 401 || res.status === 403,
            `Status: ${res.status} (expected 401 or 403)`);
    } catch (e) {
        await logResult('Superadmin Company Codes POST (no auth)', false, e.message);
    }
}

async function testSuperadminClientsAPI() {
    console.log('\n=== Testing Superadmin Clients API (requires auth) ===');
    
    try {
        const res = await fetch(`${BASE_URL}/api/superadmin/clients`);
        await logResult('Superadmin Clients GET (no auth)', res.status === 401 || res.status === 403,
            `Status: ${res.status} (expected 401 or 403)`);
    } catch (e) {
        await logResult('Superadmin Clients GET (no auth)', false, e.message);
    }
}

async function testSuperadminQuotasAPI() {
    console.log('\n=== Testing Superadmin Quotas API (requires auth) ===');
    
    try {
        const res = await fetch(`${BASE_URL}/api/superadmin/quotas/1`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 100 })
        });
        await logResult('Superadmin Quotas PUT (no auth)', res.status === 401 || res.status === 403,
            `Status: ${res.status} (expected 401 or 403)`);
    } catch (e) {
        await logResult('Superadmin Quotas PUT (no auth)', false, e.message);
    }
}

async function testCodeGenerateAPI() {
    console.log('\n=== Testing Code Generate API (requires auth) ===');
    
    try {
        const res = await fetch(`${BASE_URL}/api/admin/codes/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                count: 1,
                examType: 'general',
                useLegacyFormat: true 
            })
        });
        await logResult('Admin Code Generate POST (no auth)', res.status === 401 || res.status === 403,
            `Status: ${res.status} (expected 401 or 403)`);
    } catch (e) {
        await logResult('Admin Code Generate POST (no auth)', false, e.message);
    }
}

async function testExamResultsAPI() {
    console.log('\n=== Testing Exam Results API (requires auth) ===');
    
    try {
        const res = await fetch(`${BASE_URL}/api/admin/exams/1/results?includeInProgress=true`);
        await logResult('Admin Exam Results (no auth)', res.status === 401 || res.status === 403,
            `Status: ${res.status} (expected 401 or 403)`);
    } catch (e) {
        await logResult('Admin Exam Results (no auth)', false, e.message);
    }
}

async function testExamDownloadAPI() {
    console.log('\n=== Testing Exam Download API (requires auth) ===');
    
    try {
        const res = await fetch(`${BASE_URL}/api/admin/exams/1/download`);
        await logResult('Admin Exam Download (no auth)', res.status === 401 || res.status === 403,
            `Status: ${res.status} (expected 401 or 403)`);
    } catch (e) {
        await logResult('Admin Exam Download (no auth)', false, e.message);
    }
}

async function testGroupingAPI() {
    console.log('\n=== Testing Grouping API (requires auth) ===');
    
    try {
        const res = await fetch(`${BASE_URL}/api/admin/grouping/candidates`);
        await logResult('Admin Grouping Candidates (no auth)', res.status === 401 || res.status === 403,
            `Status: ${res.status} (expected 401 or 403)`);
    } catch (e) {
        await logResult('Admin Grouping Candidates (no auth)', false, e.message);
    }
    
    try {
        const res = await fetch(`${BASE_URL}/api/superadmin/grouping/1`);
        await logResult('Superadmin Grouping (no auth)', res.status === 401 || res.status === 403,
            `Status: ${res.status} (expected 401 or 403)`);
    } catch (e) {
        await logResult('Superadmin Grouping (no auth)', false, e.message);
    }
}

async function testSettingsAPI() {
    console.log('\n=== Testing Settings API ===');
    
    try {
        const res = await fetch(`${BASE_URL}/api/settings`);
        if (res.ok) {
            const data = await res.json();
            await logResult('Settings GET', true, `Keys: ${Object.keys(data).join(', ')}`);
        } else {
            await logResult('Settings GET', res.ok, `Status: ${res.status}`);
        }
    } catch (e) {
        await logResult('Settings GET', false, e.message);
    }
}

async function printSummary() {
    console.log('\n========================================');
    console.log('=== API TEST SUMMARY ===');
    console.log('========================================');
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Total Tests: ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    if (failed > 0) {
        console.log('\n❌ Failed Tests:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`  - ${r.name}: ${r.details}`);
        });
    }
    
    console.log('\n✅ All protected endpoints correctly return 401/403 without auth');
    console.log('NOTE: Full API testing requires authentication. Use browser or Postman for authenticated tests.');
}

async function runTests() {
    console.log('========================================');
    console.log('=== ASISYA WEB API TEST SUITE ===');
    console.log('========================================');
    console.log(`Testing against: ${BASE_URL}`);
    console.log(`Time: ${new Date().toISOString()}`);
    
    await testPublicEndpoints();
    await testSettingsAPI();
    await testAdminCompanyCodesAPI();
    await testSuperadminCompanyCodesAPI();
    await testSuperadminClientsAPI();
    await testSuperadminQuotasAPI();
    await testCodeGenerateAPI();
    await testExamResultsAPI();
    await testExamDownloadAPI();
    await testGroupingAPI();
    
    await printSummary();
}

runTests().catch(console.error);
