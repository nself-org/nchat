export interface ThemeColors {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  surfaceColor: string
  textColor: string
  mutedColor: string
  borderColor: string
  buttonPrimaryBg: string
  buttonPrimaryText: string
  buttonSecondaryBg: string
  buttonSecondaryText: string
  successColor: string
  warningColor: string
  errorColor: string
  infoColor: string
}

export interface ThemePreset {
  name: string
  preset: string
  light: ThemeColors
  dark: ThemeColors
}

export const themePresets: Record<string, ThemePreset> = {
  // NSELF - Protocol theme with nself's glowing blues (#00D4FF, #0EA5E9)
  nself: {
    name: 'nself (Default)',
    preset: 'nself',
    light: {
      primaryColor: '#00D4FF', // nself signature cyan (glowing blue)
      secondaryColor: '#0EA5E9', // nself secondary blue
      accentColor: '#38BDF8', // light accent blue
      backgroundColor: '#FFFFFF', // Protocol white bg
      surfaceColor: '#F4F4F5', // zinc-100 (Protocol surface)
      textColor: '#18181B', // zinc-900 (Protocol text)
      mutedColor: '#71717A', // zinc-500 (Protocol muted)
      borderColor: '#18181B1A', // zinc-900/10 (Protocol borders)
      buttonPrimaryBg: '#18181B', // zinc-900 (Protocol primary button)
      buttonPrimaryText: '#FFFFFF', // white (Protocol button text)
      buttonSecondaryBg: '#F4F4F5', // zinc-100 (Protocol secondary)
      buttonSecondaryText: '#18181B', // zinc-900 (Protocol secondary text)
      successColor: '#10B981', // emerald-500
      warningColor: '#F59E0B', // amber-500
      errorColor: '#EF4444', // red-500
      infoColor: '#00D4FF', // nself cyan
    },
    dark: {
      primaryColor: '#00D4FF', // nself glowing cyan (bright in dark)
      secondaryColor: '#0EA5E9', // nself blue
      accentColor: '#38BDF8', // light blue accent
      backgroundColor: '#18181B', // zinc-900 (Protocol dark bg)
      surfaceColor: '#27272A', // zinc-800 (Protocol dark surface)
      textColor: '#F4F4F5', // zinc-100 (Protocol dark text)
      mutedColor: '#A1A1AA', // zinc-400 (Protocol dark muted)
      borderColor: '#FFFFFF1A', // white/10 (Protocol dark borders)
      buttonPrimaryBg: '#00D4FF', // nself cyan (Protocol accent style)
      buttonPrimaryText: '#18181B', // zinc-900 (dark contrast text)
      buttonSecondaryBg: '#3F3F461A', // zinc-800/40 (Protocol dark secondary bg)
      buttonSecondaryText: '#A1A1AA', // zinc-400 (Protocol dark secondary text)
      successColor: '#34D399', // emerald-400 (brighter for dark)
      warningColor: '#FBBF24', // amber-400 (brighter for dark)
      errorColor: '#F87171', // red-400 (brighter for dark)
      infoColor: '#00D4FF', // nself cyan
    },
  },

  // SLACK - Exact match to Slack's 2024 design system
  slack: {
    name: 'Slack',
    preset: 'slack',
    light: {
      primaryColor: '#4A154B', // Slack aubergine (deep purple)
      secondaryColor: '#350D36', // Darker aubergine
      accentColor: '#007A5A', // Slack green (teal-green)
      backgroundColor: '#FFFFFF',
      surfaceColor: '#F4EDE4', // Slack's actual warm off-white
      textColor: '#1D1C1D', // Slack black
      mutedColor: '#696969', // Slack muted gray
      borderColor: '#DDDDDC', // Slack's subtle warm border
      buttonPrimaryBg: '#007A5A', // Green primary button (Slack's CTA)
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#FFFFFF',
      buttonSecondaryText: '#4A154B',
      successColor: '#007A5A', // Slack green
      warningColor: '#ECB22E', // Slack yellow
      errorColor: '#CC2E45', // Slack red (less pink)
      infoColor: '#1164A3', // Slack blue
    },
    dark: {
      primaryColor: '#D1B3D3', // Light purple for dark mode (readable)
      secondaryColor: '#9B6B9E', // Medium purple for contrast
      accentColor: '#2BAC76', // Brighter green for dark mode
      backgroundColor: '#1A1D21', // Slack dark bg (actual)
      surfaceColor: '#222529', // Slack dark surface
      textColor: '#E8E8E8', // Slack light text (brighter)
      mutedColor: '#BCBCBC', // Lighter muted for dark
      borderColor: '#35383C', // Slack dark border
      buttonPrimaryBg: '#2BAC76', // Brighter green in dark
      buttonPrimaryText: '#1A1D21', // Dark text on green button
      buttonSecondaryBg: '#4A4D52',
      buttonSecondaryText: '#E8E8E8',
      successColor: '#2BAC76', // Brighter green for dark
      warningColor: '#FCB400', // Brighter yellow for dark
      errorColor: '#E96379', // Lighter red for dark mode
      infoColor: '#36C5F0', // Brighter blue for dark
    },
  },

  // DISCORD - Based on Discord's current design
  discord: {
    name: 'Discord',
    preset: 'discord',
    light: {
      primaryColor: '#5865F2', // Discord blurple
      secondaryColor: '#4752C4',
      accentColor: '#EB459E', // Discord pink accent
      backgroundColor: '#FFFFFF',
      surfaceColor: '#F2F3F5',
      textColor: '#2E3338', // Discord dark gray
      mutedColor: '#747F8D', // Discord muted
      borderColor: '#E3E5E8',
      buttonPrimaryBg: '#5865F2',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#E3E5E8',
      buttonSecondaryText: '#2E3338',
      successColor: '#3BA55D', // Discord green
      warningColor: '#FAA81A', // Discord yellow
      errorColor: '#ED4245', // Discord red
      infoColor: '#5865F2',
    },
    dark: {
      primaryColor: '#5865F2', // Discord blurple
      secondaryColor: '#4752C4',
      accentColor: '#EB459E', // Discord pink
      backgroundColor: '#202225', // Discord dark bg
      surfaceColor: '#2F3136', // Discord surface
      textColor: '#DCDDDE', // Discord text
      mutedColor: '#72767D', // Discord muted
      borderColor: '#202225',
      buttonPrimaryBg: '#5865F2',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#4F545C', // Discord button gray
      buttonSecondaryText: '#FFFFFF',
      successColor: '#3BA55D',
      warningColor: '#FAA81A',
      errorColor: '#ED4245',
      infoColor: '#5865F2',
    },
  },

  // OCEAN - Deep ocean blues and teals
  ocean: {
    name: 'Ocean',
    preset: 'ocean',
    light: {
      primaryColor: '#0891B2', // Cyan-600
      secondaryColor: '#06B6D4', // Cyan-500
      accentColor: '#14B8A6', // Teal-500
      backgroundColor: '#FFFFFF',
      surfaceColor: '#F0FDFA', // Cyan-50
      textColor: '#083344', // Very dark cyan
      mutedColor: '#67E8F9', // Cyan-300
      borderColor: '#A5F3FC', // Cyan-200
      buttonPrimaryBg: '#0891B2',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#CCFBF1', // Teal-100
      buttonSecondaryText: '#083344',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#0891B2',
    },
    dark: {
      primaryColor: '#22D3EE', // Cyan-400 (brighter for dark)
      secondaryColor: '#06B6D4', // Cyan-500
      accentColor: '#14B8A6', // Teal-500
      backgroundColor: '#0C1826', // Deep ocean dark
      surfaceColor: '#1A2E42', // Ocean depths
      textColor: '#CFFAFE', // Cyan-100
      mutedColor: '#67E8F9', // Cyan-300
      borderColor: '#2E5173', // Ocean border
      buttonPrimaryBg: '#22D3EE',
      buttonPrimaryText: '#0C1826',
      buttonSecondaryBg: '#2E5173',
      buttonSecondaryText: '#CFFAFE',
      successColor: '#34D399',
      warningColor: '#FBBF24',
      errorColor: '#F87171',
      infoColor: '#22D3EE',
    },
  },

  // SUNSET - Warm oranges, reds, and purples
  sunset: {
    name: 'Sunset',
    preset: 'sunset',
    light: {
      primaryColor: '#F97316', // Orange-500
      secondaryColor: '#FB923C', // Orange-400
      accentColor: '#DC2626', // Red-600
      backgroundColor: '#FFFFFF',
      surfaceColor: '#FFF7ED', // Orange-50
      textColor: '#431407', // Very dark orange
      mutedColor: '#FB923C', // Orange-400
      borderColor: '#FED7AA', // Orange-200
      buttonPrimaryBg: '#F97316',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#FFEDD5', // Orange-100
      buttonSecondaryText: '#431407',
      successColor: '#16A34A',
      warningColor: '#FACC15',
      errorColor: '#DC2626',
      infoColor: '#2563EB',
    },
    dark: {
      primaryColor: '#FB923C', // Orange-400 (brighter)
      secondaryColor: '#F97316', // Orange-500
      accentColor: '#EF4444', // Red-500
      backgroundColor: '#1F0E08', // Very dark warm
      surfaceColor: '#3A1F14', // Dark brown-orange
      textColor: '#FFF7ED', // Orange-50
      mutedColor: '#FDBA74', // Orange-300
      borderColor: '#5C2E1F', // Warm border
      buttonPrimaryBg: '#FB923C',
      buttonPrimaryText: '#1F0E08',
      buttonSecondaryBg: '#5C2E1F',
      buttonSecondaryText: '#FFF7ED',
      successColor: '#4ADE80',
      warningColor: '#FACC15',
      errorColor: '#F87171',
      infoColor: '#60A5FA',
    },
  },

  // MIDNIGHT - Deep purples and indigos
  midnight: {
    name: 'Midnight',
    preset: 'midnight',
    light: {
      primaryColor: '#6366F1', // Indigo-500
      secondaryColor: '#4F46E5', // Indigo-600
      accentColor: '#8B5CF6', // Violet-500
      backgroundColor: '#FFFFFF',
      surfaceColor: '#F5F3FF', // Violet-50
      textColor: '#1E1B4B', // Indigo-950
      mutedColor: '#A5B4FC', // Indigo-300
      borderColor: '#C7D2FE', // Indigo-200
      buttonPrimaryBg: '#6366F1',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#E0E7FF', // Indigo-100
      buttonSecondaryText: '#1E1B4B',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#6366F1',
    },
    dark: {
      primaryColor: '#818CF8', // Indigo-400 (brighter)
      secondaryColor: '#6366F1', // Indigo-500
      accentColor: '#A78BFA', // Violet-400
      backgroundColor: '#0F0F23', // Deep midnight blue
      surfaceColor: '#1E1E3A', // Dark indigo
      textColor: '#E0E7FF', // Indigo-100
      mutedColor: '#A5B4FC', // Indigo-300
      borderColor: '#2E2E5C', // Midnight border
      buttonPrimaryBg: '#818CF8',
      buttonPrimaryText: '#0F0F23',
      buttonSecondaryBg: '#2E2E5C',
      buttonSecondaryText: '#E0E7FF',
      successColor: '#34D399',
      warningColor: '#FBBF24',
      errorColor: '#F87171',
      infoColor: '#818CF8',
    },
  },

  // Tailwind Color Palettes
  slate: {
    name: 'Slate',
    preset: 'slate',
    light: {
      primaryColor: '#64748B',
      secondaryColor: '#475569',
      accentColor: '#334155',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#F8FAFC',
      textColor: '#0F0F1A',
      mutedColor: '#94A3B8',
      borderColor: '#E2E8F0',
      buttonPrimaryBg: '#475569',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#F1F5F9',
      buttonSecondaryText: '#334155',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
    dark: {
      primaryColor: '#64748B',
      secondaryColor: '#475569',
      accentColor: '#334155',
      backgroundColor: '#0F0F1A',
      surfaceColor: '#1E293B',
      textColor: '#F8FAFC',
      mutedColor: '#94A3B8',
      borderColor: '#334155',
      buttonPrimaryBg: '#64748B',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#334155',
      buttonSecondaryText: '#F8FAFC',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
  },
  gray: {
    name: 'Gray',
    preset: 'gray',
    light: {
      primaryColor: '#6B7280',
      secondaryColor: '#4B5563',
      accentColor: '#374151',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#F9FAFB',
      textColor: '#111827',
      mutedColor: '#9CA3AF',
      borderColor: '#E5E7EB',
      buttonPrimaryBg: '#4B5563',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#F3F4F6',
      buttonSecondaryText: '#374151',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
    dark: {
      primaryColor: '#6B7280',
      secondaryColor: '#4B5563',
      accentColor: '#374151',
      backgroundColor: '#111827',
      surfaceColor: '#1F2937',
      textColor: '#F9FAFB',
      mutedColor: '#9CA3AF',
      borderColor: '#374151',
      buttonPrimaryBg: '#6B7280',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#374151',
      buttonSecondaryText: '#F9FAFB',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
  },
  zinc: {
    name: 'Zinc',
    preset: 'zinc',
    light: {
      primaryColor: '#71717A',
      secondaryColor: '#52525B',
      accentColor: '#3F3F46',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#FAFAFA',
      textColor: '#18181B',
      mutedColor: '#A1A1AA',
      borderColor: '#E4E4E7',
      buttonPrimaryBg: '#52525B',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#F4F4F5',
      buttonSecondaryText: '#3F3F46',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
    dark: {
      primaryColor: '#71717A',
      secondaryColor: '#52525B',
      accentColor: '#3F3F46',
      backgroundColor: '#09090B',
      surfaceColor: '#18181B',
      textColor: '#FAFAFA',
      mutedColor: '#A1A1AA',
      borderColor: '#27272A',
      buttonPrimaryBg: '#71717A',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#3F3F46',
      buttonSecondaryText: '#FAFAFA',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
  },
  stone: {
    name: 'Stone',
    preset: 'stone',
    light: {
      primaryColor: '#78716C',
      secondaryColor: '#57534E',
      accentColor: '#44403C',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#FAFAF9',
      textColor: '#1C1917',
      mutedColor: '#A8A29E',
      borderColor: '#E7E5E4',
      buttonPrimaryBg: '#57534E',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#F5F5F4',
      buttonSecondaryText: '#44403C',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
    dark: {
      primaryColor: '#78716C',
      secondaryColor: '#57534E',
      accentColor: '#44403C',
      backgroundColor: '#0C0A09',
      surfaceColor: '#1C1917',
      textColor: '#FAFAF9',
      mutedColor: '#A8A29E',
      borderColor: '#292524',
      buttonPrimaryBg: '#78716C',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#44403C',
      buttonSecondaryText: '#FAFAF9',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
  },
  red: {
    name: 'Red',
    preset: 'red',
    light: {
      primaryColor: '#EF4444',
      secondaryColor: '#DC2626',
      accentColor: '#B91C1C',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#FEF2F2',
      textColor: '#7F1D1D',
      mutedColor: '#6B7280',
      borderColor: '#FECACA',
      buttonPrimaryBg: '#EF4444',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#FEE2E2',
      buttonSecondaryText: '#991B1B',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
    dark: {
      primaryColor: '#EF4444',
      secondaryColor: '#DC2626',
      accentColor: '#B91C1C',
      backgroundColor: '#450A0A',
      surfaceColor: '#7F1D1D',
      textColor: '#FEF2F2',
      mutedColor: '#FCA5A5',
      borderColor: '#991B1B',
      buttonPrimaryBg: '#EF4444',
      buttonPrimaryText: '#450A0A',
      buttonSecondaryBg: '#7F1D1D',
      buttonSecondaryText: '#FEF2F2',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
  },
  orange: {
    name: 'Orange',
    preset: 'orange',
    light: {
      primaryColor: '#F97316',
      secondaryColor: '#EA580C',
      accentColor: '#C2410C',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#FFF7ED',
      textColor: '#7C2D12',
      mutedColor: '#6B7280',
      borderColor: '#FED7AA',
      buttonPrimaryBg: '#F97316',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#FFEDD5',
      buttonSecondaryText: '#9A3412',
      successColor: '#10B981',
      warningColor: '#F97316',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
    dark: {
      primaryColor: '#F97316',
      secondaryColor: '#EA580C',
      accentColor: '#C2410C',
      backgroundColor: '#431407',
      surfaceColor: '#7C2D12',
      textColor: '#FFF7ED',
      mutedColor: '#FDBA74',
      borderColor: '#9A3412',
      buttonPrimaryBg: '#F97316',
      buttonPrimaryText: '#431407',
      buttonSecondaryBg: '#7C2D12',
      buttonSecondaryText: '#FFF7ED',
      successColor: '#10B981',
      warningColor: '#F97316',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
  },
  amber: {
    name: 'Amber',
    preset: 'amber',
    light: {
      primaryColor: '#F59E0B',
      secondaryColor: '#D97706',
      accentColor: '#B45309',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#FFFBEB',
      textColor: '#78350F',
      mutedColor: '#6B7280',
      borderColor: '#FDE68A',
      buttonPrimaryBg: '#F59E0B',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#FEF3C7',
      buttonSecondaryText: '#92400E',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
    dark: {
      primaryColor: '#F59E0B',
      secondaryColor: '#D97706',
      accentColor: '#B45309',
      backgroundColor: '#451A03',
      surfaceColor: '#78350F',
      textColor: '#FFFBEB',
      mutedColor: '#FCD34D',
      borderColor: '#92400E',
      buttonPrimaryBg: '#F59E0B',
      buttonPrimaryText: '#451A03',
      buttonSecondaryBg: '#78350F',
      buttonSecondaryText: '#FFFBEB',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
  },
  yellow: {
    name: 'Yellow',
    preset: 'yellow',
    light: {
      primaryColor: '#EAB308',
      secondaryColor: '#CA8A04',
      accentColor: '#A16207',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#FEFCE8',
      textColor: '#713F12',
      mutedColor: '#6B7280',
      borderColor: '#FDE047',
      buttonPrimaryBg: '#EAB308',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#FEF3C7',
      buttonSecondaryText: '#854D0E',
      successColor: '#10B981',
      warningColor: '#EAB308',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
    dark: {
      primaryColor: '#EAB308',
      secondaryColor: '#CA8A04',
      accentColor: '#A16207',
      backgroundColor: '#422006',
      surfaceColor: '#713F12',
      textColor: '#FEFCE8',
      mutedColor: '#FACC15',
      borderColor: '#854D0E',
      buttonPrimaryBg: '#EAB308',
      buttonPrimaryText: '#422006',
      buttonSecondaryBg: '#713F12',
      buttonSecondaryText: '#FEFCE8',
      successColor: '#10B981',
      warningColor: '#EAB308',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
  },
  lime: {
    name: 'Lime',
    preset: 'lime',
    light: {
      primaryColor: '#84CC16',
      secondaryColor: '#65A30D',
      accentColor: '#4D7C0F',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#F7FEE7',
      textColor: '#365314',
      mutedColor: '#6B7280',
      borderColor: '#BEF264',
      buttonPrimaryBg: '#84CC16',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#ECFCCB',
      buttonSecondaryText: '#3F6212',
      successColor: '#84CC16',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
    dark: {
      primaryColor: '#84CC16',
      secondaryColor: '#65A30D',
      accentColor: '#4D7C0F',
      backgroundColor: '#1A2E05',
      surfaceColor: '#365314',
      textColor: '#F7FEE7',
      mutedColor: '#A3E635',
      borderColor: '#3F6212',
      buttonPrimaryBg: '#84CC16',
      buttonPrimaryText: '#1A2E05',
      buttonSecondaryBg: '#365314',
      buttonSecondaryText: '#F7FEE7',
      successColor: '#84CC16',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
  },
  green: {
    name: 'Green',
    preset: 'green',
    light: {
      primaryColor: '#22C55E',
      secondaryColor: '#16A34A',
      accentColor: '#15803D',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#F0FDF4',
      textColor: '#14532D',
      mutedColor: '#6B7280',
      borderColor: '#BBF7D0',
      buttonPrimaryBg: '#22C55E',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#DCFCE7',
      buttonSecondaryText: '#166534',
      successColor: '#22C55E',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
    dark: {
      primaryColor: '#22C55E',
      secondaryColor: '#16A34A',
      accentColor: '#15803D',
      backgroundColor: '#052E16',
      surfaceColor: '#14532D',
      textColor: '#F0FDF4',
      mutedColor: '#86EFAC',
      borderColor: '#166534',
      buttonPrimaryBg: '#22C55E',
      buttonPrimaryText: '#052E16',
      buttonSecondaryBg: '#14532D',
      buttonSecondaryText: '#F0FDF4',
      successColor: '#22C55E',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
  },
  emerald: {
    name: 'Emerald',
    preset: 'emerald',
    light: {
      primaryColor: '#10B981',
      secondaryColor: '#059669',
      accentColor: '#047857',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#ECFDF5',
      textColor: '#064E3B',
      mutedColor: '#6B7280',
      borderColor: '#D1FAE5',
      buttonPrimaryBg: '#10B981',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#D1FAE5',
      buttonSecondaryText: '#064E3B',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
    dark: {
      primaryColor: '#10B981',
      secondaryColor: '#059669',
      accentColor: '#047857',
      backgroundColor: '#022C22',
      surfaceColor: '#064E3B',
      textColor: '#ECFDF5',
      mutedColor: '#86EFAC',
      borderColor: '#047857',
      buttonPrimaryBg: '#10B981',
      buttonPrimaryText: '#022C22',
      buttonSecondaryBg: '#064E3B',
      buttonSecondaryText: '#ECFDF5',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
  },
  teal: {
    name: 'Teal',
    preset: 'teal',
    light: {
      primaryColor: '#14B8A6',
      secondaryColor: '#0D9488',
      accentColor: '#0F766E',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#F0FDFA',
      textColor: '#134E4A',
      mutedColor: '#6B7280',
      borderColor: '#99F6E4',
      buttonPrimaryBg: '#14B8A6',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#CCFBF1',
      buttonSecondaryText: '#115E59',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#14B8A6',
    },
    dark: {
      primaryColor: '#14B8A6',
      secondaryColor: '#0D9488',
      accentColor: '#0F766E',
      backgroundColor: '#042F2E',
      surfaceColor: '#134E4A',
      textColor: '#F0FDFA',
      mutedColor: '#5EEAD4',
      borderColor: '#115E59',
      buttonPrimaryBg: '#14B8A6',
      buttonPrimaryText: '#042F2E',
      buttonSecondaryBg: '#134E4A',
      buttonSecondaryText: '#F0FDFA',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#14B8A6',
    },
  },
  cyan: {
    name: 'Cyan',
    preset: 'cyan',
    light: {
      primaryColor: '#06B6D4',
      secondaryColor: '#0891B2',
      accentColor: '#0E7490',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#ECFEFF',
      textColor: '#164E63',
      mutedColor: '#6B7280',
      borderColor: '#A5F3FC',
      buttonPrimaryBg: '#06B6D4',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#CFFAFE',
      buttonSecondaryText: '#155E75',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#06B6D4',
    },
    dark: {
      primaryColor: '#06B6D4',
      secondaryColor: '#0891B2',
      accentColor: '#0E7490',
      backgroundColor: '#083344',
      surfaceColor: '#164E63',
      textColor: '#ECFEFF',
      mutedColor: '#67E8F9',
      borderColor: '#155E75',
      buttonPrimaryBg: '#06B6D4',
      buttonPrimaryText: '#083344',
      buttonSecondaryBg: '#164E63',
      buttonSecondaryText: '#ECFEFF',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#06B6D4',
    },
  },
  sky: {
    name: 'Sky',
    preset: 'sky',
    light: {
      primaryColor: '#0EA5E9',
      secondaryColor: '#0284C7',
      accentColor: '#0369A1',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#F0F9FF',
      textColor: '#0C4A6E',
      mutedColor: '#6B7280',
      borderColor: '#BAE6FD',
      buttonPrimaryBg: '#0EA5E9',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#E0F2FE',
      buttonSecondaryText: '#075985',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#0EA5E9',
    },
    dark: {
      primaryColor: '#0EA5E9',
      secondaryColor: '#0284C7',
      accentColor: '#0369A1',
      backgroundColor: '#082F49',
      surfaceColor: '#0C4A6E',
      textColor: '#F0F9FF',
      mutedColor: '#7DD3FC',
      borderColor: '#075985',
      buttonPrimaryBg: '#0EA5E9',
      buttonPrimaryText: '#082F49',
      buttonSecondaryBg: '#0C4A6E',
      buttonSecondaryText: '#F0F9FF',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#0EA5E9',
    },
  },
  blue: {
    name: 'Blue',
    preset: 'blue',
    light: {
      primaryColor: '#3B82F6',
      secondaryColor: '#2563EB',
      accentColor: '#1D4ED8',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#EFF6FF',
      textColor: '#1E3A8A',
      mutedColor: '#6B7280',
      borderColor: '#BFDBFE',
      buttonPrimaryBg: '#3B82F6',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#DBEAFE',
      buttonSecondaryText: '#1E40AF',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
    dark: {
      primaryColor: '#3B82F6',
      secondaryColor: '#2563EB',
      accentColor: '#1D4ED8',
      backgroundColor: '#172554',
      surfaceColor: '#1E3A8A',
      textColor: '#EFF6FF',
      mutedColor: '#93C5FD',
      borderColor: '#1E40AF',
      buttonPrimaryBg: '#3B82F6',
      buttonPrimaryText: '#172554',
      buttonSecondaryBg: '#1E3A8A',
      buttonSecondaryText: '#EFF6FF',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
  },
  indigo: {
    name: 'Indigo',
    preset: 'indigo',
    light: {
      primaryColor: '#6366F1',
      secondaryColor: '#4F46E5',
      accentColor: '#4338CA',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#EEF2FF',
      textColor: '#312E81',
      mutedColor: '#6B7280',
      borderColor: '#C7D2FE',
      buttonPrimaryBg: '#6366F1',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#E0E7FF',
      buttonSecondaryText: '#3730A3',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#6366F1',
    },
    dark: {
      primaryColor: '#6366F1',
      secondaryColor: '#4F46E5',
      accentColor: '#4338CA',
      backgroundColor: '#1E1B4B',
      surfaceColor: '#312E81',
      textColor: '#EEF2FF',
      mutedColor: '#A5B4FC',
      borderColor: '#3730A3',
      buttonPrimaryBg: '#6366F1',
      buttonPrimaryText: '#1E1B4B',
      buttonSecondaryBg: '#312E81',
      buttonSecondaryText: '#EEF2FF',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#6366F1',
    },
  },
  violet: {
    name: 'Violet',
    preset: 'violet',
    light: {
      primaryColor: '#8B5CF6',
      secondaryColor: '#7C3AED',
      accentColor: '#6D28D9',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#F3E8FF',
      textColor: '#4C1D95',
      mutedColor: '#6B7280',
      borderColor: '#DDD6FE',
      buttonPrimaryBg: '#8B5CF6',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#EDE9FE',
      buttonSecondaryText: '#5B21B6',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#8B5CF6',
    },
    dark: {
      primaryColor: '#8B5CF6',
      secondaryColor: '#7C3AED',
      accentColor: '#6D28D9',
      backgroundColor: '#2E1065',
      surfaceColor: '#4C1D95',
      textColor: '#F3E8FF',
      mutedColor: '#C4B5FD',
      borderColor: '#5B21B6',
      buttonPrimaryBg: '#8B5CF6',
      buttonPrimaryText: '#2E1065',
      buttonSecondaryBg: '#4C1D95',
      buttonSecondaryText: '#F3E8FF',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#8B5CF6',
    },
  },
  purple: {
    name: 'Purple',
    preset: 'purple',
    light: {
      primaryColor: '#A855F7',
      secondaryColor: '#9333EA',
      accentColor: '#7C3AED',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#FAF5FF',
      textColor: '#581C87',
      mutedColor: '#6B7280',
      borderColor: '#E9D5FF',
      buttonPrimaryBg: '#A855F7',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#E9D5FF',
      buttonSecondaryText: '#581C87',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#A855F7',
    },
    dark: {
      primaryColor: '#A855F7',
      secondaryColor: '#9333EA',
      accentColor: '#7C3AED',
      backgroundColor: '#2E1065',
      surfaceColor: '#4C1D95',
      textColor: '#FAF5FF',
      mutedColor: '#D8B4FE',
      borderColor: '#6B21A8',
      buttonPrimaryBg: '#A855F7',
      buttonPrimaryText: '#2E1065',
      buttonSecondaryBg: '#4C1D95',
      buttonSecondaryText: '#FAF5FF',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#A855F7',
    },
  },
  fuchsia: {
    name: 'Fuchsia',
    preset: 'fuchsia',
    light: {
      primaryColor: '#D946EF',
      secondaryColor: '#C026D3',
      accentColor: '#A21CAF',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#FDF4FF',
      textColor: '#701A75',
      mutedColor: '#6B7280',
      borderColor: '#F5D0FE',
      buttonPrimaryBg: '#D946EF',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#FAE8FF',
      buttonSecondaryText: '#86198F',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#D946EF',
    },
    dark: {
      primaryColor: '#D946EF',
      secondaryColor: '#C026D3',
      accentColor: '#A21CAF',
      backgroundColor: '#4A044E',
      surfaceColor: '#701A75',
      textColor: '#FDF4FF',
      mutedColor: '#F0ABFC',
      borderColor: '#86198F',
      buttonPrimaryBg: '#D946EF',
      buttonPrimaryText: '#4A044E',
      buttonSecondaryBg: '#701A75',
      buttonSecondaryText: '#FDF4FF',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#D946EF',
    },
  },
  pink: {
    name: 'Pink',
    preset: 'pink',
    light: {
      primaryColor: '#EC4899',
      secondaryColor: '#DB2777',
      accentColor: '#BE185D',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#FDF2F8',
      textColor: '#831843',
      mutedColor: '#6B7280',
      borderColor: '#FBCFE8',
      buttonPrimaryBg: '#EC4899',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#FCE7F3',
      buttonSecondaryText: '#9F1239',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EC4899',
      infoColor: '#3B82F6',
    },
    dark: {
      primaryColor: '#EC4899',
      secondaryColor: '#DB2777',
      accentColor: '#BE185D',
      backgroundColor: '#500724',
      surfaceColor: '#831843',
      textColor: '#FDF2F8',
      mutedColor: '#F9A8D4',
      borderColor: '#9F1239',
      buttonPrimaryBg: '#EC4899',
      buttonPrimaryText: '#500724',
      buttonSecondaryBg: '#831843',
      buttonSecondaryText: '#FDF2F8',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EC4899',
      infoColor: '#3B82F6',
    },
  },
  rose: {
    name: 'Rose',
    preset: 'rose',
    light: {
      primaryColor: '#F43F5E',
      secondaryColor: '#E11D48',
      accentColor: '#BE123C',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#FFF1F2',
      textColor: '#881337',
      mutedColor: '#6B7280',
      borderColor: '#FECDD3',
      buttonPrimaryBg: '#F43F5E',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#FECDD3',
      buttonSecondaryText: '#881337',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#F43F5E',
      infoColor: '#3B82F6',
    },
    dark: {
      primaryColor: '#F43F5E',
      secondaryColor: '#E11D48',
      accentColor: '#BE123C',
      backgroundColor: '#4C0519',
      surfaceColor: '#881337',
      textColor: '#FFF1F2',
      mutedColor: '#FDA4AF',
      borderColor: '#BE123C',
      buttonPrimaryBg: '#F43F5E',
      buttonPrimaryText: '#4C0519',
      buttonSecondaryBg: '#881337',
      buttonSecondaryText: '#FFF1F2',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#F43F5E',
      infoColor: '#3B82F6',
    },
  },
}
