/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ideationLab Design System - Dark Theme
        background: '#11100E',
        foreground: '#E8E4DC',

        // Card surfaces
        card: {
          DEFAULT: '#1A1918',
          foreground: '#E8E4DC',
        },

        // Primary - Pink/Magenta (ideationLab button, active states)
        primary: {
          DEFAULT: '#E91E8C',
          foreground: '#FFFFFF',
          50: '#FDF2F8',
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F9A8D4',
          400: '#F472B6',
          500: '#E91E8C',
          600: '#DB2777',
          700: '#BE185D',
          800: '#9D174D',
          900: '#831843',
        },

        // Accent - Cyan/Teal (links, report pills)
        accent: {
          DEFAULT: '#14B8A6',
          foreground: '#FFFFFF',
        },

        // Secondary - Purple (score accents)
        secondary: {
          DEFAULT: '#8B5CF6',
          foreground: '#FFFFFF',
        },

        // Muted colors
        muted: {
          DEFAULT: '#262422',
          foreground: '#8A8680',
        },

        // Borders
        border: '#1F1E1C',

        // Status colors
        success: '#22C55E',
        warning: '#F59E0B',
        info: '#3B82F6',
        destructive: '#EF4444',

        // Status dots (matching web)
        status: {
          draft: '#A1A1AA',      // zinc-400
          interview: '#FBBF24',  // amber-400
          research: '#60A5FA',   // blue-400
          complete: '#34D399',   // emerald-400
        },

        // Score colors
        score: {
          opportunity: '#22C55E',
          problem: '#EC4899',
          feasibility: '#14B8A6',
          whynow: '#8B5CF6',
        },
      },

      fontFamily: {
        sans: ['Inter', 'System'],
        display: ['SpaceGrotesk', 'Inter', 'System'],
      },

      borderRadius: {
        '2xl': 16,
        '3xl': 24,
      },
    },
  },
  plugins: [],
};
