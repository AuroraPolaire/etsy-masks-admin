import type { Config } from 'tailwindcss';

const colorVariable = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: colorVariable('--color-canvas'),
        surface: {
          panel: colorVariable('--color-surface-panel'),
          raised: colorVariable('--color-surface-raised'),
          muted: colorVariable('--color-surface-muted'),
          inset: colorVariable('--color-surface-inset'),
          outline: colorVariable('--color-surface-outline'),
          divider: colorVariable('--color-surface-divider'),
        },
        ink: {
          strong: colorVariable('--color-ink-strong'),
          base: colorVariable('--color-ink-base'),
          muted: colorVariable('--color-ink-muted'),
          subtle: colorVariable('--color-ink-subtle'),
          inverse: colorVariable('--color-ink-inverse'),
        },
        brand: {
          DEFAULT: colorVariable('--color-brand'),
          strong: colorVariable('--color-brand-strong'),
          subtle: colorVariable('--color-brand-subtle'),
          border: colorVariable('--color-brand-border'),
        },
        ai: {
          from: colorVariable('--color-ai-from'),
          mid: colorVariable('--color-ai-mid'),
          to: colorVariable('--color-ai-to'),
        },
        feedback: {
          success: {
            bg: colorVariable('--color-success-bg'),
            border: colorVariable('--color-success-border'),
            fg: colorVariable('--color-success-fg'),
          },
          warning: {
            bg: colorVariable('--color-warning-bg'),
            border: colorVariable('--color-warning-border'),
            fg: colorVariable('--color-warning-fg'),
          },
          danger: {
            bg: colorVariable('--color-danger-bg'),
            border: colorVariable('--color-danger-border'),
            fg: colorVariable('--color-danger-fg'),
          },
          info: {
            bg: colorVariable('--color-info-bg'),
            border: colorVariable('--color-info-border'),
            fg: colorVariable('--color-info-fg'),
          },
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      borderRadius: {
        panel: '0.5rem',
        control: '0.375rem',
        badge: '999px',
      },
      boxShadow: {
        panel: '0 1px 2px rgb(16 24 40 / 0.04), 0 12px 28px rgb(16 24 40 / 0.06)',
        raised: '0 1px 2px rgb(16 24 40 / 0.06), 0 8px 18px rgb(16 24 40 / 0.06)',
      },
    },
  },
  plugins: [],
} satisfies Config;
