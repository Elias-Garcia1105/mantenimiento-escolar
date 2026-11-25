import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Boton, FilaInfo, Seccion, Tarjeta } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, Type } from '@/constants/theme';
import { formatoFecha } from '@/lib/validacion';
import { MODO_BACKEND } from '@/services/config';
import { log, type EntradaLog } from '@/services/logger';

const COLOR_NIVEL = { info: Colors.info, warn: Colors.warning, error: Colors.danger } as const;

export default function DiagnosticoScreen() {
  const [entradas, setEntradas] = useState<EntradaLog[]>(log.obtener());
  useEffect(() => log.suscribir(() => setEntradas(log.obtener())), []);

  const config = Constants.expoConfig;
  const modo = __DEV__ ? 'Debug (desarrollo)' : 'Release (producción)';
  const plataforma =
    Platform.OS === 'android'
      ? `Android (API ${Platform.Version})`
      : Platform.OS === 'ios'
        ? `iOS ${Platform.Version}`
        : 'Web (navegador)';
  const identificador =
    Platform.OS === 'ios' ? config?.ios?.bundleIdentifier : (config?.android?.package ?? 'No aplica en web');

  return (
    <ScrollView contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.lg, paddingBottom: 48 }}>
      <Tarjeta estilo={{ paddingVertical: 4 }} testID="info-compilacion">
        <FilaInfo icono="hammer-outline" etiqueta="Modo de compilación" valor={modo} />
        <FilaInfo icono="pricetag-outline" etiqueta="Versión" valor={`${config?.version} (code ${config?.android?.versionCode ?? 1})`} />
        <FilaInfo icono="finger-print-outline" etiqueta={Platform.OS === 'ios' ? 'Bundle Identifier' : 'Application ID'} valor={identificador ?? '—'} />
        <FilaInfo icono="phone-portrait-outline" etiqueta="Plataforma" valor={plataforma} />
        <FilaInfo icono="cloud-outline" etiqueta="Servicio de datos" valor={MODO_BACKEND === 'supabase' ? 'Supabase' : 'Demo local'} ultimo />
      </Tarjeta>

      <Tarjeta>
        <Seccion
          titulo="Registro de eventos"
          subtitulo={`${entradas.length} entradas · etiqueta [MttoApp]`}
          icono="terminal-outline"
          derecha={<Boton titulo="Limpiar" variante="fantasma" compacto onPress={log.limpiar} />}
        />
        <View style={styles.consola} testID="consola">
          {entradas.length === 0 && <Text style={styles.linea}>Sin eventos registrados.</Text>}
          {entradas.slice(0, 40).map((e) => (
            <View key={e.id} style={styles.entrada}>
              <Text style={[styles.nivel, { color: COLOR_NIVEL[e.nivel] }]}>{e.nivel.toUpperCase()}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.linea}>
                  <Text style={{ color: '#9FB3AC' }}>{formatoFecha(e.fecha).split(', ')[1]} </Text>
                  <Text style={{ color: '#F2A93B' }}>[{e.modulo}] </Text>
                  {e.mensaje}
                </Text>
                {e.detalle ? <Text style={[styles.linea, { color: '#9FB3AC' }]}>{e.detalle}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      </Tarjeta>
      <Text style={[Type.caption, { textAlign: 'center' }]}>En Android, estos mensajes también aparecen en Logcat (filtro: ReactNativeJS).</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  consola: { backgroundColor: '#0F1A17', borderRadius: Radius.md, padding: 12, gap: 8 },
  entrada: { flexDirection: 'row', gap: 8 },
  nivel: { fontFamily: Fonts.mono, fontSize: 10.5, width: 38, fontWeight: '700' },
  linea: { fontFamily: Fonts.mono, fontSize: 11, lineHeight: 15, color: '#E7EFEA' },
});
