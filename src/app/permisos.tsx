import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Aviso, Boton, Insignia, Tarjeta } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import {
  abrirConfiguracion,
  consultarTodos,
  ETIQUETA_ESTADO,
  galeriaSinPermiso,
  solicitarPermiso,
  TEXTO_PERMISO,
  type EstadoPermiso,
  type InfoPermiso,
} from '@/services/permisos';

const COLOR_ESTADO: Record<EstadoPermiso, { c: string; f: string }> = {
  concedido: { c: Colors.success, f: Colors.successSoft },
  limitado: { c: Colors.warning, f: Colors.warningSoft },
  denegado: { c: Colors.danger, f: Colors.dangerSoft },
  sin_solicitar: { c: Colors.textMuted, f: Colors.surfaceAlt },
  no_requerido: { c: Colors.info, f: Colors.infoSoft },
};

export default function PermisosScreen() {
  const [permisos, setPermisos] = useState<InfoPermiso[]>([]);

  const actualizar = useCallback(() => {
    consultarTodos().then(setPermisos);
  }, []);

  // Se vuelve a consultar al regresar a la pantalla o a la app (por ejemplo, desde Configuración).
  useFocusEffect(actualizar);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && actualizar());
    return () => sub.remove();
  }, [actualizar]);

  async function solicitar(p: InfoPermiso) {
    await solicitarPermiso(p.tipo);
    actualizar();
  }

  return (
    <ScrollView contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.lg, paddingBottom: 48 }}>
      <Text style={[Type.body, { color: Colors.textMuted }]}>
        Estado actual de los permisos que la app necesita. Puedes otorgarlos aquí o cambiarlos en la configuración del sistema.
      </Text>

      {permisos.map((p) => {
        const t = TEXTO_PERMISO[p.tipo];
        const col = COLOR_ESTADO[p.estado];
        const irAConfig = p.estado === 'denegado' && !p.puedePreguntar;
        return (
          <Tarjeta key={p.tipo} estilo={{ gap: 12 }} testID={`permiso-${p.tipo}`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.icono}>
                <Ionicons name={t.icono} size={22} color={Colors.primary} />
              </View>
              <Text style={[Type.heading, { flex: 1 }]}>{t.titulo}</Text>
              <Insignia texto={ETIQUETA_ESTADO[p.estado]} color={col.c} fondo={col.f} />
            </View>
            <Text style={[Type.caption, { fontSize: 13, lineHeight: 19 }]}>
              {p.tipo === 'galeria' && galeriaSinPermiso
                ? 'Android 13 o superior usa el selector de fotos del sistema: la app solo recibe la imagen que eliges, sin acceso a toda la galería.'
                : t.uso}
            </Text>
            {(p.estado === 'sin_solicitar' || (p.estado === 'denegado' && p.puedePreguntar)) && (
              <Boton titulo="Solicitar permiso" compacto variante="secundario" icono="hand-left-outline" onPress={() => solicitar(p)} />
            )}
            {irAConfig && Platform.OS !== 'web' && (
              <Boton titulo="Abrir configuración" compacto variante="secundario" icono="settings-outline" onPress={abrirConfiguracion} />
            )}
          </Tarjeta>
        );
      })}

      <Aviso
        tipo="info"
        titulo="Tu privacidad"
        mensaje="La app no accede a la cámara ni al GPS en segundo plano. La foto y las coordenadas solo se envían al registrar un reporte y únicamente las puede ver el personal de mantenimiento."
      />
      {Platform.OS !== 'web' && (
        <Boton titulo="Abrir configuración de la app" variante="fantasma" icono="open-outline" onPress={abrirConfiguracion} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  icono: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
