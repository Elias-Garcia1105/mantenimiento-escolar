import { MODO_BACKEND } from '../config';
import { log } from '../logger';
import { crearDemoBackend } from './demo-backend';
import { crearSupabaseBackend } from './supabase-backend';
import type { Backend } from './tipos';

export { ErrorApp } from './tipos';
export type { Backend } from './tipos';

/** Instancia única del backend según la configuración del archivo .env */
export const backend: Backend = MODO_BACKEND === 'supabase' ? crearSupabaseBackend() : crearDemoBackend();

log.info('backend', `Servicio de datos inicializado en modo: ${MODO_BACKEND}`);
