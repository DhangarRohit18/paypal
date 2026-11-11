/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic Token Mapping
        bg: {
          DEFAULT: 'var(--color-bg)',
          subtle: 'var(--color-bg-subtle)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          raised: 'var(--color-surface-raised)',
          overlay: 'var(--color-surface-overlay)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          subtle: 'var(--color-border-subtle)',
          strong: 'var(--color-border-strong)',
        },
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          subtle: 'var(--color-text-subtle)',
        },
        brand: {
          navy: '#0B1020',
          blue: {
            DEFAULT: '#246BFD',
            50: '#EFF5FF',
            100: '#DBE8FE',
            500: '#246BFD',
            600: '#1A56DB',
            700: '#1442B5',
          },
          violet: {
            DEFAULT: '#7657FF',
            50: '#F5F3FF',
            100: '#EDE9FE',
            500: '#7657FF',
            600: '#5E3BEE',
          }
        },
        status: {
          success: {
            DEFAULT: 'var(--color-status-success)',
            text: 'var(--color-status-success-text)',
            bg: 'var(--color-status-success-bg)',
            border: 'var(--color-status-success-border)',
          },
          warning: {
            DEFAULT: 'var(--color-status-warning)',
            text: 'var(--color-status-warning-text)',
            bg: 'var(--color-status-warning-bg)',
            border: 'var(--color-status-warning-border)',
          },
          danger: {
            DEFAULT: 'var(--color-status-danger)',
            text: 'var(--color-status-danger-text)',
            bg: 'var(--color-status-danger-bg)',
            border: 'var(--color-status-danger-border)',
          }
        },
        // Backward-compatibility aliases for existing code
        shopnavy: {
          DEFAULT: '#0B1020',
          50: '#F0F3FA',
          100: '#D9E2F5',
          800: '#121A2B',
          900: '#0B1020',
          950: '#070A14',
        },
        shopblue: {
          DEFAULT: '#246BFD',
          50: '#EFF5FF',
          100: '#DBE8FE',
          500: '#246BFD',
          600: '#1A56DB',
          700: '#1442B5',
        },
        shopviolet: {
          DEFAULT: '#7657FF',
          50: '#F5F3FF',
          100: '#EDE9FE',
          500: '#7657FF',
          600: '#5E3BEE',
        },
        shopbg: 'var(--color-bg)',
        shopsurface: 'var(--color-surface)',
        shopsuccess: '#18A873',
        shopwarning: '#E9A23B',
        shopdanger: '#E05252',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'soft-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'soft': '0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'soft-md': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
        'soft-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'glow-blue': '0 0 20px -3px rgba(36, 107, 253, 0.35)',
        'glow-violet': '0 0 20px -3px rgba(118, 87, 255, 0.35)',
      },
      borderRadius: {
        'card': '14px',
        'card-lg': '18px',
      },
      letterSpacing: {
        'tightest': '-0.03em',
        'tighter': '-0.02em',
        'tight': '-0.01em',
      }
    },
  },
  plugins: [],
}
