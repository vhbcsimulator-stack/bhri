import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dynamic-sitemap-dev',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === '/sitemap-blogs.xml') {
            try {
              const { default: handler } = await import('./api/sitemap-blogs.js');
              return handler(req, res);
            } catch (err) {
              console.error('Error serving local dynamic sitemap:', err);
              return next();
            }
          }
          next();
        });
      }
    }
  ],
  build: {
    // Avoid publishing readable source paths/code in production artifacts.
    sourcemap: false,
  },
})
