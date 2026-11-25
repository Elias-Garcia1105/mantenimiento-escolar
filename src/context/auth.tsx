import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { backend } from '@/services/backend';
import { log } from '@/services/logger';
import type { Usuario } from '@/types';

interface AuthContexto {
  usuario: Usuario | null;
  cargando: boolean;
  iniciarSesion: (correo: string, contrasena: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const Contexto = createContext<AuthContexto | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    backend
      .sesionActual()
      .then((u) => {
        setUsuario(u);
        log.info('auth', u ? `Sesión restaurada: ${u.correo}` : 'Sin sesión activa');
      })
      .catch((e) => log.error('auth', 'No se pudo restaurar la sesión', e))
      .finally(() => setCargando(false));
  }, []);

  const iniciarSesion = useCallback(async (correo: string, contrasena: string) => {
    log.info('auth', `Intento de inicio de sesión: ${correo.trim()}`);
    try {
      const u = await backend.iniciarSesion(correo, contrasena);
      setUsuario(u);
      log.info('auth', `Inicio de sesión correcto (${u.rol})`);
    } catch (e) {
      log.warn('auth', 'Inicio de sesión rechazado', e);
      throw e;
    }
  }, []);

  const cerrarSesion = useCallback(async () => {
    await backend.cerrarSesion();
    setUsuario(null);
    log.info('auth', 'Sesión cerrada');
  }, []);

  const valor = useMemo(
    () => ({ usuario, cargando, iniciarSesion, cerrarSesion }),
    [usuario, cargando, iniciarSesion, cerrarSesion],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
