-- Allow more values for periodo_unidad
ALTER TABLE public.cotizaciones DROP CONSTRAINT IF EXISTS cotizaciones_periodo_unidad_check;
ALTER TABLE public.cotizaciones
ADD CONSTRAINT cotizaciones_periodo_unidad_check CHECK (
        periodo_unidad IN (
            'DIA',
            'MES',
            'ANIO',
            'HORA',
            'GLOBAL',
            'SERVICIO',
            'UNIDAD',
            'JORNADA',
            'UND'
        )
    );