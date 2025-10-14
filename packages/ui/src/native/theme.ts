import { useColorScheme } from 'react-native';

export type Theme = ReturnType<typeof getTheme>;

export function getTheme(mode: 'light' | 'dark') {
  const colors = mode === 'dark'
    ? {
        fgDefault: '#EDEAE6',
        fgMuted: '#BDB8B1',
        bgCanvas: '#0E0F10',
        bgSurface: '#14161A',
        border: '#2A2D32',
        brand: '#FFB86B',
        brandStrong: '#FF974D',
        danger: '#F87171',
        neutral: '#7A7F87',
      }
    : {
        fgDefault: '#1F2428',
        fgMuted: '#5B6166',
        bgCanvas: '#FFFFFF',
        bgSurface: '#FFFFFF',
        border: '#E7E5E4',
        brand: '#FF8A3D',
        brandStrong: '#FF6A00',
        danger: '#DC2626',
        neutral: '#667085',
      };

  const space = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24 } as const;
  const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;
  const type = {
    button: { size: 16, weight: '600' as const },
  };
  const state = {
    pressedOpacity: 0.85,
    disabledOpacity: 0.5,
    focusRingWidth: 2,
  };

  return { mode, colors, space, radius, type, state };
}

export function useTheme() {
  const mode = (useColorScheme() ?? 'light') as 'light' | 'dark';
  return getTheme(mode);
}


