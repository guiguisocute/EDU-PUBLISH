import path from 'path';
import fs from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const buildVersion = new Date().toISOString().replace(/[:.]/g, '-');

function swVersionPlugin(): Plugin {
  return {
    name: 'sw-version',
    async closeBundle() {
      const fs = await import('node:fs/promises');
      const swPath = path.resolve(__dirname, 'dist', 'sw.js');
      try {
        const content = await fs.readFile(swPath, 'utf8');
        await fs.writeFile(swPath, content.replace('__BUILD_VERSION__', buildVersion), 'utf8');
      } catch {}
    },
  };
}

function siteConfigHtmlPlugin(): Plugin {
  return {
    name: 'site-config-html',
    transformIndexHtml(html) {
      const configPath = path.resolve(__dirname, 'public/generated/site-config.json')
      if (!fs.existsSync(configPath)) {
        console.warn('[vite] site-config.json not found, skipping HTML injection')
        return html
      }
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      return html
        .replace(/\{\{SITE_NAME\}\}/g, config.site_name || 'EDU Publish')
        .replace(/\{\{SITE_SHORT_NAME\}\}/g, config.site_short_name || 'EDU Publish')
        .replace(/\{\{SITE_DESCRIPTION\}\}/g, config.site_description || '')
        .replace(/\{\{SEO_KEYWORDS\}\}/g, (config.seo?.default_keywords || []).join(', '))
        .replace(/\{\{THEME_COLOR\}\}/g, config._computed?.theme_color_hex || '#2563eb')
        .replace(/\{\{SITE_URL\}\}/g, config.site_url || '')
    }
  }
}

export default defineConfig(() => {
  return {
    define: {
      __BUILD_TIME__: JSON.stringify(buildVersion),
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), swVersionPlugin(), siteConfigHtmlPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': ['framer-motion', 'lucide-react', 'recharts'],
          }
        }
      },
      chunkSizeWarningLimit: 500,
    }
  };
});