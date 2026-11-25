/**
 * Registro de eventos de la app.
 *
 * Cada mensaje se imprime en la consola con la etiqueta [MttoApp], por lo que puede
 * filtrarse en Logcat con:  adb logcat -s ReactNativeJS:V | grep MttoApp
 * Además se guarda un historial en memoria que se muestra en la pantalla "Diagnóstico".
 */
export type Nivel = 'info' | 'warn' | 'error';

export interface EntradaLog {
  id: number;
  nivel: Nivel;
  modulo: string;
  mensaje: string;
  detalle?: string;
  fecha: string;
}

const MAX_ENTRADAS = 150;
const entradas: EntradaLog[] = [];
const oyentes = new Set<() => void>();
let contador = 0;

function serializar(detalle: unknown): string | undefined {
  if (detalle === undefined) return undefined;
  if (detalle instanceof Error) return `${detalle.name}: ${detalle.message}`;
  try {
    return typeof detalle === 'string' ? detalle : JSON.stringify(detalle);
  } catch {
    return String(detalle);
  }
}

function registrar(nivel: Nivel, modulo: string, mensaje: string, detalle?: unknown) {
  const entrada: EntradaLog = {
    id: ++contador,
    nivel,
    modulo,
    mensaje,
    detalle: serializar(detalle),
    fecha: new Date().toISOString(),
  };
  entradas.unshift(entrada);
  if (entradas.length > MAX_ENTRADAS) entradas.pop();

  const linea = `[MttoApp][${nivel.toUpperCase()}][${modulo}] ${mensaje}${entrada.detalle ? ` | ${entrada.detalle}` : ''}`;
  if (nivel === 'error') console.error(linea);
  else if (nivel === 'warn') console.warn(linea);
  else console.log(linea);

  oyentes.forEach((fn) => fn());
}

export const log = {
  info: (modulo: string, mensaje: string, detalle?: unknown) => registrar('info', modulo, mensaje, detalle),
  warn: (modulo: string, mensaje: string, detalle?: unknown) => registrar('warn', modulo, mensaje, detalle),
  error: (modulo: string, mensaje: string, detalle?: unknown) => registrar('error', modulo, mensaje, detalle),
  obtener: () => [...entradas],
  limpiar: () => {
    entradas.length = 0;
    oyentes.forEach((fn) => fn());
  },
  suscribir: (fn: () => void) => {
    oyentes.add(fn);
    return () => {
      oyentes.delete(fn);
    };
  },
};
