ALTER TABLE public.formatos_preguntas
  ADD COLUMN IF NOT EXISTS fuente_foto TEXT
  CHECK (fuente_foto IN ('solo_camara', 'camara_o_galeria'))
  DEFAULT 'solo_camara';
