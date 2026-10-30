-- Elimina 'reporte_maquinaria' del CHECK constraint de system_document_templates.
-- Este tipo lo genera v3 internamente vía HTML→Gotenberg; no necesita plantilla .docx
-- ni integración con el bridge de Bubble.

ALTER TABLE public.system_document_templates
    DROP CONSTRAINT system_document_templates_tipo_check;

ALTER TABLE public.system_document_templates
    ADD CONSTRAINT system_document_templates_tipo_check
    CHECK (tipo IN (
        'cotizacion', 'valorizacion_venta', 'valorizacion_compra',
        'reporte_horas_maquinaria', 'reporte_personal'
    ));
