
# 🚀 Reporte de Avance: Migración y Estandarización de Monedas

## 📅 Estado al 24 de Enero 2026

### 1. 🔄 Estandarización de Monedas (PEN / USD)

Se ha completado la transición del manejo de monedas para usar exclusivamente códigos estándar **"PEN"** y **"USD"** en formato texto, eliminando la dependencia de relaciones complejas con la tabla `precios_monedas` en la interfaz de usuario.

#### ✅ Procesos de Migración

- **Finanzas**: Se actualizó el script `migrate-finance-tables.ts` para normalizar automáticamente "Soles"/"Dólares" a "PEN"/"USD".
- **Servicios**: Ajustado `migrate-services.ts` para guardar directamente el código de moneda.
- **Cotizaciones**: Ajustado `migrate-cotizaciones-bubble.ts` para respetar esta estandarización.
- **Base de Datos**: Se han eliminado restricciones (constraints) antiguas que impedían el uso de estos códigos de texto.

#### 🎨 Interfaz de Usuario (UI)

Se han actualizado todos los formularios de selección de moneda para usar listas estáticas seguras (PEN/USD), mejorando la velocidad y evitando errores de selección:

- **Cotizaciones (Paso 1)**: Selector de moneda simplificado.
- **Detalle de Precios**: Formularios de ofertas y edición de precios actualizados.
- **Servicios**: Formulario de creación/edición de servicios usa ahora selectores nativos PEN/USD.
- **Tasas de Cambio**: Formulario actualizado.

### 2. 📊 Estado de la Migración de Datos

Los procesos de migración se están ejecutando en segundo plano con la nueva lógica de monedas:

| Módulo | Estado | Registros Procesados | Notas |
| :--- | :--- | :--- | :--- |
| **Empresas** | ✅ Completado | Todos | Mapeo de IDs exitoso |
| **Finanzas** | 🔄 En Progreso | ~14,600+ items | Migrando facturas y pagos con moneda normalizada |
| **Servicios** | 🔄 En Cola | - | Iniciará al terminar Finanzas |
| **Cotizaciones** | 🔄 En Cola | - | Iniciará al terminar Servicios |

### 3. 🛠️ Próximos Pasos

1. **Validación**: Verificar que los datos insertados en `facturas`, `servicios` y `cotizaciones` tengan correctamente "PEN" o "USD".
2. **Limpieza**: (Opcional) Limpiar la tabla auxiliar `precios_monedas` para dejar solo referencias informativas si es necesario, o eliminarla si ya no se usa en absoluto.
3. **Auditoría UI**: Confirmar que no queden selectores "viejos" que busquen IDs en la tabla de monedas.

---
**Nota Técnica:** El cambio a texto "PEN"/"USD" simplifica enormemente las consultas y reportes, eliminando la necesidad de JOINS adicionales para saber la moneda de una transacción.
