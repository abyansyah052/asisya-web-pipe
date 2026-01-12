// Script to fix incomplete srq_conclusion values in database
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    const client = await pool.connect();
    try {
        console.log('🔧 Fixing incomplete SRQ conclusions...\n');
        
        // Find attempts with incomplete srq_conclusion
        const incompleteRes = await client.query(`
            SELECT ea.id, ea.srq_result, ea.srq_conclusion
            FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.id
            WHERE e.exam_type = 'srq29' 
            AND ea.status = 'completed'
            AND ea.srq_result IS NOT NULL
        `);
        
        console.log(`Found ${incompleteRes.rows.length} SRQ attempts to check\n`);
        
        let fixed = 0;
        for (const row of incompleteRes.rows) {
            try {
                const srqResult = JSON.parse(row.srq_result);
                const result = srqResult.result;
                
                if (!result) {
                    console.log(`  ID ${row.id}: No result object in srq_result`);
                    continue;
                }
                
                // Calculate new conclusion based on result object
                const symptoms = [];
                if (result.anxiety) symptoms.push('Cemas/Depresi');
                if (result.substance) symptoms.push('Zat');
                if (result.psychotic) symptoms.push('Psikotik');
                if (result.ptsd) symptoms.push('PTSD');
                
                let newConclusion = 'Normal';
                if (symptoms.length > 0) {
                    if (symptoms.length === 1) {
                        newConclusion = `Tidak Normal - ${symptoms[0]}`;
                    } else {
                        newConclusion = `Tidak Normal - ${symptoms.join(' + ')}`;
                    }
                }
                
                // Check if needs update
                if (row.srq_conclusion !== newConclusion) {
                    console.log(`  ID ${row.id}: "${row.srq_conclusion}" → "${newConclusion}"`);
                    await client.query(
                        'UPDATE exam_attempts SET srq_conclusion = $1 WHERE id = $2',
                        [newConclusion, row.id]
                    );
                    fixed++;
                }
            } catch (e) {
                console.log(`  ID ${row.id}: Error parsing - ${e.message}`);
            }
        }
        
        console.log(`\n✅ Fixed ${fixed} SRQ conclusions`);
        
        // Verify the fix
        console.log('\n=== Verification ===');
        const verifyRes = await client.query(`
            SELECT 
                COALESCE(up.full_name, u.username) as student,
                ea.score,
                ea.srq_conclusion
            FROM exam_attempts ea
            JOIN users u ON ea.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            JOIN exams e ON ea.exam_id = e.id
            WHERE e.exam_type = 'srq29' AND ea.status = 'completed'
            ORDER BY ea.end_time DESC
            LIMIT 5
        `);
        console.log('Current SRQ conclusions:');
        verifyRes.rows.forEach(r => {
            console.log(`  - ${r.student}: score=${r.score}, conclusion="${r.srq_conclusion}"`);
        });
        
    } finally {
        client.release();
        pool.end();
    }
}

main().catch(console.error);
