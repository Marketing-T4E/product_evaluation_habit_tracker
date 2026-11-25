-- =============================================================
-- Seed opcional: crea 6 hábitos de ejemplo con 60 días de historial
-- para un usuario YA REGISTRADO en la app.
--
-- Uso: cambia el email de la línea `v_email` y ejecuta todo el
-- script en Supabase → SQL Editor (corre como superusuario, así que
-- no lo bloquea RLS). Es idempotente: borra y recrea los hábitos
-- de ejemplo (los que tienen la descripción "[seed]").
-- Si el usuario no existe, solo muestra un aviso y no hace nada.
-- =============================================================
do $$
declare
  v_email text := 'tu-email@ejemplo.com';  -- <-- CAMBIA ESTO
  v_user uuid;
  v_tz text;
  v_today date;
  v_start date;
  v_habit uuid;
  r record;
begin
  select id into v_user from auth.users where lower(email) = lower(v_email);
  if v_user is null then
    raise notice 'Seed omitido: no existe un usuario con email %', v_email;
    return;
  end if;

  select coalesce(timezone, 'UTC') into v_tz from public.profiles where id = v_user;
  v_today := (now() at time zone coalesce(v_tz, 'UTC'))::date;
  v_start := v_today - 60;

  delete from public.habits where user_id = v_user and description = '[seed]';

  for r in
    select * from (values
      ('Meditar',        '🧘', '#8b5cf6', 'daily'::public.habit_frequency,           '{}'::jsonb,                 0.85),
      ('Leer 20 minutos','📚', '#3b82f6', 'daily'::public.habit_frequency,           '{}'::jsonb,                 0.70),
      ('Correr',         '🏃', '#f97316', 'every_other_day'::public.habit_frequency, '{}'::jsonb,                 0.75),
      ('Llamar a mamá',  '📞', '#ec4899', 'weekly'::public.habit_frequency,          '{"days":[3,7]}'::jsonb,     0.80),
      ('Revisar finanzas','💰','#eab308', 'monthly'::public.habit_frequency,         '{"day":1}'::jsonb,          0.90),
      ('Gimnasio',       '🏋️', '#10b981', 'weekly_flexible'::public.habit_frequency, '{"times":4}'::jsonb,        0.60)
    ) as t(name, icon, color, ftype, fconfig, p)
  loop
    insert into public.habits (user_id, name, description, color, icon, frequency_type, frequency_config, start_date)
    values (v_user, r.name, '[seed]', r.color, r.icon, r.ftype, r.fconfig, v_start)
    returning id into v_habit;

    insert into public.habit_completions (user_id, habit_id, date)
    select v_user, v_habit, d::date
    from generate_series(v_start, v_today - 1, interval '1 day') as d
    where random() < r.p
      and case r.ftype
        when 'daily' then true
        when 'every_other_day' then ((d::date - v_start) % 2) = 0
        when 'weekly' then extract(isodow from d)::int in (3, 7)
        when 'monthly' then extract(day from d)::int = 1
        when 'weekly_flexible' then true
        else false
      end;
  end loop;

  raise notice 'Seed creado para % (hoy local: %)', v_email, v_today;
end
$$;
