-- Explicit GRANTs for Supabase API security change (May 30, 2026)
--
-- After 2026-05-30, NEW Supabase projects require explicit GRANT before tables are
-- accessible via PostgREST/supabase-js. Existing projects keep the old behavior until
-- 2026-10-30 — this migration future-proofs us before that deadline.
--
-- Grants full DML to `authenticated` (subject to RLS) and `service_role` (bypasses RLS).
-- Add this pattern to every new CREATE TABLE going forward.

-- ── Transactional / tenant-specific tables ──────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.actividades_matriz TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_calendario_festivos TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_hora_intervalos TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.areas TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bancos TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bitacora_operaciones TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cargo_permisos TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogos TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cobros_venta TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies_consecutives TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_informe_maquinaria TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_informe_personal TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_valorizacion_compra TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_valorizacion_venta TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contactos_area TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contactos_cargo TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotizaciones TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotizaciones_configuracion TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotizaciones_configuracion_doc TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotizaciones_detalle TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotizaciones_historial TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotizaciones_matriz_actividades TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotizaciones_matriz_responsabilidad TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotizaciones_motivo_rechazo TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotizaciones_ofertas_items TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotizaciones_ofertas_proveedores TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_types TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.factura_venta_pagos TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facturas_compra TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facturas_compra_item TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facturas_compra_pagos TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facturas_venta TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facturas_venta_item TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_migration_log TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formas_pago TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formatos TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formatos_correlativos TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formatos_informes TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formatos_informes_comentarios TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formatos_informes_maquinarias TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formatos_informes_personal TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formatos_informes_respuestas TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formatos_opciones TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formatos_preguntas TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formatos_versiones TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gastos_usuario TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.informe_objetos TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspecciones TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspecciones_detalles TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_titles TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maquinaria_documentos TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maquinaria_horas TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maquinaria_modelos TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maquinaria_tipos_docs TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maquinarias TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificaciones_receptores TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.paises TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_cargos TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planes_accion TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planes_accion_avances TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planes_accion_responsables TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plantillas TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plazos_pago TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.precios_minimos TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.precios_monedas TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.precios_nombres TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_details TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reportes_combustible TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reportes_maquinaria TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reportes_personal TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reportes_usuario TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rubros TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servicios TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servicios_tipo TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servicios_tipo_precios TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sistema_recursos TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sitios_tipo TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sitios_ubicacion TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sst_epp_alerta TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sst_epp_config TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sst_epp_entrega TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sst_epp_item TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sst_epp_movimiento TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sst_epp_reporte TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tareas TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tareas_comentarios TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tareas_fechas TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tareas_recursos TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasas_cambio TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.terceros TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.terceros_contactos TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.terceros_personal TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.terceros_sitios TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.terceros_sitios_rel TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.terceros_tipos TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets_soporte TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets_soporte_respuestas TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiempo_unidades TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tipos_precio TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ubigeo TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_documents TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.valorizaciones TO authenticated, service_role;

-- ── Views (SELECT only) ──────────────────────────────────────────────────────
GRANT SELECT ON public.view_valoraciones_ventas TO authenticated, service_role;
GRANT SELECT ON public.view_compras_pendiente_valorizar TO authenticated, service_role;
GRANT SELECT ON public.view_compras_pendientes_facturar TO authenticated, service_role;
GRANT SELECT ON public.view_valoraciones_compras TO authenticated, service_role;
GRANT SELECT ON public.view_ventas_pendiente_valorizar TO authenticated, service_role;
GRANT SELECT ON public.view_ventas_pendientes_facturar TO authenticated, service_role;
