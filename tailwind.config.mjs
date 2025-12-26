/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'sans-serif'],
                serif: ['"Lora"', 'serif'],
            },
            colors: {
                // YOUR EXACT BRAND COLORS FROM THE HTML FILE
                indigo: {
                    50: '#f0f8ff', 
                    100: '#e0f0fe', 
                    200: '#bae2fd', 
                    300: '#7ccbfd',
                    400: '#36b2fa', 
                    500: '#0c9aeb', // Main Brand Color
                    600: '#276ca1', 
                    700: '#1e5583',
                    800: '#1a476f', 
                    900: '#193d5d', 
                    950: '#10273d',
                },
                // OPTIONAL: Warm Taupe for secondary text (if you want it)
                taupe: { 
                    500: '#756A5B', 
                    600: '#5D5448' 
                },
            }
        },
	},
	plugins: [],
}