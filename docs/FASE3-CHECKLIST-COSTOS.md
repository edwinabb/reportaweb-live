# Fase 3 — Checklist de información necesaria (costos e infraestructura)

No puedo completar esta fase de forma autónoma: no tengo acceso a tus dashboards de facturación reales. Para poder armar la comparación real (dev local vs. nube) y decidir con datos, necesito que me compartas (captura de pantalla o exportar CSV alcanza):

- [ ] **Cloudflare** — Dashboard → Billing: plan actual y costo mensual (Workers, Workers Builds si son ítems separados).
- [ ] **Supabase** — para CADA organización relevante (la que aloja PROD/TEST tras el traslado, y la de "alo" si sigue separada): Dashboard → Organization → Billing → plan y costo mensual, y qué proyectos cuentan contra el límite de proyectos activos.
- [ ] **EasyPanel / VPS de Gotenberg** (`infrastructure-gotenberg.0vt9eo.easypanel.host`) — costo mensual del VPS/hosting donde corre.
- [ ] **Resend** (o Postmark, según cómo avance la Fase 0b) — plan actual y costo.
- [ ] Cualquier otra suscripción que hoy pagues específicamente para reportaweb3/reporta-app (dominios, otros servicios).

Con esos datos puedo:
1. Armar la tabla de costo real por servicio.
2. Calcular cuánto ahorraría (si algo) mover el entorno de desarrollo a local (Docker) vs. mantenerlo en la nube.
3. Recomendar con números, no con supuestos.

**Nota:** ya existe un stack de Supabase local corriendo en esta PC hace 3+ meses para `reportaweb3` (contenedores `supabase_db_reportaweb3`, `supabase_studio_reportaweb3`, etc. — puerto 54321 Kong, 54322 DB, 54323 Studio). Cuando retomemos esta fase con los datos de costo, ya hay un punto de partida local funcionando, no hace falta crearlo desde cero.
