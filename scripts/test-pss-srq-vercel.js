/**
 * Test PSS and SRQ Calculator on Vercel Dev
 * Run: node scripts/test-pss-srq-vercel.js
 */

const BASE_URL = process.env.VERCEL_URL || 'https://asisya-web-pipe-dev.vercel.app';

// Test data for Abdul Rahman
const testCandidate = {
    full_name: 'Abdul Rahman',
    email: `abdul.rahman.${Date.now()}@test.com`,
    phone: '081234567890',
    birth_date: '1995-03-15',
    gender: 'male',
    education: 'S1',
    occupation: 'Software Engineer'
};

// SRQ-29 Answers (TIDAK=0, YA=1)
// TIDAK TIDAK TIDAK TIDAK YA YA TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK YA TIDAK TIDAK
const srqAnswers = [
    0, 0, 0, 0, 1, 1, 0, 0, 0, 0,  // Q1-10: TIDAK TIDAK TIDAK TIDAK YA YA TIDAK TIDAK TIDAK TIDAK
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // Q11-20: TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK
    0, 0, 0, 0, 0, 0, 1, 0, 0      // Q21-29: TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK YA TIDAK TIDAK
];

// PSS-10 Answers (0-4 scale)
// 1 0 1 3 4 1 3 3 0 0
const pssAnswers = [1, 0, 1, 3, 4, 1, 3, 3, 0, 0];

async function fetchWithRetry(url, options, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            console.log(`  Retry ${i + 1}/${retries}...`);
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}

async function testSRQCalculation() {
    console.log('\n🧪 Testing SRQ-29 Calculation...');
    console.log('=' .repeat(50));
    
    // Map answers to expected format
    const answers = srqAnswers.map((val, idx) => ({
        questionNumber: idx + 1,
        answer: val === 1 ? 'YA' : 'TIDAK'
    }));
    
    // Calculate expected score
    const totalScore = srqAnswers.reduce((sum, val) => sum + val, 0);
    console.log(`📊 Input: ${srqAnswers.join(', ')}`);
    console.log(`📊 Expected Total Score: ${totalScore}`);
    
    // Determine expected categories
    // SRQ-29 scoring based on categories
    const expectedCategories = [];
    
    // Questions 1-20: Mental health symptoms
    const q1_20Score = srqAnswers.slice(0, 20).reduce((sum, v) => sum + v, 0);
    if (q1_20Score >= 6) expectedCategories.push('Gejala Kesehatan Mental');
    
    // Questions 21-24: Psychotic symptoms
    const q21_24Score = srqAnswers.slice(20, 24).reduce((sum, v) => sum + v, 0);
    if (q21_24Score >= 1) expectedCategories.push('Gejala Psikotik');
    
    // Questions 25-29: PTSD symptoms
    const q25_29Score = srqAnswers.slice(24, 29).reduce((sum, v) => sum + v, 0);
    if (q25_29Score >= 1) expectedCategories.push('Gejala PTSD');
    
    console.log(`📊 Q1-20 Score: ${q1_20Score}`);
    console.log(`📊 Q21-24 Score: ${q21_24Score}`);
    console.log(`📊 Q25-29 Score: ${q25_29Score}`);
    console.log(`📊 Expected Categories: ${expectedCategories.length > 0 ? expectedCategories.join(', ') : 'Normal'}`);
    
    return { 
        totalScore, 
        answers, 
        categories: expectedCategories,
        q1_20Score,
        q21_24Score,
        q25_29Score
    };
}

async function testPSSCalculation() {
    console.log('\n🧪 Testing PSS-10 Calculation...');
    console.log('='.repeat(50));
    
    // PSS-10 scoring
    // Questions 4, 5, 7, 8 are reversed (0=4, 1=3, 2=2, 3=1, 4=0)
    const reversedQuestions = [4, 5, 7, 8]; // 1-indexed
    
    const answers = pssAnswers.map((val, idx) => ({
        questionNumber: idx + 1,
        answer: val
    }));
    
    // Calculate score
    let totalScore = 0;
    pssAnswers.forEach((val, idx) => {
        const questionNum = idx + 1;
        if (reversedQuestions.includes(questionNum)) {
            // Reverse scored
            totalScore += (4 - val);
        } else {
            totalScore += val;
        }
    });
    
    console.log(`📊 Input: ${pssAnswers.join(', ')}`);
    console.log(`📊 Raw scores: ${pssAnswers.join(', ')}`);
    
    // Show reversed calculation
    console.log(`📊 Reversed Questions (4,5,7,8):`);
    reversedQuestions.forEach(qNum => {
        const rawVal = pssAnswers[qNum - 1];
        const reversedVal = 4 - rawVal;
        console.log(`   Q${qNum}: ${rawVal} → ${reversedVal} (reversed)`);
    });
    
    console.log(`📊 Total Score: ${totalScore}`);
    
    // Determine stress level
    let stressLevel;
    if (totalScore <= 13) {
        stressLevel = 'Low Stress';
    } else if (totalScore <= 26) {
        stressLevel = 'Moderate Stress';
    } else {
        stressLevel = 'High Stress';
    }
    
    console.log(`📊 Stress Level: ${stressLevel}`);
    
    return { totalScore, answers, stressLevel };
}

async function testAPIEndpoint(endpoint, method = 'GET', body = null) {
    console.log(`\n📡 Testing ${method} ${endpoint}...`);
    
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetchWithRetry(`${BASE_URL}${endpoint}`, options);
        const data = await response.json();
        
        console.log(`   Status: ${response.status}`);
        
        if (response.ok) {
            console.log('   ✅ Success');
            return { success: true, data, status: response.status };
        } else {
            console.log(`   ❌ Error: ${data.error || 'Unknown error'}`);
            return { success: false, error: data.error, status: response.status };
        }
    } catch (error) {
        console.log(`   ❌ Network Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log('🚀 PSS & SRQ Calculator Test Script');
    console.log(`📍 Target: ${BASE_URL}`);
    console.log(`👤 Candidate: ${testCandidate.full_name}`);
    console.log('='.repeat(60));
    
    // Test basic API health
    console.log('\n📋 Step 1: Check API Health');
    const health = await testAPIEndpoint('/api/health');
    
    if (!health.success) {
        console.log('\n❌ API not reachable. Make sure the dev server is running.');
        console.log('   Try: vercel dev or check deployment at Vercel dashboard');
        return;
    }
    
    // Calculate expected scores locally
    console.log('\n📋 Step 2: Local Score Calculation');
    const srqResult = await testSRQCalculation();
    const pssResult = await testPSSCalculation();
    
    // Test settings endpoint (public)
    console.log('\n📋 Step 3: Test Settings API');
    await testAPIEndpoint('/api/settings');
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 CALCULATION SUMMARY');
    console.log('='.repeat(60));
    
    console.log('\n🔹 SRQ-29 Results:');
    console.log(`   Total Score: ${srqResult.totalScore}/29`);
    console.log(`   Q1-20 (Mental Health): ${srqResult.q1_20Score}/20`);
    console.log(`   Q21-24 (Psychotic): ${srqResult.q21_24Score}/4`);
    console.log(`   Q25-29 (PTSD): ${srqResult.q25_29Score}/5`);
    console.log(`   Categories: ${srqResult.categories.length > 0 ? srqResult.categories.join(', ') : 'Normal (No categories flagged)'}`);
    
    console.log('\n🔹 PSS-10 Results:');
    console.log(`   Total Score: ${pssResult.totalScore}/40`);
    console.log(`   Stress Level: ${pssResult.stressLevel}`);
    console.log(`   Interpretation:`);
    console.log(`     0-13: Low Stress`);
    console.log(`     14-26: Moderate Stress`);
    console.log(`     27-40: High Stress`);
    
    console.log('\n🔹 Candidate Profile:');
    console.log(`   Name: ${testCandidate.full_name}`);
    console.log(`   Email: ${testCandidate.email}`);
    console.log(`   Phone: ${testCandidate.phone}`);
    console.log(`   Birth Date: ${testCandidate.birth_date}`);
    console.log(`   Gender: ${testCandidate.gender}`);
    console.log(`   Education: ${testCandidate.education}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed!');
    console.log('='.repeat(60));
    
    // Print curl commands for manual testing
    console.log('\n📝 Manual Test Commands (if needed):');
    console.log('\n# Test Health:');
    console.log(`curl ${BASE_URL}/api/health`);
    
    console.log('\n# Test Settings:');
    console.log(`curl ${BASE_URL}/api/settings`);
}

main().catch(console.error);
