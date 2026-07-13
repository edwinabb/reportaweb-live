
export type AppRole = 'reporta_admin' | 'admin_tenant' | 'supervisor' | 'member';
export type DocType = 'DNI' | 'CE' | 'PASSPORT' | 'RUC' | 'OTHER';

export interface Company {
    id: string;
    name: string;
    ruc?: string;
    logo_url?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Profile {
    id: string;
    tenant_id?: string;
    role: AppRole;
    email: string | null;
    doc_number: string | null;
    first_name: string | null;
    last_name: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // Join fields
    full_name?: string; // Helper for UI
    // Profile Details (flattened)
    middle_name?: string;
    second_last_name?: string;
    doc_type?: DocType;
    nationality?: string;
    birth_date?: string;
    gender?: 'Masculino' | 'Femenino';
    photo_url?: string;
    signature_url?: string;
    phone?: string;
    pin?: string;
    job_title_id?: string;
    cargo?: string;
    direccion?: string;
    contacto_emergencia_nombre?: string;
    contacto_emergencia_celular?: string;
    contacto_emergencia_parentesco?: string;
}

export interface ProfileDetails {
    id: string;
    tenant_id: string;
    middle_name?: string;
    second_last_name?: string;
    doc_type: DocType;
    nationality?: string;
    birth_date?: string;
    gender?: 'Masculino' | 'Femenino';
    photo_url?: string;
    signature_url?: string;
    phone?: string;
    pin?: string;
    job_title_id?: string;
    area_id?: string;
    branch_id?: string;
    is_active: boolean;
}

export interface Team {
    id: string;
    tenant_id: string;
    name: string;
    code?: string;
    leader_id?: string;
    description?: string;
    is_active: boolean;
    created_at: string;
}
