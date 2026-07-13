---
description: Reglas de optimización para todos los procesos del proyecto
---

# Reglas de Optimización

1. **Siempre buscar la mejor solución para el proyecto**, sin importar el modelo de IA que se utilice.
2. **Optimizar el uso de créditos de IA** en todos los procesos:
   - Planificar antes de ejecutar para evitar iteraciones innecesarias.
   - Agrupar operaciones similares (batch inserts, parallel processing).
   - Evitar re-procesar datos ya migrados/procesados.
   - Minimizar llamadas redundantes a APIs externas.
   - Reutilizar contexto de conversaciones anteriores cuando sea posible.
