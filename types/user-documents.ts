
import { z } from 'zod';

// --- ENUMS & CONSTANTS ---
export const DOC_CATEGORIES = ['seguro', 'con_vencimiento', 'sin_vencimiento'] as const;
export type DocumentCategory = typeof DOC_CATEGORIES[number];

export const MIGRATION_STATUSES = ['PENDING', 'COMPLETED', 'ERROR'] as const;
export type MigrationStatus = typeof MIGRATION_STATUSES[number];

// --- DATABASE INTERFACES ---

export interface DocumentType {
    id: string;
    tenant_id: string | null;
    name: string;
    code: string | null;
    category: DocumentCategory;
    expiration_alert_days: number; // default 30
    is_active: boolean;
    created_at: string;
    modified_at: string | null;
    created_by: string | null;
    modified_by: string | null;
    bubble_id: string | null;
}

export interface UserDocument {
    id: string;
    tenant_id: string;
    user_id: string;
    document_type_id: string;
    file_path: string;
    file_name: string;
    file_size: number | null;
    content_type: string | null;
    valid_from: string | null; // Date string YYYY-MM-DD
    valid_until: string | null; // Date string YYYY-MM-DD
    status?: 'VIGENTE' | 'VENCIDO' | 'POR_VENCER'; // Calculated in frontend/backend
    is_active: boolean;
    created_at: string;
    modified_at: string | null;
    created_by: string | null;
    modified_by: string | null;
    bubble_id: string | null;
    migration_status: MigrationStatus;

    // Relations (joined)
    document_type?: DocumentType;
    user?: {
        first_name: string;
        last_name: string;
        doc_number: string;
    };
}

// --- ZOD SCHEMAS FOR FORMS ---

export const documentTypeSchema = z.object({
    id: z.string().optional(), // Optional for create
    name: z.string().min(1, 'El nombre es obligatorio'),
    code: z.string().optional(),
    category: z.enum(DOC_CATEGORIES),
    expiration_alert_days: z.coerce.number().min(0).default(30),
});

export type DocumentTypeFormValues = z.infer<typeof documentTypeSchema>;

export const uploadDocumentSchema = z.object({
    id: z.string().optional(), // Optional, usually for edit (re-upload or metadata edit)
    user_id: z.string().uuid(),
    document_type_id: z.string().min(1, 'Debe seleccionar un tipo de documento'),
    valid_from: z.string().optional(),
    valid_until: z.string().optional(),
    // File validation is handled separately in the action due to FormData limitations, 
    // but we can have a refine check if we were using client-side validation libraries strictly.
});

export type UploadDocumentFormValues = z.infer<typeof uploadDocumentSchema>;
