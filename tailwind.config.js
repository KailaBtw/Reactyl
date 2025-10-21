export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'mono': ['SF Mono', 'Monaco', 'Consolas', 'monospace'],
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        molecule: {
          carbon: '#000000',
          hydrogen: '#ffffff', 
          oxygen: '#ff0000',
          nitrogen: '#0000ff',
          bromine: '#8b4513',
          iodine: '#9400d3',
        }
      },
      animation: {
        'in': 'animate-in 0.2s ease-out',
        'zoom-in-95': 'zoom-in-95 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      }
    },
  },
  plugins: [],
}
