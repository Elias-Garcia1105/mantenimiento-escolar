import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors, Fonts } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/auth';
import { ReportesProvider } from '@/context/reportes';
import { log } from '@/services/logger';

SplashScreen.preventAutoHideAsync();

const encabezado = {
  headerShown: true,
  headerStyle: { backgroundColor: Colors.background },
  headerShadowVisible: false,
  headerTintColor: Colors.ink,
  headerTitleStyle: { fontFamily: Fonts.bold, fontSize: 17 },
  headerBackTitle: 'Atrás',
} as const;

function Navegacion() {
  const { usuario, cargando } = useAuth();

  useEffect(() => {
    if (!cargando) SplashScreen.hideAsync();
  }, [cargando]);

  if (cargando) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      {/* Rutas protegidas: solo accesibles con sesión iniciada */}
      <Stack.Protected guard={!!usuario}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="reporte/[id]" options={{ ...encabezado, title: 'Detalle del reporte' }} />
        <Stack.Screen name="permisos" options={{ ...encabezado, title: 'Permisos del dispositivo' }} />
        <Stack.Screen name="diagnostico" options={{ ...encabezado, title: 'Diagnóstico' }} />
      </Stack.Protected>

      <Stack.Protected guard={!usuario}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fuentesListas, errorFuentes] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (errorFuentes) log.error('app', 'No se pudieron cargar las fuentes', errorFuentes);
  }, [errorFuentes]);

  if (!fuentesListas && !errorFuentes) return null;

  return (
    <AuthProvider>
      <ReportesProvider>
        <StatusBar style="dark" />
        <Navegacion />
      </ReportesProvider>
    </AuthProvider>
  );
}
