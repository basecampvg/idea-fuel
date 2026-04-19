/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Idea Fuel Design System - Dark Theme
        background: '#1A1A1A',
        foreground: '#E8E4DC',

        // Card surfaces
        card: {
          DEFAULT: '#242424',
          foreground: '#E8E4DC',
        },

        // Primary - Brand Red/Orange (Idea Fuel)
        primary: {
          DEFAULT: '#E32B1A',
          foreground: '#FFFFFF',
        },

        // Accent - Cyan/Teal
        accent: {
          DEFAULT: '#14B8A6',
          foreground: '#FFFFFF',
        },

        // Secondary - Brand gradient end
        secondary: {
          DEFAULT: '#DB4D40',
          foreground: '#FFFFFF',
        },

        // Muted colors
        muted: {
          DEFAULT: '#2A2A2A',
          foreground: '#8A8680',
        },

        // Borders
        border: '#333333',

        // Status colors
        success: '#22C55E',
        warning: '#F59E0B',
        info: '#3B82F6',
        destructive: '#EF4444',
      },

      fontFamily: {
        sans: ['SFProText-Regular', 'System'],
        mono: ['GeistMono', 'monospace'],
        display: ['SFProDisplay-Regular', 'System'],
      },

      borderRadius: {
        '2xl': 16,
        '3xl': 24,
      },
    },
  },
  plugins: [],
};
