import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['.localhost', '.local', '.ngrok.io', '.vercel.app', '.githubpreview.dev', 'magnifier-nifty-empower.ngrok-free.dev']
  }
})
