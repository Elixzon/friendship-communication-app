export const tokens = {
    colors: {
        bg: '#ffffff',
        fg: '#0f172a',
        muted: '#64748b',
        primary: '#2563eb',
        primary600: '#1d4ed8',
        success: '#16a34a',
        danger: '#dc2626'
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24
    },
    typography: {
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
        fontSizeBase: 16
    }
} as const;

export type Tokens = typeof tokens;
