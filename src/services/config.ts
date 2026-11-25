/**
 * Configuración del servicio en la nube.
 *
 * Las variables EXPO_PUBLIC_* se leen del archivo .env en tiempo de compilación.
 * Si no están definidas, la app funciona en "modo demostración" con datos locales,
 * útil para revisar la interfaz sin un proyecto de Supabase.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

export type ModoBackend = 'supabase' | 'demo';

export const MODO_BACKEND: ModoBackend =
  SUPABASE_URL.startsWith('https://') && SUPABASE_KEY.length > 20 ? 'supabase' : 'demo';

export const BUCKET_EVIDENCIAS = 'evidencias';

export const DESCRIPCION_BACKEND: Record<ModoBackend, string> = {
  supabase: 'Supabase (Auth, PostgreSQL y Storage)',
  demo: 'Modo demostración (almacenamiento local)',
};
