import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessSuperAdminFeatures } from '@/lib/roles';

// PUT - Update quota
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();

        if (!session || !canAccessSuperAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const organizationId = parseInt(id);
        const body = await request.json();
        const { totalExamSlots } = body;

        if (!totalExamSlots || totalExamSlots < 0) {
            return NextResponse.json({ error: 'Kuota harus lebih besar dari 0' }, { status: 400 });
        }

        // Check current used slots
        const currentQuota = await pool.query(
            'SELECT used_exam_slots FROM admin_quotas WHERE organization_id = $1',
            [organizationId]
        );

        if (currentQuota.rows.length === 0) {
            return NextResponse.json({ error: 'Kuota tidak ditemukan' }, { status: 404 });
        }

        const usedSlots = currentQuota.rows[0].used_exam_slots;

        if (totalExamSlots < usedSlots) {
            return NextResponse.json({
                error: `Kuota tidak bisa kurang dari yang sudah terpakai (${usedSlots})`
            }, { status: 400 });
        }

        await pool.query(
            'UPDATE admin_quotas SET total_exam_slots = $1 WHERE organization_id = $2',
            [totalExamSlots, organizationId]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating quota:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
