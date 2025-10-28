import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			// Dream LMS Brand Colors
  			teal: {
  				50: '#F0FDFA',
  				100: '#CCFBF1',
  				200: '#99F6E4',
  				300: '#5EEAD4',
  				400: '#2DD4BF',
  				500: '#14B8A6', // Primary
  				600: '#0D9488',
  				700: '#0F766E',
  				800: '#115E59',
  				900: '#134E4A',
  				950: '#042F2E',
  			},
  			cyan: {
  				50: '#ECFEFF',
  				100: '#CFFAFE',
  				200: '#A5F3FC',
  				300: '#67E8F9',
  				400: '#22D3EE',
  				500: '#06B6D4', // Secondary
  				600: '#0891B2',
  				700: '#0E7490',
  				800: '#155E75',
  				900: '#164E63',
  				950: '#083344',
  			},
  		},
  		boxShadow: {
  			'neuro-sm': '2px 2px 4px rgba(0,0,0,0.2), -2px -2px 4px rgba(255,255,255,0.05)',
  			'neuro': '4px 4px 8px rgba(0,0,0,0.2), -4px -4px 8px rgba(255,255,255,0.05)',
  			'neuro-lg': '8px 8px 16px rgba(0,0,0,0.2), -8px -8px 16px rgba(255,255,255,0.05)',
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
