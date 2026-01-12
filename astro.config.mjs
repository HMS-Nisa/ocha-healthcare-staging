import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap'; // 👈 IMPORT THIS

export default defineConfig({
  // 🚀 CRITICAL: Your live domain for Google Indexing
  site: 'https://ocha.health', 
  
  integrations: [
    tailwind(), 
    react(), 
    sitemap() // 👈 ADD THIS
  ]
});