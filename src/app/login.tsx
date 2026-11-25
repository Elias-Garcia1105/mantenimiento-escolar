import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Aviso, Boton, Campo } from '@/components/ui';
import { Colors, Fonts, Radius, Shadow, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { mensajeDeError } from '@/context/reportes';
import { tieneErrores, validarLogin } from '@/lib/validacion';
import { USUARIOS_DEMO } from '@/services/backend/demo-backend';
import { DESCRIPCION_BACKEND, MODO_BACKEND } from '@/services/config';

export default function LoginScreen() {
  const { iniciarSesion } = useAuth();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errores, setErrores] = useState<ReturnType<typeof validarLogin>>({});
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    setErrorServidor(null);
    const e = validarLogin(correo, contrasena);
    setErrores(e);
    if (tieneErrores(e)) return;

    setEnviando(true);
    try {
      await iniciarSesion(correo, contrasena);
    } catch (err) {
      setErrorServidor(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }

  function usarCuentaDemo(i: number) {
    const u = USUARIOS_DEMO[i]!;
    setCorreo(u.correo);
    setContrasena(u.contrasena);
    setErrores({});
    setErrorServidor(null);
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.primary }}>
      {/* Decoración del encabezado */}
      <View style={[styles.circulo, { width: 260, height: 260, top: -90, right: -80 }]} />
      <View style={[styles.circulo, { width: 140, height: 140, top: 120, left: -50, opacity: 0.08 }]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              <View style={styles.logo}>
                <Ionicons name="construct" size={30} color={Colors.primary} />
              </View>
              <Text style={styles.heroTitulo}>Mantenimiento{'\n'}Escolar</Text>
              <Text style={styles.heroSubtitulo}>Reporta desperfectos del campus y da seguimiento a su atención.</Text>
            </View>

            <View style={styles.panel}>
              <Text style={Type.title}>Iniciar sesión</Text>
              <Text style={[Type.caption, { fontSize: 13, marginTop: -6 }]}>Usa tu cuenta institucional para continuar.</Text>

              {errorServidor && <Aviso tipo="error" titulo="No fue posible ingresar" mensaje={errorServidor} testID="error-login" />}

              <Campo
                etiqueta="Correo institucional"
                icono="mail-outline"
                placeholder="usuario@utvt.edu.mx"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={correo}
                onChangeText={setCorreo}
                error={errores.correo}
                testID="input-correo"
                returnKeyType="next"
              />
              <Campo
                etiqueta="Contraseña"
                icono="lock-closed-outline"
                placeholder="••••••••"
                secreto
                autoComplete="password"
                value={contrasena}
                onChangeText={setContrasena}
                error={errores.contrasena}
                testID="input-contrasena"
                onSubmitEditing={enviar}
                returnKeyType="go"
              />

              <Boton titulo="Ingresar" icono="log-in-outline" onPress={enviar} cargando={enviando} testID="btn-ingresar" estilo={{ marginTop: 4 }} />

              {MODO_BACKEND === 'demo' && (
                <View style={styles.demo}>
                  <Text style={Type.overline}>Cuentas de prueba</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {USUARIOS_DEMO.map((u, i) => (
                      <Pressable key={u.id} style={styles.cuentaDemo} onPress={() => usarCuentaDemo(i)} testID={`demo-${u.rol}`}>
                        <Ionicons name={u.rol === 'estudiante' ? 'school-outline' : 'briefcase-outline'} size={16} color={Colors.primary} />
                        <Text style={styles.cuentaDemoTexto}>{u.rol === 'estudiante' ? 'Estudiante' : 'Administrativo'}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.pie}>
                <View style={[styles.puntoEstado, { backgroundColor: MODO_BACKEND === 'supabase' ? Colors.success : Colors.accent }]} />
                <Text style={Type.caption} testID="modo-backend">
                  {DESCRIPCION_BACKEND[MODO_BACKEND]} · v{Constants.expoConfig?.version}
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  circulo: { position: 'absolute', borderRadius: 999, backgroundColor: '#FFFFFF', opacity: 0.07 },
  hero: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxxl, gap: 12 },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    transform: [{ rotate: '6deg' }],
  },
  heroTitulo: { fontFamily: Fonts.extrabold, fontSize: 34, lineHeight: 38, color: '#fff', letterSpacing: -0.8 },
  heroSubtitulo: { fontFamily: Fonts.medium, fontSize: 15, lineHeight: 21, color: 'rgba(255,255,255,0.82)', maxWidth: 320 },
  panel: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: Spacing.xxl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
    ...Shadow.card,
  },
  demo: { gap: 8, paddingTop: 6 },
  cuentaDemo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primarySoft,
  },
  cuentaDemoTexto: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.primary },
  pie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 'auto', paddingTop: 8 },
  puntoEstado: { width: 7, height: 7, borderRadius: 4 },
});
