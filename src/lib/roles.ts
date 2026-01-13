// Role Constants for Asisya B2B Model
// ====================================
// Role Hierarchy:
// super_admin (Developer/Platform owner)
//     └── admin (Owner/Client B2B)
//             └── psychologist (Psikolog/Assesor)
//                     └── candidate (Peserta - code auth)

export const ROLES = {
    CANDIDATE: 'candidate',
    PSYCHOLOGIST: 'psychologist', // formerly 'admin' - psikolog/assesor
    ADMIN: 'admin', // formerly 'super_admin' - owner/client B2B
    SUPER_ADMIN: 'super_admin', // developer/platform owner
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

// Role display names (Indonesian)
export const ROLE_LABELS: Record<UserRole, string> = {
    [ROLES.CANDIDATE]: 'Kandidat',
    [ROLES.PSYCHOLOGIST]: 'Psikolog',
    [ROLES.ADMIN]: 'Admin',
    [ROLES.SUPER_ADMIN]: 'Super Admin',
};

// Role descriptions
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
    [ROLES.CANDIDATE]: 'Peserta ujian yang mengakses via kode',
    [ROLES.PSYCHOLOGIST]: 'Psikolog/Assesor yang mengelola ujian dan kandidat',
    [ROLES.ADMIN]: 'Pemilik/Owner yang mengelola organisasi',
    [ROLES.SUPER_ADMIN]: 'Developer platform yang mengelola semua admin',
};

// Helper functions
export function canAccessPsychologistFeatures(role: string): boolean {
    return ['psychologist', 'admin', 'super_admin'].includes(role);
}

export function canAccessAdminFeatures(role: string): boolean {
    return ['admin', 'super_admin'].includes(role);
}

export function canAccessSuperAdminFeatures(role: string): boolean {
    return role === ROLES.SUPER_ADMIN;
}

// Get roles that the current role can manage
export function getManageableRoles(currentRole: string): UserRole[] {
    switch (currentRole) {
        case ROLES.SUPER_ADMIN:
            return [ROLES.ADMIN, ROLES.PSYCHOLOGIST, ROLES.CANDIDATE];
        case ROLES.ADMIN:
            return [ROLES.PSYCHOLOGIST, ROLES.CANDIDATE];
        case ROLES.PSYCHOLOGIST:
            return [ROLES.CANDIDATE];
        default:
            return [];
    }
}

// Check if a role can be changed by another role
export function canChangeRole(changer: string, targetOldRole: string, targetNewRole: string): boolean {
    const manageableRoles = getManageableRoles(changer);
    return manageableRoles.includes(targetOldRole as UserRole) && 
           manageableRoles.includes(targetNewRole as UserRole);
}

// Route paths for each role
export const ROLE_ROUTES: Record<UserRole, string> = {
    [ROLES.CANDIDATE]: '/candidate/dashboard',
    [ROLES.PSYCHOLOGIST]: '/psychologist/dashboard', // renamed from /admin
    [ROLES.ADMIN]: '/admin/dashboard', // new admin (owner) dashboard
    [ROLES.SUPER_ADMIN]: '/superadmin/dashboard',
};

// Get redirect path after login based on role
export function getLoginRedirect(role: string): string {
    return ROLE_ROUTES[role as UserRole] || '/';
}
