
import { z } from 'zod';

export interface JobTitle {
    id: string;
    tenant_id: string;
    name: string;
    is_active: boolean;
    created_at: string;
    created_by: string | null;
    updated_at: string;
    updated_by: string | null;
}

export const jobTitleSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'El nombre es obligatorio'),
    is_active: z.boolean().default(true),
});

export type JobTitleFormValues = z.infer<typeof jobTitleSchema>;
