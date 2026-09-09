-- Agrega distinción TO (destinatario principal) / CC (copia) a notificaciones_receptores.
-- DEFAULT 'TO' es intencional: los receptores ya existentes (DOCUMENTOS_*_VENCIDOS) deben seguir
-- recibiendo el email como destinatario principal sin requerir reconfiguración. Cambio aditivo,
-- no rompe el cron documentos-vencidos existente.
ALTER TABLE notificaciones_receptores
    ADD COLUMN IF NOT EXISTS tipo_destinatario text NOT NULL DEFAULT 'TO'
    CHECK (tipo_destinatario IN ('TO', 'CC'));
