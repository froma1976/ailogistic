import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   manifest: {
    //     name: 'FERLOGISTIC Inventory',
    //     short_name: 'Ferlogistic',
    //     description: 'Gestión de inventarios offline',
    //     theme_color: '#ffffff',
    //   }
    // })
  ],
})
