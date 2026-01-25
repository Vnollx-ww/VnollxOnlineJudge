/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Gemini Design System - 主色板
        'gemini': {
          // 背景色
          'bg': '#f0f4f9',
          'bg-alt': '#f8fafe',
          'surface': '#ffffff',
          'surface-active': '#eef4ff',
          'surface-hover': '#e8eaed',
          
          // 文字色
          'text-primary': '#1f1f1f',
          'text-secondary': '#444746',
          'text-tertiary': '#5f6368',
          'text-disabled': '#9aa0a6',
          
          // 强调色
          'accent': '#d3e3fd',
          'accent-hover': '#c2d9fc',
          'accent-text': '#041e49',
          'accent-strong': '#1a73e8',
          
          // 状态色
          'success': '#34a853',
          'success-bg': '#e6f4ea',
          'warning': '#f9ab00',
          'warning-bg': '#fef7e0',
          'error': '#d93025',
          'error-bg': '#fce8e6',
          'info': '#1a73e8',
          'info-bg': '#e8f0fe',
          
          // 边框色
          'border': 'rgba(0, 0, 0, 0.08)',
          'border-light': 'rgba(0, 0, 0, 0.04)',
        },
        // ACG 别名 - 向后兼容
        'acg': {
          'bg': '#f0f4f9',
          'card': '#ffffff',
          'primary': '#1f1f1f',
          'secondary': '#444746',
          'muted': '#9aa0a6',
          'btn': '#d3e3fd',
          'btn-hover': '#c2d9fc',
          'input-border': 'rgba(0, 0, 0, 0.08)',
          'accent': '#1a73e8',
          'success': '#34a853',
          'warning': '#f9ab00',
          'error': '#d93025',
        },
      },
      borderRadius: {
        'pill': '9999px',
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'gemini': '0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04)',
        'gemini-hover': '0 2px 6px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.08)',
        'gemini-float': '0 4px 12px rgba(0, 0, 0, 0.15)',
        'input': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 2px 6px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.08)',
      },
      fontFamily: {
        'sans': ['"Google Sans"', 'Roboto', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        'scale-in': 'scaleIn 0.15s ease-out forwards',
        'ripple': 'ripple 0.6s linear',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
}
