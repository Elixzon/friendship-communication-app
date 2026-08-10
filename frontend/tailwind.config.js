const colors = {
    bg: 'var(--color-bg)',
    fg: 'var(--color-fg)',
    muted: 'var(--color-muted)',
    primary: 'var(--color-primary)',
    'primary-600': 'var(--color-primary-600)',
    success: 'var(--color-success)',
    danger: 'var(--color-danger)'
};

module.exports = {
    content: ["./src/**/*.{js,ts,jsx,tsx}", "./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors,
            fontFamily: {
                sans: ['var(--font-sans)']
            }
        }
    },
    plugins: []
};
