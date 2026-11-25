# Hábitos — habit tracker multiusuario

Next.js 15 (App Router) + TypeScript + Supabase (Postgres + Auth) + Tailwind CSS + Recharts + Zod + Vitest.
Listo para desplegar en Vercel. **Configuración inicial: ver [SETUP.md](SETUP.md).**

## Funcionalidades

- Registro, login, logout, recuperación de contraseña y confirmación de email (`/auth/callback`).
- Datos privados por usuario con **Row Level Security** en todas las tablas + validación de propiedad en el servidor.
- **Hoy**: hábitos del día con checkbox (actualización optimista), progreso, racha global, flexibles semanales con progreso `X/N`, navegación hasta 7 días atrás.
- **Hábitos**: crear, editar, archivar, restaurar y eliminar. Frecuencias: diario, día por medio, semanal (días fijos), quincenal, mensual y flexible semanal.
- **Estadísticas**: cumplimiento global y por hábito (7/30/90 días y todo), heatmap anual, tendencia semanal, mejor/peor día, ranking, rachas por hábito.
- **Ajustes**: nombre, zona horaria, umbral de racha (50–100 %), tema claro/oscuro/sistema.

## Estructura

```
app/                 Rutas (App Router) y Server Actions (app/actions)
components/          Componentes de UI (cliente y servidor)
lib/                 Lógica pura (dates, frequency, schedule, streaks, metrics, today, validation)
lib/__tests__/       Tests de Vitest de la lógica pura
lib/supabase/        Clientes de Supabase (@supabase/ssr) y middleware de sesión
lib/data.ts          Lectura de datos en el servidor (con paginación)
middleware.ts        Refresca la sesión y protege rutas privadas
supabase/migrations/ Migraciones SQL versionadas
supabase/seed.sql    Datos de ejemplo (60 días) para un usuario existente
```

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm test` | Tests (Vitest) |
| `npm run typecheck` | Verificación de tipos |

## Decisiones de diseño

- **Fechas locales**: los registros guardan `date` (fecha local del usuario). "Hoy" se calcula siempre con la zona horaria del perfil (`todayInTimeZone`), nunca con la hora UTC del servidor.
- **Archivado**: `archived_on` guarda la fecha local en que se archivó; el hábito está activo hasta el día anterior. Al **restaurar** se borra `archived_on`, por lo que el periodo archivado vuelve a contar como días programados (sin registros).
- **Hoy no penaliza**: en rachas y métricas, el día de hoy solo cuenta si ya se cumplió.
- **Flexibles semanales**: semana de lunes a domingo. Si el hábito se crea o archiva a mitad de semana, la meta de esa semana es `min(veces, días activos)`. No suman al streak diario; una semana fallida marca como fallido el domingo de esa semana. En métricas, cada semana aporta `meta` oportunidades y `min(cumplimientos, meta)` logros.
- **Rachas por hábito** en su unidad natural: días (diario y día por medio, contando ocurrencias), semanas (semanal: todos los días programados de la semana; flexible: meta alcanzada), quincenas (quincenal) y meses (mensual).
- **Quincenal**: la primera ocurrencia es el primer día elegido en o después de la fecha de inicio; luego cada 14 días.
- **Editar la frecuencia** recalcula el historial con la nueva regla (los registros existentes se conservan).
- **Registro de días pasados**: solo en días en que el hábito estaba programado (o activo, si es flexible) y como máximo 7 días atrás.
- El heatmap y el análisis por día de la semana usan solo hábitos con días programados (los flexibles no tienen días fijos).
