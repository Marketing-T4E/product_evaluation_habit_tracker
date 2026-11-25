# Guía de configuración inicial

Pasos que debes hacer tú, en orden. El código, las migraciones, el seed y la configuración local de Supabase ya están en el repositorio.

> Requisito: Node.js 20.11 o superior (recomendado **Node 22**; `@supabase/supabase-js` avisa que dejará de soportar Node 20).

---

## 1. Crear el proyecto en Supabase

1. Entra a <https://supabase.com/dashboard> → **New project**.
2. Elige organización, nombre, **contraseña de la base de datos** (guárdala: la pide el CLI) y región (la más cercana a tus usuarios / a Vercel).
3. Cuando termine de crearse, copia estos valores:
   - **Project URL** y **llave pública**: botón **Connect** (arriba) o **Project Settings → API Keys / Data API**.
     - URL: `https://<project-ref>.supabase.co`
     - Llave pública: la **anon** (legacy, empieza con `eyJ...`) o la **publishable** (`sb_publishable_...`). Cualquiera de las dos sirve.
   - **Project ref**: el identificador de la URL (`https://supabase.com/dashboard/project/<project-ref>`).
4. **No uses** la `service_role` / secret key en ningún lado: la app no la necesita.

## 2. Aplicar las migraciones

La migración está en `supabase/migrations/20261125000000_init.sql` (tablas, RLS, trigger de perfiles e índices).

**Opción A – Supabase CLI** (ya instalado como dependencia de desarrollo), desde la carpeta del proyecto:

```powershell
npm install
```

```powershell
npx supabase login
```

```powershell
npx supabase link --project-ref <project-ref>
```

```powershell
npx supabase db push
```

(`link` te pedirá la contraseña de la base de datos del paso 1.)

**Opción B – SQL Editor:** en el dashboard ve a **SQL Editor → New query**, pega el contenido completo de `supabase/migrations/20261125000000_init.sql` y pulsa **Run**. Debe terminar con "Success. No rows returned".

Comprueba en **Table Editor** que existen `profiles`, `habits` y `habit_completions`, y que las tres muestran **RLS enabled**.

## 3. Configurar Supabase Auth

En **Authentication → URL Configuration**:

- **Site URL**: la URL de producción de Vercel, p. ej. `https://tu-app.vercel.app`. (Hasta que despliegues puedes dejar `http://localhost:3000` y cambiarla después del paso 6.)
- **Redirect URLs** → **Add URL**, agrega estas tres:
  - `http://localhost:3000/**`
  - `https://tu-app.vercel.app/**`
  - `https://*-<tu-usuario-o-equipo-de-vercel>.vercel.app/**` (opcional, para los *preview deployments*)

En **Authentication → Sign In / Providers → Email**:

- **Enable Email provider**: activado.
- **Confirm email**: actívalo si quieres que los usuarios confirmen su email antes de entrar (recomendado). Si lo desactivas, el registro inicia sesión directamente.
- Contraseña mínima: la app exige 8 caracteres; puedes poner el mismo mínimo en **Minimum password length**.

**Plantillas de email (recomendado)** — en **Authentication → Emails → Templates**, para que los enlaces funcionen aunque el usuario los abra en otro navegador o dispositivo, reemplaza el enlace de cada plantilla:

- **Confirm signup** – cambia el `href` del enlace por:
  ```
  {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/
  ```
- **Reset password** – cambia el `href` del enlace por:
  ```
  {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
  ```

(Con las plantillas por defecto también funciona, siempre que el enlace se abra en el mismo navegador donde se hizo el registro o la solicitud.)

**Envío de emails:** el servidor de email incluido en Supabase tiene un límite muy bajo de envíos por hora y es solo para pruebas. Para producción configura un SMTP propio en **Authentication → Emails → SMTP Settings** (Resend, Postmark, SendGrid, etc.).

## 4. Variables de entorno

| Variable | `.env.local` (local) | Vercel (Production / Preview) |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | la misma |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | llave anon o publishable | la misma |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | `https://tu-app.vercel.app` (solo en *Production*; en *Preview* déjala vacía para usar el dominio del preview) |

Local: copia `.env.example` como `.env.local` y complétalo:

```powershell
Copy-Item .env.example .env.local
```

No agregues ninguna otra llave de Supabase.

## 5. Correr el proyecto localmente

```powershell
npm install
```

```powershell
npm run dev
```

Abre <http://localhost:3000>. Otros comandos: `npm test`, `npm run lint`, `npm run build`.

## 6. Desplegar en Vercel desde GitHub

1. Crea un repositorio **vacío** en GitHub (sin README ni .gitignore).
2. Sube el código (el repo local ya existe con un commit inicial de Create Next App):
   ```powershell
   git add -A
   ```
   ```powershell
   git commit -m "Habit tracker con Next.js y Supabase"
   ```
   ```powershell
   git branch -M main
   ```
   ```powershell
   git remote add origin https://github.com/<usuario>/<repo>.git
   ```
   ```powershell
   git push -u origin main
   ```
3. En <https://vercel.com/new> → **Import Git Repository** → elige el repo. Vercel detecta Next.js; no cambies los comandos de build.
4. Antes de pulsar **Deploy**, abre **Environment Variables** y agrega las variables del paso 4.
5. **Deploy**. Cuando termine, copia el dominio de producción (`https://tu-app.vercel.app`) y:
   - Vuelve al paso 3 y pon esa URL como **Site URL** y en **Redirect URLs** de Supabase.
   - Si no habías puesto `NEXT_PUBLIC_SITE_URL` con el dominio final, agrégala en Vercel → **Settings → Environment Variables** y haz **Redeploy** (las variables `NEXT_PUBLIC_*` se fijan en el build, así que cualquier cambio requiere redeploy).

## 7. Seed opcional (datos de ejemplo)

Crea 6 hábitos de ejemplo con 60 días de historial para un usuario **ya registrado**:

1. Regístrate en la app (y confirma el email si está activado).
2. Abre `supabase/seed.sql`, cambia `tu-email@ejemplo.com` por tu email.
3. Pega el script completo en **SQL Editor** de Supabase y pulsa **Run**. Debe mostrar el aviso "Seed creado para …".
4. Se puede ejecutar varias veces: reemplaza los hábitos de ejemplo anteriores. Para borrarlos: `delete from habits where description = '[seed]';`

> No uses `supabase db reset` contra el proyecto remoto: borra todos los datos.

## 8. Checklist de verificación después del despliegue

- [ ] **Registro**: crea una cuenta en `https://tu-app.vercel.app/signup`. Si "Confirm email" está activo, llega el email, el enlace abre la app con la sesión iniciada.
- [ ] En Supabase → **Table Editor → profiles** aparece la fila del usuario con su nombre y zona horaria correcta.
- [ ] **Login / logout**: cierra sesión, vuelve a entrar; recarga la página y la sesión se mantiene.
- [ ] **Rutas protegidas**: en una ventana de incógnito abre `/stats` → redirige a `/login`.
- [ ] **Olvidé mi contraseña**: solicita el enlace, ábrelo, define una contraseña nueva e inicia sesión con ella.
- [ ] **Hábitos**: crea uno de cada tipo (diario, día por medio, semanal, quincenal, mensual, flexible). Los que tocan hoy aparecen en "Hoy"; márcalos y desmárcalos; el progreso y la racha se actualizan.
- [ ] Navega a días anteriores (hasta 7) y registra un hábito olvidado; no se puede avanzar a días futuros.
- [ ] Archiva un hábito: desaparece de "Hoy" y aparece en "Archivados"; restáuralo; elimina otro (pide confirmación).
- [ ] **Ajustes**: cambia el umbral de racha y la zona horaria; prueba modo claro/oscuro.
- [ ] **Estadísticas**: con el seed cargado se ven heatmap, tendencia semanal, día mejor/peor y ranking.
- [ ] **Aislamiento entre usuarios**: crea un segundo usuario en otro navegador (o incógnito). No ve ningún hábito del primero. Copia la URL `/habits/<id>/edit` de un hábito del usuario A y ábrela como usuario B → página "No encontramos esta página".
- [ ] (Opcional) En **SQL Editor**: `select count(*) from habits;` muestra todos los hábitos (como administrador), mientras que en la app cada usuario solo ve los suyos.
