/**
 * Sistema de diseño de la app: colores, tipografía, espaciado y sombras.
 * Todas las pantallas consumen estos valores para mantener un estilo uniforme.
 */
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const Colors = {
  ink: '#0F1A17',
  text: '#1B2723',
  textMuted: '#5E6B67',
  textSubtle: '#8A9692',
  background: '#F3F5F4',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAF9',
  border: '#E2E8E5',
  borderStrong: '#CBD5D1',

  primary: '#0B6E5A',
  primaryDark: '#08503F',
  primarySoft: '#E3F2EE',
  onPrimary: '#FFFFFF',

  accent: '#F2A93B',
  accentSoft: '#FDF1DC',

  danger: '#C93B3B',
  dangerSoft: '#FBEAEA',
  success: '#15803D',
  successSoft: '#E2F5E8',
  info: '#2563EB',
  infoSoft: '#E6EEFD',
  warning: '#B7791F',
  warningSoft: '#FDF3DE',
} as const;

export const Fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
} as const;

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;

export const Radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const;

export const Type: Record<'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'label' | 'caption' | 'overline', TextStyle> = {
  display: { fontFamily: Fonts.extrabold, fontSize: 28, lineHeight: 34, color: Colors.ink, letterSpacing: -0.5 },
  title: { fontFamily: Fonts.bold, fontSize: 22, lineHeight: 28, color: Colors.ink, letterSpacing: -0.3 },
  heading: { fontFamily: Fonts.bold, fontSize: 17, lineHeight: 22, color: Colors.ink },
  body: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 22, color: Colors.text },
  bodyStrong: { fontFamily: Fonts.semibold, fontSize: 15, lineHeight: 22, color: Colors.text },
  label: { fontFamily: Fonts.semibold, fontSize: 13, lineHeight: 18, color: Colors.text },
  caption: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16, color: Colors.textMuted },
  overline: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textSubtle,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
};

export const Shadow: Record<'card' | 'raised', ViewStyle> = {
  card: Platform.select<ViewStyle>({
    web: { boxShadow: '0 1px 2px rgba(15,26,23,0.06), 0 4px 14px rgba(15,26,23,0.05)' } as ViewStyle,
    default: {
      shadowColor: '#0F1A17',
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
  }),
  raised: Platform.select<ViewStyle>({
    web: { boxShadow: '0 8px 24px rgba(11,110,90,0.28)' } as ViewStyle,
    default: {
      shadowColor: '#0B6E5A',
      shadowOpacity: 0.28,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
  }),
};
