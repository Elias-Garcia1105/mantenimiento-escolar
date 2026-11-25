/** Componentes de dominio para mostrar reportes. */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Insignia, Tarjeta, type IconName } from './ui';
import { categoriaPorId, ESTADOS, formatoFolio, ORDEN_ESTADOS, prioridadPorId } from '@/constants/catalogos';
import { Colors, Fonts, Radius, Spacing, Type } from '@/constants/theme';
import { formatoFecha, tiempoRelativo } from '@/lib/validacion';
import type { EstadoReporte, Reporte } from '@/types';

export function InsigniaEstado({ estado }: { estado: EstadoReporte }) {
  const e = ESTADOS[estado];
  return <Insignia texto={e.etiqueta} color={e.color} fondo={e.fondo} />;
}

export function MiniaturaReporte({ reporte, tamano = 64 }: { reporte: Reporte; tamano?: number }) {
  const cat = categoriaPorId(reporte.categoria);
  if (reporte.fotoUrl) {
    return (
      <Image
        source={{ uri: reporte.fotoUrl }}
        style={{ width: tamano, height: tamano, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt }}
        contentFit="cover"
        transition={150}
      />
    );
  }
  return (
    <View style={[styles.miniatura, { width: tamano, height: tamano }]}>
      <Ionicons name={cat.icono} size={tamano * 0.42} color={Colors.primary} />
    </View>
  );
}

export function TarjetaReporte({ reporte, onPress }: { reporte: Reporte; onPress: () => void }) {
  const prioridad = prioridadPorId(reporte.prioridad);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" testID={`reporte-${reporte.folio}`}>
      {({ pressed }) => (
        <Tarjeta estilo={[styles.tarjeta, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}>
          <MiniaturaReporte reporte={reporte} />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.filaEntre}>
              <Text style={styles.folio}>{formatoFolio(reporte.folio)}</Text>
              <InsigniaEstado estado={reporte.estado} />
            </View>
            <Text style={[Type.bodyStrong, { color: Colors.ink }]} numberOfLines={1}>
              {reporte.titulo}
            </Text>
            <View style={styles.meta}>
              <Ionicons name="location-outline" size={13} color={Colors.textSubtle} />
              <Text style={[Type.caption, { flex: 1 }]} numberOfLines={1}>
                {reporte.lugar}
              </Text>
            </View>
            <View style={styles.meta}>
              <View style={[styles.puntoPrioridad, { backgroundColor: prioridad.color }]} />
              <Text style={Type.caption}>Prioridad {prioridad.etiqueta.toLowerCase()}</Text>
              <Text style={[Type.caption, { color: Colors.textSubtle }]}>· {tiempoRelativo(reporte.creadoEn)}</Text>
            </View>
          </View>
        </Tarjeta>
      )}
    </Pressable>
  );
}

export function LineaTiempo({ reporte }: { reporte: Reporte }) {
  const actual = ORDEN_ESTADOS.indexOf(reporte.estado);
  return (
    <View>
      {ORDEN_ESTADOS.map((estado, i) => {
        const e = ESTADOS[estado];
        const completado = i <= actual;
        const esActual = i === actual;
        const ultimo = i === ORDEN_ESTADOS.length - 1;
        const fecha = i === 0 ? reporte.creadoEn : esActual ? reporte.actualizadoEn : null;
        return (
          <View key={estado} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ alignItems: 'center' }}>
              <View
                style={[
                  styles.nodo,
                  completado && { backgroundColor: e.color, borderColor: e.color },
                  esActual && { shadowColor: e.color, shadowOpacity: 0.35, shadowRadius: 6 },
                ]}>
                <Ionicons name={completado ? 'checkmark' : e.icono} size={14} color={completado ? '#fff' : Colors.textSubtle} />
              </View>
              {!ultimo && <View style={[styles.conector, i < actual && { backgroundColor: ESTADOS[ORDEN_ESTADOS[i + 1]!].color }]} />}
            </View>
            <View style={{ flex: 1, paddingBottom: ultimo ? 0 : 18, paddingTop: 3 }}>
              <Text style={[Type.label, !completado && { color: Colors.textSubtle }]}>{e.etiqueta}</Text>
              <Text style={[Type.caption, !completado && { color: Colors.textSubtle }]}>
                {completado && fecha ? formatoFecha(fecha) : e.descripcion}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function EstadoVacio({ icono, titulo, mensaje }: { icono: IconName; titulo: string; mensaje: string }) {
  return (
    <View style={styles.vacio}>
      <View style={styles.vacioIcono}>
        <Ionicons name={icono} size={30} color={Colors.primary} />
      </View>
      <Text style={[Type.heading, { textAlign: 'center' }]}>{titulo}</Text>
      <Text style={[Type.caption, { textAlign: 'center', fontSize: 13, lineHeight: 19 }]}>{mensaje}</Text>
    </View>
  );
}

/** Representación gráfica de la coordenada (sin depender de un SDK de mapas). */
export function MiniMapa({ altura = 120 }: { altura?: number }) {
  return (
    <View style={[styles.mapa, { height: altura }]}>
      {Array.from({ length: 7 }).map((_, i) => (
        <View key={`h${i}`} style={[styles.lineaMapa, { top: (i + 1) * (altura / 8), left: 0, right: 0, height: 1 }]} />
      ))}
      {Array.from({ length: 12 }).map((_, i) => (
        <View key={`v${i}`} style={[styles.lineaMapa, { left: `${(i + 1) * 8}%`, top: 0, bottom: 0, width: 1 }]} />
      ))}
      <View style={[styles.calle, { top: altura * 0.55, left: -10, right: -10, height: 10, transform: [{ rotate: '-8deg' }] }]} />
      <View style={[styles.calle, { left: '62%', top: -10, bottom: -10, width: 9, transform: [{ rotate: '12deg' }] }]} />
      <View style={styles.halo} />
      <View style={styles.pin}>
        <Ionicons name="location" size={30} color={Colors.danger} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: { flexDirection: 'row', gap: 14, padding: 14, alignItems: 'center' },
  filaEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  folio: { fontFamily: Fonts.bold, fontSize: 12, color: Colors.textSubtle, letterSpacing: 0.6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  puntoPrioridad: { width: 7, height: 7, borderRadius: 4 },
  miniatura: {
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conector: { width: 2, flex: 1, backgroundColor: Colors.border, marginVertical: 2 },
  vacio: { alignItems: 'center', gap: 8, paddingVertical: Spacing.xxxl, paddingHorizontal: Spacing.xl },
  vacioIcono: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  mapa: {
    borderRadius: Radius.md,
    backgroundColor: '#E7EFEA',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineaMapa: { position: 'absolute', backgroundColor: '#D6E2DB' },
  calle: { position: 'absolute', backgroundColor: '#FFFFFF', opacity: 0.9 },
  halo: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(201,59,59,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,59,59,0.25)',
  },
  pin: { marginTop: -24 },
});
