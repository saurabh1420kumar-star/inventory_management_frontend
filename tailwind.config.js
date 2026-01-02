/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{html,ts}",
    ],
    theme: {
        extend: {
            fontFamily: {
                // Replace 'sans' to make it the global default
                sans: ['"Inter"', 'system-ui', 'sans-serif'],
                // Or create a specific brand font
                brand: ['"Plus Jakarta Sans"', 'sans-serif'],
            },
            colors: {
                primary: {
                    DEFAULT: 'var(--ion-color-primary)',
                    shade: 'var(--ion-color-primary-shade)',
                    tint: 'var(--ion-color-primary-tint)',
                },
                secondary: {
                    DEFAULT: 'var(--ion-color-secondary)',
                    shade: 'var(--ion-color-secondary-shade)',
                    tint: 'var(--ion-color-secondary-tint)',
                },
                success: {
                    DEFAULT: 'var(--ion-color-success)',
                    shade: 'var(--ion-color-success-shade)',
                    tint: 'var(--ion-color-success-tint)',
                },
                danger: {
                    DEFAULT: 'var(--ion-color-danger)',
                    shade: 'var(--ion-color-danger-shade)',
                    tint: 'var(--ion-color-danger-tint)',
                },
            },
        },
    },
    plugins: [],
    corePlugins: {
        preflight: false,
    },
};
