-- Seed data for actividades_matriz
-- Actividades comunes de responsabilidad basadas en el sistema legacy

-- Note: This will insert default activities for ALL tenants
-- In production, you may want to insert these only for specific tenants

INSERT INTO public.actividades_matriz (tenant_id, nombre, responsable_default, orden, is_active, created_at)
SELECT 
    c.id as tenant_id,
    actividad.nombre,
    actividad.responsable_default,
    actividad.orden,
    true as is_active,
    now() as created_at
FROM public.companies c
CROSS JOIN (
    VALUES 
        ('ALIMENTACION Y VIATICOS DEL PERSONAL', 'EMPRESA', 1),
        ('CAMION-PLUMA CERTIFICADO', 'EMPRESA', 2),
        ('CERTIFICACIONES ADICIONALES', 'EMPRESA', 3),
        ('Certificaciones propias: Acólica', 'EMPRESA', 4),
        ('Combustible', 'CLIENTE', 5),
        ('Conductor', 'EMPRESA', 6),
        ('Daños al equipo', 'CLIENTE', 7),
        ('Dirección y supervisión', 'CLIENTE', 8),
        ('Elementos de izaje', 'CLIENTE', 9),
        ('Elementos de izaje básicos', 'EMPRESA', 10),
        ('Elementos de izaje específicos', 'CLIENTE', 11),
        ('Grúa certificada', 'EMPRESA', 12),
        ('Mantenimiento preventivo', 'EMPRESA', 13),
        ('Operador certificado', 'EMPRESA', 14),
        ('Permiso de trabajo', 'CLIENTE', 15),
        ('Plan de izaje', 'CLIENTE', 16),
        ('Seguro contra terceros', 'EMPRESA', 17),
        ('Transporte del equipo', 'EMPRESA', 18),
        ('Vías de acceso', 'CLIENTE', 19),
        ('Zona de trabajo preparada', 'CLIENTE', 20)
) AS actividad(nombre, responsable_default, orden)
ON CONFLICT DO NOTHING;
