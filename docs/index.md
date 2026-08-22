---
layout: home

hero:
  name: "IntentUI"
  text: "Generative UI per Vue 3 & Nuxt"
  tagline: "Trasforma gli stream dei modelli AI (LLM) in componenti Vue nativi, reattivi e validati con Zod."
  actions:
    - theme: brand
      text: Inizia Subito (Quickstart) →
      link: /guide/getting-started
    - theme: alt
      text: Architettura & Sicurezza
      link: /guide/architecture

features:
  - icon: ⚡
    title: Partial JSON Streaming
    details: Renderizza skeleton e componenti parziali in tempo reale mentre i token JSON arrivano dall'LLM, senza attendere il completamento dello stream.
  - icon: 🛡️
    title: Validazione Schema Zod
    details: Tipizzazione rigorosa e validazione a due fasi. I componenti ricevono solo props sicure e conformi allo schema.
  - icon: 🔄
    title: Loop Agentico Round-Trip
    details: Cattura click, modifiche e invii form dai componenti renderizzati e li reinvia all'AI come risposte a Tool Call per continuare il flusso.
  - icon: 📁
    title: Auto-Discovery Zero-Boilerplate
    details: Definisci lo schema direttamente nel file .vue tramite defineIntent() e scansiona la cartella in una singola riga con autoDiscoverComponents().
  - icon: 🤖
    title: Multi-Provider Unificato
    details: Connettori integrati per OpenAI (GPT-4o), Google Gemini, Anthropic Claude e modelli locali tramite Ollama.
  - icon: 💚
    title: Modulo Ufficiale Nuxt 3
    details: Auto-import di componenti e composables con proxy backend Nitro per proteggere le chiavi API sul server.
---

<style>
:root {
  --vp-c-brand-1: #6366f1;
  --vp-c-brand-2: #4f46e5;
  --vp-c-brand-3: #4338ca;
  --vp-c-brand-soft: rgba(99, 102, 241, 0.14);
}
</style>
