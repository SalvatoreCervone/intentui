import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'IntentUI',
  description: 'Generative UI for Vue 3 & Nuxt — Transform LLM streams into rich, native, schema-validated Vue components.',
  lang: 'it-IT',
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#6366f1' }],
  ],
  themeConfig: {
    siteTitle: '⚡ IntentUI',
    nav: [
      { text: 'Guida', link: '/guide/getting-started' },
      { text: 'Architettura', link: '/guide/architecture' },
      { text: 'API Reference', link: '/api/core' },
      { text: 'UI Kit', link: '/api/ui-kit' },
      { text: 'Esempi', link: '/examples/analytics-dashboard' },
    ],
    sidebar: [
      {
        text: 'Introduzione',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Architettura & Sicurezza', link: '/guide/architecture' },
        ],
      },
      {
        text: 'Guide & Integrazioni',
        items: [
          { text: 'Creazione Componenti & Schemi', link: '/guide/components' },
          { text: 'Auto-Discovery (Zero-Boilerplate)', link: '/guide/auto-discovery' },
          { text: 'Provider LLM (OpenAI, Gemini, Claude, Ollama)', link: '/guide/providers' },
          { text: 'Modulo Nuxt 3 (@intentui/nuxt)', link: '/guide/nuxt' },
        ],
      },
      {
        text: 'API Reference',
        items: [
          { text: '@intentui/core', link: '/api/core' },
          { text: '@intentui/vue', link: '/api/vue' },
          { text: '@intentui/nuxt', link: '/api/nuxt' },
          { text: '@intentui/ui-kit', link: '/api/ui-kit' },
        ],
      },
      {
        text: 'Esempi Pratici',
        items: [
          { text: 'Dashboard Analytics & KPI', link: '/examples/analytics-dashboard' },
          { text: 'Approvazioni Human-in-the-Loop', link: '/examples/human-in-the-loop' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/intentui/intentui' },
    ],
    footer: {
      message: 'Rilasciato sotto licenza MIT.',
      copyright: 'Copyright © 2026 IntentUI Team',
    },
    search: {
      provider: 'local',
    },
  },
});
