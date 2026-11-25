import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EstadoVacio, TarjetaReporte } from '@/components/reportes';
import { Aviso, Boton, Chip } from '@/components/ui';
import { ESTADOS, ORDEN_ESTADOS } from '@/constants/catalogos';
import { Colors, Fonts, Radius, Shadow, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useReportes } from '@/context/reportes';
import { iniciales } from '@/lib/validacion';
import type { EstadoReporte } from '@/types';

function saludo() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function ReportesScreen() {
  const { usuario } = useAuth();
  const { reportes, cargando, error, recargar } = useReportes();
  const [filtro, setFiltro] = useState<EstadoReporte | 'todos'>('todos');
  const esAdmin = usuario?.rol === 'administrativo';

  const conteo = useMemo(() => {
    const c: Record<EstadoReporte, number> = { pendiente: 0, en_proceso: 0, resuelto: 0 };
    reportes.forEach((r) => c[r.estado]++);
    return c;
  }, [reportes]);

  const visibles = filtro === 'todos' ? reportes : reportes.filter((r) => r.estado === filtro);
  const activos = conteo.pendiente + conteo.en_proceso;

  const encabezado = (
    <View style={{ gap: Spacing.xl, paddingBottom: Spacing.md }}>
      <View style={styles.saludo}>
        <View style={{ flex: 1 }}>
          <Text style={Type.caption}>{saludo()},</Text>
          <Text style={Type.display} numberOfLines={1}>
            {usuario?.nombre.split(' ')[0]}
          </Text>
        </View>
        <Pressable style={styles.avatar} onPress={() => router.push('/perfil')} accessibilityLabel="Ir al perfil">
          <Text style={styles.avatarTexto}>{iniciales(usuario?.nombre ?? '')}</Text>
        </Pressable>
      </View>

      <View style={styles.resumen}>
        <View style={styles.resumenDecoracion} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name={esAdmin ? 'briefcase' : 'school'} size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.resumenRol}>{esAdmin ? 'Panel de mantenimiento' : 'Mis reportes'}</Text>
        </View>
        <Text style={styles.resumenTitulo} testID="resumen-activos">
          {activos === 0
            ? 'Sin reportes activos'
            : `${activos} ${activos === 1 ? 'reporte activo' : 'reportes activos'}`}
        </Text>
        <View style={styles.resumenFila}>
          {ORDEN_ESTADOS.map((e) => (
            <View key={e} style={styles.resumenDato}>
              <Text style={styles.resumenNumero}>{conteo[e]}</Text>
              <Text style={styles.resumenEtiqueta}>{ESTADOS[e].etiqueta}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: Spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={Type.heading}>{esAdmin ? 'Todos los reportes' : 'Historial'}</Text>
          <Text style={Type.caption}>{visibles.length} resultados</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip etiqueta={`Todos · ${reportes.length}`} activo={filtro === 'todos'} onPress={() => setFiltro('todos')} />
          {ORDEN_ESTADOS.map((e) => (
            <Chip
              key={e}
              etiqueta={ESTADOS[e].etiqueta}
              activo={filtro === e}
              color={ESTADOS[e].color}
              onPress={() => setFiltro(e)}
              testID={`filtro-${e}`}
            />
          ))}
        </ScrollView>
      </View>

      {error && (
        <Aviso
          tipo="error"
          titulo="No se pudieron cargar los reportes"
          mensaje={error}
          accion={<Boton titulo="Reintentar" compacto variante="secundario" icono="refresh" onPress={recargar} />}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <FlatList
        data={visibles}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={encabezado}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => <TarjetaReporte reporte={item} onPress={() => router.push(`/reporte/${item.id}`)} />}
        refreshControl={<RefreshControl refreshing={cargando && reportes.length > 0} onRefresh={recargar} tintColor={Colors.primary} />}
        ListEmptyComponent={
          cargando ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <EstadoVacio
              icono="file-tray-outline"
              titulo={filtro === 'todos' ? 'Aún no hay reportes' : `Sin reportes "${ESTADOS[filtro].etiqueta.toLowerCase()}"`}
              mensaje={
                filtro === 'todos'
                  ? 'Cuando registres un reporte de mantenimiento aparecerá aquí con su estado.'
                  : 'Prueba con otro filtro para ver más reportes.'
              }
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  lista: { padding: Spacing.xl, paddingBottom: 40 },
  saludo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { fontFamily: Fonts.extrabold, fontSize: 16, color: Colors.ink },
  resumen: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: 6,
    overflow: 'hidden',
    ...Shadow.raised,
  },
  resumenDecoracion: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -50,
    top: -70,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  resumenRol: { fontFamily: Fonts.semibold, fontSize: 12.5, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.3 },
  resumenTitulo: { fontFamily: Fonts.extrabold, fontSize: 22, color: '#fff', letterSpacing: -0.3 },
  resumenFila: { flexDirection: 'row', gap: 8, marginTop: 10 },
  resumenDato: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  resumenNumero: { fontFamily: Fonts.extrabold, fontSize: 22, color: '#fff' },
  resumenEtiqueta: { fontFamily: Fonts.medium, fontSize: 11.5, color: 'rgba(255,255,255,0.8)' },
});
