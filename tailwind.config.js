/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'sidebar-bg': '#1E293B', // Dark Blue/Slate
                'content-bg': '#F1F5F9', // Light Gray
                'brand': '#3B82F6', // Blue
            }
        },
    },
    plugins: [],
}
