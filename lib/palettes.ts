export interface PaletteValues {
  primary: string
  primary_foreground: string
  secondary: string
  secondary_foreground: string
  accent: string
  accent_foreground: string
  dark_primary: string
  dark_primary_foreground: string
  dark_secondary: string
  dark_secondary_foreground: string
  dark_accent: string
  dark_accent_foreground: string
  theme_color_hex: string
}

export const PALETTE_PRESETS: Record<string, PaletteValues> = {
  red: {
    primary: '0 74% 43%',
    primary_foreground: '0 0% 100%',
    secondary: '0 30% 96%',
    secondary_foreground: '0 62% 22%',
    accent: '0 30% 96%',
    accent_foreground: '0 62% 22%',
    dark_primary: '0 72% 48%',
    dark_primary_foreground: '0 0% 100%',
    dark_secondary: '0 10% 18%',
    dark_secondary_foreground: '0 0% 92%',
    dark_accent: '0 10% 18%',
    dark_accent_foreground: '0 0% 92%',
    theme_color_hex: '#b72020',
  },
  blue: {
    primary: '221 83% 53%',
    primary_foreground: '210 40% 98%',
    secondary: '210 40% 96%',
    secondary_foreground: '222 47% 11%',
    accent: '210 40% 96%',
    accent_foreground: '222 47% 11%',
    dark_primary: '217 91% 60%',
    dark_primary_foreground: '222 47% 11%',
    dark_secondary: '217 10% 18%',
    dark_secondary_foreground: '210 40% 92%',
    dark_accent: '217 10% 18%',
    dark_accent_foreground: '210 40% 92%',
    theme_color_hex: '#2563eb',
  },
  green: {
    primary: '142 71% 35%',
    primary_foreground: '0 0% 100%',
    secondary: '140 30% 96%',
    secondary_foreground: '142 50% 15%',
    accent: '140 30% 96%',
    accent_foreground: '142 50% 15%',
    dark_primary: '142 71% 45%',
    dark_primary_foreground: '0 0% 100%',
    dark_secondary: '142 10% 18%',
    dark_secondary_foreground: '140 30% 92%',
    dark_accent: '142 10% 18%',
    dark_accent_foreground: '140 30% 92%',
    theme_color_hex: '#16a34a',
  },
  amber: {
    primary: '38 92% 40%',
    primary_foreground: '0 0% 100%',
    secondary: '38 40% 96%',
    secondary_foreground: '38 60% 15%',
    accent: '38 40% 96%',
    accent_foreground: '38 60% 15%',
    dark_primary: '38 92% 50%',
    dark_primary_foreground: '38 80% 10%',
    dark_secondary: '38 10% 18%',
    dark_secondary_foreground: '38 30% 92%',
    dark_accent: '38 10% 18%',
    dark_accent_foreground: '38 30% 92%',
    theme_color_hex: '#d97706',
  },
} as const
