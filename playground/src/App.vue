<template>
  <div class="app">
    <header class="app-header">
      <h1>⚡ IntentUI <span class="version">Playground</span></h1>
      <p class="subtitle">Intent-Driven Generative UI for Vue 3</p>
    </header>

    <main class="app-main">
      <!-- Scenario picker -->
      <div class="scenario-picker">
        <h2>Select a demo scenario</h2>
        <div class="scenario-buttons">
          <button
            v-for="key in scenarioKeys"
            :key="key"
            class="scenario-btn"
            :class="{ active: activeScenario === key }"
            :disabled="isStreaming"
            @click="runScenario(key)"
          >
            <span class="scenario-icon">{{ key === 'salesChart' ? '📊' : '🏨' }}</span>
            <span class="scenario-info">
              <span class="scenario-name">{{ getInfo(key)?.name }}</span>
              <span class="scenario-desc">{{ getInfo(key)?.description }}</span>
            </span>
          </button>
        </div>
      </div>

      <!-- Rendered output -->
      <div class="output-area">
        <div v-if="stream.length === 0 && !isStreaming" class="empty-state">
          <p>👆 Pick a scenario above to see IntentUI in action</p>
        </div>

        <div v-if="isStreaming" class="streaming-indicator">
          <span class="dot"></span>
          <span>Streaming from AI...</span>
        </div>

        <IntentRenderer
          v-if="stream.length > 0"
          :stream="stream"
          :registry="intentUI.registry"
          :bridge="intentUI.bridge"
          @action="onAction"
        >
          <template #loading="{ componentName }">
            <div class="custom-loading">
              <div class="loading-shimmer"></div>
              <span>Generating {{ componentName }}...</span>
            </div>
          </template>
        </IntentRenderer>
      </div>

      <!-- Action log -->
      <div v-if="actionLog.length > 0" class="action-log">
        <h3>🔁 Action Log (Agentic Round-Trip)</h3>
        <div
          v-for="(action, i) in actionLog"
          :key="i"
          class="action-entry"
        >
          <code>{{ action.componentName }}.{{ action.event }}</code>
          <pre>{{ JSON.stringify(action.data, null, 2) }}</pre>
        </div>
      </div>

      <!-- Tool definitions preview -->
      <details class="tools-preview">
        <summary>🔧 Generated Tool Definitions (for LLM)</summary>
        <pre>{{ JSON.stringify(toolsDefinition, null, 2) }}</pre>
      </details>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { IntentRenderer, type IntentStreamChunk } from '@intentui/vue';
import { intentUI, toolsDefinition } from './intent.config';
import { simulateStream, getScenarioKeys, getScenarioInfo } from './mock/stream';

interface ActionLogEntry {
  componentName: string;
  event: string;
  data: unknown;
}

const stream = ref<IntentStreamChunk[]>([]);
const isStreaming = ref(false);
const activeScenario = ref<string | null>(null);
const actionLog = reactive<ActionLogEntry[]>([]);
const scenarioKeys = getScenarioKeys();

function getInfo(key: string) {
  return getScenarioInfo(key);
}

function runScenario(key: string) {
  // Reset
  stream.value = [];
  activeScenario.value = key;
  isStreaming.value = true;

  simulateStream(
    key,
    (chunk) => {
      // Replace the last streaming (non-done) chunk, or push a new one
      const lastIndex = stream.value.length - 1;
      const last = lastIndex >= 0 ? stream.value[lastIndex] : undefined;

      if (last && !last.done && last.intent) {
        stream.value[lastIndex] = chunk;
      } else {
        stream.value.push(chunk);
      }
    },
    () => {
      isStreaming.value = false;
    },
    { delayMs: 25, chunkSize: 5 }
  );
}

function onAction(componentName: string, event: string, data: unknown) {
  actionLog.push({ componentName, event, data });
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
  min-height: 100vh;
}

.app {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.app-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.app-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.5rem;
}

.version {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: #94a3b8;
  font-size: 0.95rem;
}

.scenario-picker {
  margin-bottom: 2rem;
}

.scenario-picker h2 {
  font-size: 1rem;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 0.75rem;
}

.scenario-buttons {
  display: flex;
  gap: 0.75rem;
}

.scenario-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 0.75rem;
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  text-align: left;
}

.scenario-btn:hover:not(:disabled) {
  border-color: #6366f1;
  background: #1e1b4b;
}

.scenario-btn.active {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
}

.scenario-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.scenario-icon {
  font-size: 1.5rem;
}

.scenario-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.scenario-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.scenario-desc {
  font-size: 0.75rem;
  color: #94a3b8;
}

.output-area {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 1rem;
  padding: 1.5rem;
  min-height: 120px;
  margin-bottom: 1.5rem;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  color: #64748b;
  font-size: 0.9rem;
}

.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #818cf8;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.dot {
  width: 8px;
  height: 8px;
  background: #818cf8;
  border-radius: 50%;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.custom-loading {
  background: #1e293b;
  border: 1px dashed #475569;
  border-radius: 0.75rem;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: #94a3b8;
  font-size: 0.85rem;
}

.loading-shimmer {
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, transparent, #6366f1, transparent);
  background-size: 200% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
  border-radius: 2px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.action-log {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 1rem;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.action-log h3 {
  font-size: 0.9rem;
  font-weight: 600;
  color: #a5b4fc;
  margin-bottom: 0.75rem;
}

.action-entry {
  background: #0f172a;
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
}

.action-entry code {
  color: #67e8f9;
  font-size: 0.8rem;
  font-weight: 600;
}

.action-entry pre {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 0.35rem;
  white-space: pre-wrap;
}

.tools-preview {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 1rem;
  overflow: hidden;
}

.tools-preview summary {
  padding: 1rem 1.25rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  color: #94a3b8;
  transition: color 0.2s;
}

.tools-preview summary:hover {
  color: #e2e8f0;
}

.tools-preview pre {
  padding: 1.25rem;
  font-size: 0.75rem;
  color: #94a3b8;
  background: #0f172a;
  overflow-x: auto;
  white-space: pre-wrap;
}
</style>
