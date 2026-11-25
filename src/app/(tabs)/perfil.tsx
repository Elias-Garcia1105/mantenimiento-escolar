import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton, FilaInfo, Insignia, Tarjeta, type IconName } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useReportes } from '@/context/reportes';
import { iniciales } from '@/lib/validacion';
import { DESCRIPCION_BACKEND, MODO_BACKEND } from '@/services/config';

function Opcion({ icono, titulo, descripcion, ruta, testID }: { icono: IconName; titulo: string; descripcion: string; ruta: Href; testID?: string }) {
  return (
    <Pressable onPress={() => router.push(ruta)} style={({ pressed }) => [styles.opcion, pressed && { opacity: 0.7 }]} testID={testID}>
      <View style={styles.opcionIcono}>
        <Ionicons name={icono} size={20} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={Type.bodyStrong}>{titulo}</Text>
        <Text style={Type.caption}>{descripcion}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textSubtle} />
    </Pressable>
  );
}

export default function PerfilScreen() {
  const { usuario, cerrarSesion } = useAuth();
  const { reportes } = useReportes();
  if (!usuario) return null;
  const esAdmin = usuario.rol === 'administrativo';
  const config = Constants.expoConfig;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.lg, paddingBottom: 48 }}>
        <Text style={Type.display}>Perfil</Text>

        <Tarjeta estilo={styles.cabecera}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTexto}>{iniciales(usuario.nombre)}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={Type.heading}>{usuario.nombre}</Text>
            <Text style={Type.caption}>{usuario.correo}</Text>
            <Insignia
              texto={esAdmin ? 'Personal administrativo' : 'Estudiante'}
              color={esAdmin ? Colors.warning : Colors.primary}
              fondo={esAdmin ? Colors.warningSoft : Colors.primarySoft}
              icono={esAdmin ? 'briefcase' : 'school'}
            />
          </View>
        </Tarjeta>

        <Tarjeta estilo={{ paddingVertical: 6 }}>
          <Opcion icono="shield-checkmark-outline" titulo="Permisos del dispositivo" descripcion="Cámara, fotografías y ubicación" ruta="/permisos" testID="opcion-permisos" />
          <View style={styles.separador} />
          <Opcion icono="pulse-outline" titulo="Diagnóstico" descripcion="Versión, modo de compilación y registros" ruta="/diagnostico" testID="opcion-diagnostico" />
        </Tarjeta>

        <Tarjeta estilo={{ paddingVertical: 4 }}>
          <FilaInfo icono="cloud-outline" etiqueta="Servicio de datos" valor={MODO_BACKEND === 'supabase' ? 'Supabase' : 'Demo local'} />
          <FilaInfo icono="albums-outline" etiqueta={esAdmin ? 'Reportes visibles' : 'Mis reportes'} valor={String(reportes.length)} />
          <FilaInfo icono="information-circle-outline" etiqueta="Versión" valor={`${config?.version} (${config?.android?.versionCode ?? 1})`} ultimo />
        </Tarjeta>
        <Text style={[Type.caption, { textAlign: 'center' }]}>{DESCRIPCION_BACKEND[MODO_BACKEND]}</Text>

        <Boton titulo="Cerrar sesión" variante="peligro" icono="log-out-outline" onPress={cerrarSesion} testID="btn-salir" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { fontFamily: Fonts.extrabold, fontSize: 22, color: Colors.ink },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  opcionIcono: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separador: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginLeft: 54 },
});
