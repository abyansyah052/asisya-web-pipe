// =============================================
// MANUAL INPUT VALIDATION (No External Dependencies)
// =============================================

export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// =============================================
// Validation Helpers
// =============================================

function isNumber(val: unknown): val is number {
    return typeof val === 'number' && !isNaN(val);
}

function isString(val: unknown): val is string {
    return typeof val === 'string';
}

function isPositiveInt(val: unknown): boolean {
    return isNumber(val) && Number.isInteger(val) && val > 0;
}

function isIntInRange(val: unknown, min: number, max: number): boolean {
    return isNumber(val) && Number.isInteger(val) && val >= min && val <= max;
}

// =============================================
// ✅ SECURITY: Input Sanitization
// =============================================

/**
 * Sanitize string input to prevent XSS attacks
 * - Removes HTML tags
 * - Limits length
 * - Trims whitespace
 */
export function sanitizeString(input: string, maxLength: number = 255): string {
    return input
        .trim()
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[<>'"&]/g, (char) => {
            const entities: Record<string, string> = {
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;',
                '&': '&amp;'
            };
            return entities[char] || char;
        })
        .slice(0, maxLength);
}

/**
 * Sanitize string but preserve original characters (for display)
 * Only removes potentially dangerous HTML/script tags
 */
export function sanitizeForStorage(input: string, maxLength: number = 255): string {
    return input
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/<[^>]*on\w+\s*=\s*[^>]*>/gi, '') // Remove event handlers
        .replace(/javascript:/gi, '') // Remove javascript: URLs
        .slice(0, maxLength);
}

// =============================================
// ✅ SECURITY: Password Strength Validation
// =============================================

export interface PasswordValidationResult {
    valid: boolean;
    error?: string;
    strength: 'weak' | 'medium' | 'strong';
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
    if (!password || typeof password !== 'string') {
        return { valid: false, error: 'Password wajib diisi', strength: 'weak' };
    }

    if (password.length < 8) {
        return { valid: false, error: 'Password minimal 8 karakter', strength: 'weak' };
    }

    if (password.length > 128) {
        return { valid: false, error: 'Password maksimal 128 karakter', strength: 'weak' };
    }

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);

    if (!hasLetter || !hasNumber) {
        return { valid: false, error: 'Password harus mengandung huruf dan angka', strength: 'weak' };
    }

    // Determine strength
    let strength: 'weak' | 'medium' | 'strong' = 'medium';
    if (password.length >= 12 && hasSpecial && hasUppercase && hasLowercase) {
        strength = 'strong';
    } else if (password.length < 10 || !hasSpecial) {
        strength = 'medium';
    }

    return { valid: true, strength };
}

// =============================================
// Code Generation Validation
// =============================================

export interface GenerateCodesInput {
    count: number;
    examId?: number | null;
    expiresInDays: number;
    candidateName?: string | null;
}

export function validateGenerateCodes(data: unknown): ValidationResult<GenerateCodesInput> {
    if (!data || typeof data !== 'object') {
        return { success: false, error: 'Invalid request body' };
    }

    const body = data as Record<string, unknown>;

    // count: required, integer 1-100
    if (!isIntInRange(body.count, 1, 100)) {
        return { success: false, error: 'count must be integer between 1 and 100' };
    }

    // expiresInDays: required, integer 1-365
    if (!isIntInRange(body.expiresInDays, 1, 365)) {
        return { success: false, error: 'expiresInDays must be integer between 1 and 365' };
    }

    // examId: optional, positive integer or null
    if (body.examId !== undefined && body.examId !== null && !isPositiveInt(body.examId)) {
        return { success: false, error: 'examId must be positive integer or null' };
    }

    // ✅ SECURITY: Sanitize candidateName
    let candidateName: string | null | undefined = body.candidateName as string | null | undefined;
    if (candidateName !== undefined && candidateName !== null) {
        if (!isString(candidateName) || candidateName.length > 255) {
            return { success: false, error: 'candidateName must be string max 255 chars' };
        }
        candidateName = sanitizeForStorage(candidateName);
    }

    return {
        success: true,
        data: {
            count: body.count as number,
            examId: body.examId as number | null | undefined,
            expiresInDays: body.expiresInDays as number,
            candidateName,
        }
    };
}

// =============================================
// Exam Submission Validation
// =============================================

export interface SubmitExamInput {
    attemptId: number;
    answers: Record<number, number>;
}

export function validateSubmitExam(data: unknown): ValidationResult<SubmitExamInput> {
    if (!data || typeof data !== 'object') {
        return { success: false, error: 'Invalid request body' };
    }

    const body = data as Record<string, unknown>;

    // attemptId: required, positive integer
    if (!isPositiveInt(body.attemptId)) {
        return { success: false, error: 'attemptId must be positive integer' };
    }

    // answers: required, object with numeric keys and values
    if (!body.answers || typeof body.answers !== 'object') {
        return { success: false, error: 'answers must be an object' };
    }

    const answers = body.answers as Record<string, unknown>;
    const validatedAnswers: Record<number, number> = {};

    for (const [key, value] of Object.entries(answers)) {
        const questionId = parseInt(key, 10);
        
        // Validate question ID is numeric and positive
        if (isNaN(questionId) || questionId <= 0) {
            return { success: false, error: `Invalid question ID: ${key}` };
        }

        // Validate option ID is positive integer
        if (!isPositiveInt(value)) {
            return { success: false, error: `Invalid option ID for question ${questionId}` };
        }

        validatedAnswers[questionId] = value as number;
    }

    if (Object.keys(validatedAnswers).length === 0) {
        return { success: false, error: 'At least one answer is required' };
    }

    return {
        success: true,
        data: {
            attemptId: body.attemptId as number,
            answers: validatedAnswers,
        }
    };
}

// =============================================
// Profile Completion Validation
// =============================================

export interface ProfileInput {
    full_name: string;
    tanggal_lahir: string;
    jenis_kelamin: 'Laki-laki' | 'Perempuan';
    pendidikan_terakhir: string;
    lokasi_test: string;
    alamat_ktp: string;
    nik: string;
    pekerjaan?: string | null;
}

export function validateProfile(data: unknown): ValidationResult<ProfileInput> {
    if (!data || typeof data !== 'object') {
        return { success: false, error: 'Invalid request body' };
    }

    const body = data as Record<string, unknown>;

    // full_name: required, 1-255 chars
    if (!isString(body.full_name) || body.full_name.trim().length < 1 || body.full_name.length > 255) {
        return { success: false, error: 'full_name must be 1-255 characters' };
    }

    // tanggal_lahir: required, YYYY-MM-DD format
    if (!isString(body.tanggal_lahir) || !/^\d{4}-\d{2}-\d{2}$/.test(body.tanggal_lahir)) {
        return { success: false, error: 'tanggal_lahir must be YYYY-MM-DD format' };
    }

    // jenis_kelamin: required, enum
    if (body.jenis_kelamin !== 'Laki-laki' && body.jenis_kelamin !== 'Perempuan') {
        return { success: false, error: 'jenis_kelamin must be Laki-laki or Perempuan' };
    }

    // pendidikan_terakhir: required, 1-100 chars
    if (!isString(body.pendidikan_terakhir) || body.pendidikan_terakhir.trim().length < 1 || body.pendidikan_terakhir.length > 100) {
        return { success: false, error: 'pendidikan_terakhir must be 1-100 characters' };
    }

    // lokasi_test: required, 1-255 chars
    if (!isString(body.lokasi_test) || body.lokasi_test.trim().length < 1 || body.lokasi_test.length > 255) {
        return { success: false, error: 'lokasi_test must be 1-255 characters' };
    }

    // alamat_ktp: required, 1-500 chars
    if (!isString(body.alamat_ktp) || body.alamat_ktp.trim().length < 1 || body.alamat_ktp.length > 500) {
        return { success: false, error: 'alamat_ktp must be 1-500 characters' };
    }

    // nik: required, exactly 16 digits
    if (!isString(body.nik) || !/^\d{16}$/.test(body.nik)) {
        return { success: false, error: 'nik must be exactly 16 digits' };
    }

    // pekerjaan: optional, max 100 chars
    if (body.pekerjaan !== undefined && body.pekerjaan !== null && body.pekerjaan !== '') {
        if (!isString(body.pekerjaan) || body.pekerjaan.length > 100) {
            return { success: false, error: 'pekerjaan must be max 100 characters' };
        }
    }

    return {
        success: true,
        data: {
            full_name: (body.full_name as string).trim(),
            tanggal_lahir: body.tanggal_lahir as string,
            jenis_kelamin: body.jenis_kelamin as 'Laki-laki' | 'Perempuan',
            pendidikan_terakhir: (body.pendidikan_terakhir as string).trim(),
            lokasi_test: (body.lokasi_test as string).trim(),
            alamat_ktp: (body.alamat_ktp as string).trim(),
            nik: body.nik as string,
            pekerjaan: body.pekerjaan as string | null | undefined,
        }
    };
}

// =============================================
// Exam Creation Validation
// =============================================

export interface CreateExamInput {
    title: string;
    description?: string | null;
    duration_minutes: number;
    display_mode: 'per_page' | 'scroll';
    instructions?: string | null;
    status: 'draft' | 'published' | 'archived';
}

export function validateCreateExam(data: unknown): ValidationResult<CreateExamInput> {
    if (!data || typeof data !== 'object') {
        return { success: false, error: 'Invalid request body' };
    }

    const body = data as Record<string, unknown>;

    // title: required, 1-200 chars
    if (!isString(body.title) || body.title.trim().length < 1 || body.title.length > 200) {
        return { success: false, error: 'title must be 1-200 characters' };
    }

    // duration_minutes: required, 1-480 (max 8 hours)
    if (!isIntInRange(body.duration_minutes, 1, 480)) {
        return { success: false, error: 'duration_minutes must be 1-480' };
    }

    // display_mode: optional, default 'per_page'
    const displayMode = body.display_mode || 'per_page';
    if (displayMode !== 'per_page' && displayMode !== 'scroll') {
        return { success: false, error: 'display_mode must be per_page or scroll' };
    }

    // status: optional, default 'draft'
    const status = body.status || 'draft';
    if (status !== 'draft' && status !== 'published' && status !== 'archived') {
        return { success: false, error: 'status must be draft, published, or archived' };
    }

    // description: optional, max 1000 chars
    if (body.description !== undefined && body.description !== null && body.description !== '') {
        if (!isString(body.description) || body.description.length > 1000) {
            return { success: false, error: 'description must be max 1000 characters' };
        }
    }

    // instructions: optional, max 5000 chars
    if (body.instructions !== undefined && body.instructions !== null && body.instructions !== '') {
        if (!isString(body.instructions) || body.instructions.length > 5000) {
            return { success: false, error: 'instructions must be max 5000 characters' };
        }
    }

    return {
        success: true,
        data: {
            title: (body.title as string).trim(),
            description: body.description as string | null | undefined,
            duration_minutes: body.duration_minutes as number,
            display_mode: displayMode as 'per_page' | 'scroll',
            instructions: body.instructions as string | null | undefined,
            status: status as 'draft' | 'published' | 'archived',
        }
    };
}
