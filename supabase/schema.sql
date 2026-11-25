-- =====================================================================
--  Sistema móvil de seguimiento de Reportes de Mantenimiento Escolar
--  Esquema de base de datos para Supabase (PostgreSQL + Auth + Storage)
--
--  Cómo usarlo: en el panel de Supabase abre "SQL Editor", pega todo
--  este archivo y presiona "Run". Puede ejecutarse más de una vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Perfiles de usuario (nombre y rol). Se crean automáticamente al
--    registrar un usuario en Authentication.
-- ---------------------------------------------------------------------
create table if not exists public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text not null default '',
  correo     text,
  rol        text not null default 'estudiante' check (rol in ('estudiante', 'administrativo')),
  creado_en  timestamptz not null default now()
);

create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, correo, nombre)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();

-- Devuelve true si el usuario autenticado es personal administrativo.
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'administrativo');
$$;

-- ---------------------------------------------------------------------
-- 2. Reportes de mantenimiento
-- ---------------------------------------------------------------------
create table if not exists public.reportes (
  id                     uuid primary key default gen_random_uuid(),
  folio                  bigint generated always as identity unique,
  titulo                 text not null check (char_length(titulo) between 5 and 80),
  descripcion            text not null check (char_length(descripcion) between 10 and 500),
  categoria              text not null check (categoria in ('electrico', 'plomeria', 'mobiliario', 'computo', 'infraestructura', 'limpieza', 'otro')),
  prioridad              text not null default 'media' check (prioridad in ('baja', 'media', 'alta')),
  lugar                  text not null check (char_length(lugar) between 1 and 60),
  latitud                double precision check (latitud between -90 and 90),
  longitud               double precision check (longitud between -180 and 180),
  precision_m            double precision,
  direccion              text,
  ubicacion_obtenida_en  timestamptz,
  foto_path              text,
  estado                 text not null default 'pendiente' check (estado in ('pendiente', 'en_proceso', 'resuelto')),
  comentario_atencion    text check (char_length(comentario_atencion) <= 300),
  creado_por             uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  creado_por_nombre      text,
  creado_en              timestamptz not null default now(),
  actualizado_en         timestamptz not null default now()
);

create index if not exists reportes_creado_por_idx on public.reportes (creado_por);
create index if not exists reportes_estado_idx on public.reportes (estado);

-- Al insertar: el autor siempre es el usuario autenticado y el estado inicia en "pendiente".
create or replace function public.preparar_reporte()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.creado_por := auth.uid();
    new.creado_por_nombre := (select nombre from public.perfiles where id = auth.uid());
    new.estado := 'pendiente';
    new.comentario_atencion := null;
  else
    -- En una actualización no se permite modificar autor, folio ni fecha de creación.
    new.creado_por := old.creado_por;
    new.creado_por_nombre := old.creado_por_nombre;
    new.creado_en := old.creado_en;
  end if;
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists antes_de_guardar_reporte on public.reportes;
create trigger antes_de_guardar_reporte
  before insert or update on public.reportes
  for each row execute function public.preparar_reporte();

-- ---------------------------------------------------------------------
-- 3. Seguridad a nivel de fila (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.perfiles enable row level security;
alter table public.reportes enable row level security;

drop policy if exists "Ver perfil propio o como admin" on public.perfiles;
create policy "Ver perfil propio o como admin" on public.perfiles
  for select to authenticated
  using (id = auth.uid() or public.es_admin());

drop policy if exists "Ver reportes propios o como admin" on public.reportes;
create policy "Ver reportes propios o como admin" on public.reportes
  for select to authenticated
  using (creado_por = auth.uid() or public.es_admin());

drop policy if exists "Crear reportes propios" on public.reportes;
create policy "Crear reportes propios" on public.reportes
  for insert to authenticated
  with check (creado_por = auth.uid());

drop policy if exists "Solo admin actualiza estado" on public.reportes;
create policy "Solo admin actualiza estado" on public.reportes
  for update to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- Permisos de acceso para los usuarios con sesión iniciada (las políticas RLS siguen filtrando las filas)
grant usage on schema public to anon, authenticated;
grant select on table public.perfiles to authenticated;
grant select, insert, update on table public.reportes to authenticated;
grant execute on function public.es_admin() to authenticated;

-- ---------------------------------------------------------------------
-- 4. Almacenamiento de fotografías (bucket privado, máx. 5 MB, solo imágenes)
--    Ruta de cada archivo: <id_usuario>/<marca_de_tiempo>.jpg
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidencias', 'evidencias', false, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

drop policy if exists "Subir evidencias propias" on storage.objects;
create policy "Subir evidencias propias" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evidencias' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Ver evidencias propias o como admin" on storage.objects;
create policy "Ver evidencias propias o como admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'evidencias' and ((storage.foldername(name))[1] = auth.uid()::text or public.es_admin()));

drop policy if exists "Borrar evidencias propias" on storage.objects;
create policy "Borrar evidencias propias" on storage.objects
  for delete to authenticated
  using (bucket_id = 'evidencias' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- 5. Usuarios de prueba
--    a) En Authentication > Users > "Add user" crea dos usuarios con
--       "Auto Confirm User" activado, por ejemplo:
--         estudiante@utvt.edu.mx   /  Estudiante123
--         mantenimiento@utvt.edu.mx / Admin123
--    b) Después ejecuta estas dos sentencias para asignar nombre y rol:
--
-- update public.perfiles set nombre = 'Elías García'  where correo = 'estudiante@utvt.edu.mx';
-- update public.perfiles set nombre = 'Laura Méndez', rol = 'administrativo' where correo = 'mantenimiento@utvt.edu.mx';
-- =====================================================================
