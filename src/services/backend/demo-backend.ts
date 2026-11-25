/**
 * Implementación local (modo demostración).
 * Guarda sesión y reportes en AsyncStorage y simula la latencia de red,
 * de modo que la app se pueda probar completa sin credenciales de la nube.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ErrorApp, type Backend } from './tipos';
import { log } from '../logger';
import type { EstadoReporte, Reporte, Usuario } from '@/types';

const CLAVE_SESION = 'mtto.demo.sesion';
const CLAVE_REPORTES = 'mtto.demo.reportes';

export const USUARIOS_DEMO: (Usuario & { contrasena: string })[] = [
  {
    id: 'u-estudiante',
    correo: 'estudiante@utvt.edu.mx',
    contrasena: 'Estudiante123',
    nombre: 'Elías García',
    rol: 'estudiante',
  },
  {
    id: 'u-admin',
    correo: 'mantenimiento@utvt.edu.mx',
    contrasena: 'Admin123',
    nombre: 'Laura Méndez',
    rol: 'administrativo',
  },
];

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const diasAtras = (d: number, h = 0) => new Date(Date.now() - d * 86400000 - h * 3600000).toISOString();

function reportesIniciales(): Reporte[] {
  const base = { latitud: 19.32935, longitud: -99.46612 };
  return [
    {
      id: 'r-3',
      folio: 3,
      titulo: 'Fuga de agua en lavabo de sanitarios',
      descripcion: 'El lavabo del lado izquierdo tiene una fuga constante en la llave y el piso se mantiene mojado.',
      categoria: 'plomeria',
      prioridad: 'alta',
      lugar: 'Edificio D, planta baja',
      ubicacion: { latitud: base.latitud + 0.0004, longitud: base.longitud - 0.0002, precision: 12, direccion: null, obtenidaEn: diasAtras(1, 3) },
      fotoUrl: null,
      estado: 'en_proceso',
      comentarioAtencion: 'Se solicitó la refacción de la llave. Se atenderá esta semana.',
      creadoPor: 'u-estudiante',
      creadoPorNombre: 'Elías García',
      creadoEn: diasAtras(1, 3),
      actualizadoEn: diasAtras(0, 5),
    },
    {
      id: 'r-2',
      folio: 2,
      titulo: 'Lámpara fundida en aula 12',
      descripcion: 'Dos lámparas del fondo del salón no encienden; en la tarde casi no hay iluminación.',
      categoria: 'electrico',
      prioridad: 'media',
      lugar: 'Edificio B, aula 12',
      ubicacion: { latitud: base.latitud - 0.0003, longitud: base.longitud + 0.0005, precision: 9, direccion: null, obtenidaEn: diasAtras(4) },
      fotoUrl: null,
      estado: 'resuelto',
      comentarioAtencion: 'Se reemplazaron ambas lámparas por luminarias LED.',
      creadoPor: 'u-estudiante',
      creadoPorNombre: 'Elías García',
      creadoEn: diasAtras(4),
      actualizadoEn: diasAtras(2),
    },
    {
      id: 'r-1',
      folio: 1,
      titulo: 'Silla con respaldo roto',
      descripcion: 'La silla de la mesa 4 del laboratorio tiene el respaldo despegado y puede causar un accidente.',
      categoria: 'mobiliario',
      prioridad: 'baja',
      lugar: 'Laboratorio de cómputo 3',
      ubicacion: { latitud: base.latitud + 0.0001, longitud: base.longitud + 0.0001, precision: 15, direccion: null, obtenidaEn: diasAtras(6) },
      fotoUrl: null,
      estado: 'pendiente',
      comentarioAtencion: null,
      creadoPor: 'u-otro',
      creadoPorNombre: 'Andrea Ruiz',
      creadoEn: diasAtras(6),
      actualizadoEn: diasAtras(6),
    },
  ];
}

async function leerReportes(): Promise<Reporte[]> {
  const crudo = await AsyncStorage.getItem(CLAVE_REPORTES);
  if (!crudo) {
    const iniciales = reportesIniciales();
    await AsyncStorage.setItem(CLAVE_REPORTES, JSON.stringify(iniciales));
    return iniciales;
  }
  return JSON.parse(crudo) as Reporte[];
}

async function guardarReportes(reportes: Reporte[]) {
  try {
    await AsyncStorage.setItem(CLAVE_REPORTES, JSON.stringify(reportes));
  } catch (e) {
    log.error('demo', 'No se pudo guardar en el almacenamiento local', e);
    throw new ErrorApp('El almacenamiento local está lleno. Elimina datos de la app e inténtalo de nuevo.');
  }
}

export function crearDemoBackend(latenciaMs = 450): Backend {
  return {
    async iniciarSesion(correo, contrasena) {
      await esperar(latenciaMs);
      const usuario = USUARIOS_DEMO.find(
        (u) => u.correo.toLowerCase() === correo.trim().toLowerCase() && u.contrasena === contrasena,
      );
      if (!usuario) throw new ErrorApp('Correo o contraseña incorrectos.', 'credenciales');
      const { contrasena: _omitida, ...publico } = usuario;
      await AsyncStorage.setItem(CLAVE_SESION, JSON.stringify(publico));
      return publico;
    },

    async cerrarSesion() {
      await AsyncStorage.removeItem(CLAVE_SESION);
    },

    async sesionActual() {
      const crudo = await AsyncStorage.getItem(CLAVE_SESION);
      return crudo ? (JSON.parse(crudo) as Usuario) : null;
    },

    async listarReportes(usuario) {
      await esperar(latenciaMs);
      const todos = await leerReportes();
      const visibles = usuario.rol === 'administrativo' ? todos : todos.filter((r) => r.creadoPor === usuario.id);
      return visibles.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
    },

    async obtenerReporte(id) {
      await esperar(latenciaMs / 2);
      const todos = await leerReportes();
      return todos.find((r) => r.id === id) ?? null;
    },

    async crearReporte(usuario, datos) {
      await esperar(latenciaMs * 2);
      const todos = await leerReportes();
      const folio = todos.reduce((max, r) => Math.max(max, r.folio), 0) + 1;
      const ahora = new Date().toISOString();
      const fotoUrl = datos.foto
        ? datos.foto.base64
          ? `data:image/jpeg;base64,${datos.foto.base64}`
          : datos.foto.uri
        : null;

      const nuevo: Reporte = {
        id: `r-${Date.now()}`,
        folio,
        titulo: datos.titulo.trim(),
        descripcion: datos.descripcion.trim(),
        categoria: datos.categoria ?? 'otro',
        prioridad: datos.prioridad,
        lugar: datos.lugar.trim(),
        ubicacion: datos.ubicacion,
        fotoUrl,
        estado: 'pendiente',
        comentarioAtencion: null,
        creadoPor: usuario.id,
        creadoPorNombre: usuario.nombre,
        creadoEn: ahora,
        actualizadoEn: ahora,
      };
      await guardarReportes([nuevo, ...todos]);
      return nuevo;
    },

    async actualizarEstado(id: string, estado: EstadoReporte, comentario: string | null) {
      await esperar(latenciaMs);
      const todos = await leerReportes();
      const i = todos.findIndex((r) => r.id === id);
      if (i < 0) throw new ErrorApp('El reporte ya no existe.');
      todos[i] = { ...todos[i]!, estado, comentarioAtencion: comentario, actualizadoEn: new Date().toISOString() };
      await guardarReportes(todos);
      return todos[i]!;
    },
  };
}
