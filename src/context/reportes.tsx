import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from './auth';
import { backend, ErrorApp } from '@/services/backend';
import { log } from '@/services/logger';
import type { EstadoReporte, NuevoReporte, Reporte, Usuario } from '@/types';

interface ReportesContexto {
  reportes: Reporte[];
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
  crear: (datos: NuevoReporte) => Promise<Reporte>;
  cambiarEstado: (id: string, estado: EstadoReporte, comentario: string | null) => Promise<Reporte>;
}

const Contexto = createContext<ReportesContexto | null>(null);

const mensaje = (e: unknown) => (e instanceof ErrorApp ? e.message : 'Ocurrió un error inesperado.');

/** Los datos se guardan junto con el id del usuario para no mostrar información de otra sesión. */
type Cache = { usuarioId: string; reportes: Reporte[]; error: string | null };

export function ReportesProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const [cache, setCache] = useState<Cache | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const consultar = useCallback(async (u: Usuario) => {
    try {
      const lista = await backend.listarReportes(u);
      setCache({ usuarioId: u.id, reportes: lista, error: null });
      log.info('reportes', `Reportes consultados: ${lista.length}`);
    } catch (e) {
      log.error('reportes', 'Error al consultar reportes', e);
      setCache((c) => ({ usuarioId: u.id, reportes: c?.usuarioId === u.id ? c.reportes : [], error: mensaje(e) }));
    }
  }, []);

  // Consulta inicial cada vez que cambia el usuario con sesión.
  useEffect(() => {
    if (usuario) consultar(usuario);
  }, [usuario, consultar]);

  const vigente = usuario && cache?.usuarioId === usuario.id ? cache : null;
  const reportes = useMemo(() => vigente?.reportes ?? [], [vigente]);
  const error = vigente?.error ?? null;
  const cargando = (!!usuario && !vigente) || refrescando;

  const recargar = useCallback(async () => {
    if (!usuario) return;
    setRefrescando(true);
    await consultar(usuario);
    setRefrescando(false);
  }, [usuario, consultar]);

  const crear = useCallback(
    async (datos: NuevoReporte) => {
      if (!usuario) throw new ErrorApp('La sesión expiró. Inicia sesión de nuevo.');
      log.info('reportes', 'Enviando nuevo reporte', { categoria: datos.categoria, prioridad: datos.prioridad });
      const nuevo = await backend.crearReporte(usuario, datos);
      setCache((c) => (c ? { ...c, reportes: [nuevo, ...c.reportes] } : c));
      log.info('reportes', `Reporte registrado con folio ${nuevo.folio}`);
      return nuevo;
    },
    [usuario],
  );

  const cambiarEstado = useCallback(async (id: string, estado: EstadoReporte, comentario: string | null) => {
    const actualizado = await backend.actualizarEstado(id, estado, comentario);
    setCache((c) => (c ? { ...c, reportes: c.reportes.map((r) => (r.id === id ? actualizado : r)) } : c));
    log.info('reportes', `Estado actualizado a "${estado}"`, { id });
    return actualizado;
  }, []);

  const valor = useMemo(
    () => ({ reportes, cargando, error, recargar, crear, cambiarEstado }),
    [reportes, cargando, error, recargar, crear, cambiarEstado],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useReportes() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useReportes debe usarse dentro de <ReportesProvider>');
  return ctx;
}

export { mensaje as mensajeDeError };
