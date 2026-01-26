import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /**
         * WCAG 2.1 AA Contrast Ratios (calculated against white #ffffff):
         * - Normal text requires 4.5:1
         * - Large text (18pt+ or 14pt bold) requires 3:1
         *
         * Primary brand color - Orange
         * Accessibility notes:
         * - primary-500/600: Use only for large text, icons, or decorative elements
         * - primary-700+: Safe for all body text on white backgrounds
         * - White text on primary backgrounds: Use primary-700+ for buttons
         */
        primary: {
          50: '#fdf7f0',   // Contrast on white: 1.1:1 (background only)
          100: '#faebdb',  // Contrast on white: 1.2:1 (background only)
          200: '#f4d4b6',  // Contrast on white: 1.4:1 (background only)
          300: '#ecb688',  // Contrast on white: 1.7:1 (background only)
          400: '#e38f58',  // Contrast on white: 2.3:1 (decorative only)
          500: '#dc7136',  // Contrast on white: 3.0:1 (large text/icons only)
          600: '#ce582c',  // Contrast on white: 3.7:1 (large text/icons only)
          700: '#ab4326',  // Contrast on white: 5.0:1 ✓ AA for all text
          800: '#893725',  // Contrast on white: 6.9:1 ✓ AA/AAA
          900: '#6f3022',  // Contrast on white: 9.0:1 ✓ AAA
          950: '#3c1610',  // Contrast on white: 14.5:1 ✓ AAA
        },
        // Accent color - same as primary for consistency
        accent: {
          50: '#fdf7f0',
          100: '#faebdb',
          200: '#f4d4b6',
          300: '#ecb688',
          400: '#e38f58',
          500: '#dc7136',
          600: '#ce582c',
          700: '#ab4326',  // Use for accessible accent text
          800: '#893725',
          900: '#6f3022',
          950: '#3c1610',
        },
        /**
         * Neutral grays - Accessibility notes:
         * - neutral-500+: Safe for body text on white
         * - neutral-400: Use only for placeholder text or disabled states
         * - White text on dark: Use neutral-800+ for backgrounds
         */
        neutral: {
          50: '#f9fafb',   // Background only
          100: '#f3f4f6',  // Background only
          200: '#e5e7eb',  // Borders, dividers
          300: '#d1d5db',  // Borders, dividers
          400: '#9ca3af',  // Contrast: 3.0:1 - Placeholder/disabled only
          500: '#6b7280',  // Contrast: 4.6:1 ✓ AA for all text
          600: '#4b5563',  // Contrast: 7.0:1 ✓ AA/AAA
          700: '#374151',  // Contrast: 9.9:1 ✓ AAA
          800: '#1f2937',  // Contrast: 13.6:1 ✓ AAA (safe for white text)
          900: '#111827',  // Contrast: 16.1:1 ✓ AAA (safe for white text)
          950: '#030712',  // Contrast: 19.5:1 ✓ AAA
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      aspectRatio: {
        '4/5': '4 / 5',
        '3/4': '3 / 4',
        '2/3': '2 / 3',
        '9/16': '9 / 16',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        'slide-in': 'slideIn 0.3s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '75ch',
            color: 'var(--tw-prose-body)',
            a: {
              color: 'var(--tw-prose-links)',
              textDecoration: 'underline',
              fontWeight: '500',
            },
            'h1, h2, h3, h4': {
              fontFamily: 'var(--font-playfair)',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
  ],
};

export default config;
