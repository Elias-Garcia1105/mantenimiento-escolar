-- Pruebas de RLS: ejecutar después de stubs.sql, schema.sql y grants.sql en una base de datos local.
\set ON_ERROR_STOP 0
\pset pager off
insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111','estudiante@utvt.edu.mx'),('22222222-2222-2222-2222-222222222222','mantenimiento@utvt.edu.mx'),('33333333-3333-3333-3333-333333333333','otro@utvt.edu.mx');
update public.perfiles set nombre = 'Elías García'  where correo = 'estudiante@utvt.edu.mx';
update public.perfiles set nombre = 'Laura Méndez', rol = 'administrativo' where correo = 'mantenimiento@utvt.edu.mx';
select 'T1 perfiles creados por trigger' as prueba, count(*) from public.perfiles;

-- Estudiante
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.reportes (titulo, descripcion, categoria, prioridad, lugar, latitud, longitud, estado, creado_por)
values ('Fuga de agua en sanitarios','El lavabo izquierdo gotea constantemente.','plomeria','alta','Edificio D',19.33,-99.46,'resuelto','33333333-3333-3333-3333-333333333333')
returning 'T2 insert estudiante' as prueba, folio, estado, creado_por_nombre, creado_por = auth.uid() as autor_correcto;
select 'T3 titulo corto (debe fallar)' as prueba;
insert into public.reportes (titulo, descripcion, categoria, lugar) values ('Foco','Descripción suficiente aquí.','electrico','Aula 1');
reset role; set role authenticated; set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into public.reportes (titulo, descripcion, categoria, lugar) values ('Silla rota en aula','El respaldo está despegado.','mobiliario','Lab 3');
reset role; set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select 'T4 estudiante ve solo los suyos' as prueba, count(*) as visibles, bool_and(creado_por = auth.uid()) as todos_propios from public.reportes;
with u as (update public.reportes set estado = 'resuelto' returning 1) select 'T5 estudiante intenta cambiar estado' as prueba, count(*) as filas_actualizadas from u;
select 'T6 estudiante ve perfiles' as prueba, count(*) from public.perfiles;
insert into storage.objects (bucket_id, name) values ('evidencias','11111111-1111-1111-1111-111111111111/1.jpg') returning 'T7 sube foto en su carpeta' as prueba, name;
select 'T8 subir en carpeta ajena (debe fallar)' as prueba;
insert into storage.objects (bucket_id, name) values ('evidencias','33333333-3333-3333-3333-333333333333/x.jpg');

-- Administrativo
reset role; set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select 'T9 admin ve todos' as prueba, count(*) from public.reportes;
with u as (update public.reportes set estado = 'en_proceso', comentario_atencion = 'Programado para el jueves', creado_por = '22222222-2222-2222-2222-222222222222' where folio = 1 returning estado, creado_por_nombre, creado_por)
select 'T10 admin actualiza estado' as prueba, estado, creado_por_nombre, creado_por = '11111111-1111-1111-1111-111111111111' as autor_intacto from u;
select 'T11 admin ve fotos de todos' as prueba, count(*) from storage.objects;
reset role;
select 'T12 bucket' as prueba, id, public, file_size_limit from storage.buckets;
