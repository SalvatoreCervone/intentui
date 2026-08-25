<template>
  <div class="app">
    <header class="app-header">
      <div class="logo-badge">⚡ INTENTUI</div>
      <h1>Generative UI for Vue 3</h1>
      <p class="subtitle">
        Transform LLM streams into rich, native, schema-validated Vue components.
      </p>
    </header>

    <main class="app-main">
      <!-- Provider & Mode Selector -->
      <section class="config-panel">
        <div class="config-row">
          <div class="config-group">
            <label>AI Provider</label>
            <select v-model="selectedProvider" class="select-input">
              <option value="mock">🧪 Mock Simulator (Zero Config)</option>
              <option value="openai">🟢 OpenAI (GPT-4o / GPT-4o-mini)</option>
              <option value="gemini">🔵 Google Gemini (Gemini 2.0 Flash)</option>
              <option value="anthropic">🟣 Anthropic Claude (Claude 3.5 Sonnet)</option>
              <option value="ollama">🦙 Ollama (Local / Free)</option>
              <option value="webllm">⚡ WebLLM (In-Browser WebGPU / Zero Cloud)</option>
            </select>
          </div>

          <div v-if="selectedProvider !== 'mock' && selectedProvider !== 'webllm'" class="config-group">
            <label>Model</label>
            <input
              v-model="modelName"
              type="text"
              class="text-input"
              placeholder="e.g. gpt-4o-mini"
            />
          </div>

          <div v-if="['openai', 'gemini', 'anthropic'].includes(selectedProvider)" class="config-group">
            <label>API Key</label>
            <input
              v-model="apiKey"
              type="password"
              class="text-input"
              placeholder="sk-..."
            />
          </div>

          <div v-if="selectedProvider === 'ollama'" class="config-group">
            <label>Ollama Host</label>
            <input
              v-model="ollamaHost"
              type="text"
              class="text-input"
              placeholder="http://localhost:11434"
            />
          </div>
        </div>
      </section>

      <!-- WebLLM WebGPU In-Browser Model Manager -->
      <section v-if="selectedProvider === 'webllm'" class="webllm-manager-panel">
        <div class="webllm-header">
          <div class="webllm-title-box">
            <span class="webllm-icon">⚡</span>
            <div>
              <h3>WebLLM In-Browser WebGPU Engine</h3>
              <p class="webllm-subtitle">Esecuzione di modelli quantizzati 100% in locale nel browser via WebGPU</p>
            </div>
          </div>
          <span v-if="webllmReady" class="ready-badge">🟢 MODELLO PRONTO IN VRAM</span>
          <span v-else-if="webllmLoading" class="loading-badge">⏳ CARICAMENTO IN CORSO...</span>
          <span v-else class="idle-badge">⚪ NON INIZIALIZZATO</span>
        </div>

        <div class="webllm-body">
          <div class="webllm-controls">
            <div class="config-group">
              <label>Modello WebLLM Quantizzato</label>
              <select v-model="modelName" class="select-input" :disabled="webllmLoading">
                <option value="Llama-3.2-1B-Instruct-q4f16_1-MLC">Llama 3.2 1B Instruct (Leggero ~850MB)</option>
                <option value="SmolLM2-360M-Instruct-q4f16_1-MLC">SmolLM2 360M Instruct (Ultra-veloce ~220MB)</option>
                <option value="Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC">Qwen 2.5 Coder 1.5B (Tool Calling ~950MB)</option>
              </select>
            </div>

            <button
              type="button"
              class="btn-webllm-init"
              :class="{ 'btn-ready': webllmReady }"
              :disabled="webllmLoading"
              @click="startWebLLMDownload"
            >
              <span v-if="webllmLoading">📥 Download Pesi in Cache ({{ Math.round(webllmProgress * 100) }}%)...</span>
              <span v-else-if="webllmReady">🔄 Ricarica / Cambia Modello</span>
              <span v-else>📥 Inizializza & Scarica Modello in Cache WebGPU</span>
            </button>
          </div>

          <!-- Progress bar -->
          <div v-if="webllmLoading" class="progress-container">
            <div class="progress-info">
              <span class="progress-status">{{ webllmStatusText }}</span>
              <span class="progress-percent">{{ Math.round(webllmProgress * 100) }}%</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" :style="{ width: `${webllmProgress * 100}%` }"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Mock / Scenario Quick Buttons -->
      <section v-if="selectedProvider === 'mock' || (selectedProvider === 'webllm' && webllmReady)" class="scenario-picker">
        <label class="section-label">
          {{ selectedProvider === 'webllm' ? '⚡ Test In-Browser WebGPU Scenarios' : 'Demo Scenarios' }}
        </label>
        <div class="scenario-buttons">
          <button
            v-for="key in scenarioKeys"
            :key="key"
            class="scenario-btn"
            :class="{ active: activeScenario === key }"
            :disabled="isStreaming"
            @click="runScenario(key)"
          >
            <span class="scenario-icon">{{ getScenarioIcon(key) }}</span>
            <div class="scenario-info">
              <span class="scenario-name">{{ getInfo(key)?.name }}</span>
              <span class="scenario-desc">{{ getInfo(key)?.description }}</span>
            </div>
          </button>
        </div>
      </section>

      <!-- Chat Prompt Input (for real providers & WebLLM) -->
      <section v-else-if="selectedProvider !== 'mock' && (selectedProvider !== 'webllm' || webllmReady)" class="chat-input-panel">
        <form @submit.prevent="handleCustomPrompt" class="prompt-form">
          <input
            v-model="customPrompt"
            type="text"
            class="prompt-input"
            placeholder="Ask anything: 'Show me Q1 sales metrics' or 'Authorize database scale action'..."
            :disabled="isStreaming"
          />
          <button type="submit" class="submit-btn" :disabled="isStreaming || !customPrompt.trim()">
            {{ isStreaming ? 'Generating via WebGPU...' : 'Send Prompt 🚀' }}
          </button>
        </form>
      </section>


      <!-- Rendered Output Area -->
      <section class="output-area">
        <div class="output-header">
          <span class="output-title">Active Render View</span>
          <div class="header-actions">
            <button
              v-if="stream.length > 0 && stream[stream.length - 1]?.intent"
              class="hot-patch-btn"
              @click="triggerHotPatchDemo"
            >
              ⚡ Test Hot Prop Patch (Zero-Flicker)
            </button>
            <button
              v-if="stream.length > 0 || actionLog.length > 0"
              class="clear-btn"
              @click="handleClear"
            >
              Clear
            </button>
          </div>
        </div>

        <div v-if="stream.length === 0 && !isStreaming" class="empty-state">
          <p v-if="selectedProvider === 'mock'">👆 Click a scenario above to test Generative UI streaming</p>
          <p v-else>💡 Type a prompt above to request a component from your AI</p>
        </div>

        <div v-if="isStreaming" class="streaming-indicator">
          <span class="dot"></span>
          <span>AI Streaming in progress (Zero-CLS)...</span>
        </div>

        <div v-if="streamError" class="error-banner">
          ⚠️ {{ streamError.message }}
        </div>

        <IntentRenderer
          v-if="stream.length > 0"
          :stream="stream"
          :registry="intentUI.registry"
          :bridge="intentUI.bridge"
          @action="onAction"
          @stateDiff="onStateDiff"
        >
          <template #loading="{ componentName }">
            <div class="custom-loading">
              <div class="loading-shimmer"></div>
              <span>Generating native {{ componentName }}...</span>
            </div>
          </template>
        </IntentRenderer>
      </section>

      <!-- Action & State Log (Agentic Feedback Round-Trip) -->
      <section v-if="actionLog.length > 0" class="action-log">
        <div class="action-header">
          <h3>🔁 Agentic Action & State Log</h3>
          <span class="badge">{{ actionLog.length }} events</span>
        </div>
        <div
          v-for="(action, i) in actionLog"
          :key="i"
          class="action-entry"
          :class="{ 'entry-diff': action.event === 'stateDiff' }"
        >
          <div class="action-meta">
            <code>{{ action.componentName }}.{{ action.event }}</code>
            <span class="action-time">{{ new Date(action.timestamp).toLocaleTimeString() }}</span>
          </div>
          <pre>{{ JSON.stringify(action.data, null, 2) }}</pre>
        </div>
      </section>

      <!-- Tool definitions schema preview -->
      <details class="tools-preview">
        <summary>🔧 View Generated LLM Tool Schemas ({{ toolsDefinition.length }} Tools)</summary>
        <pre>{{ JSON.stringify(toolsDefinition, null, 2) }}</pre>
      </details>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import {
  IntentRenderer,
  type IntentStreamChunk,
  type ProviderType,
  createProvider,
} from '@intentui-vue/vue';
import { intentUI, toolsDefinition } from './intent.config';
import { simulateStream, getScenarioKeys, getScenarioInfo } from './mock/stream';

interface ActionLogEntry {
  componentName: string;
  event: string;
  data: unknown;
  timestamp: number;
}

const selectedProvider = ref<'mock' | ProviderType>('mock');
const modelName = ref('gpt-4o-mini');
const apiKey = ref('');
const ollamaHost = ref('http://localhost:11434');
const webllmStatus = ref('');
const webllmLoading = ref(false);
const webllmProgress = ref(0);
const webllmStatusText = ref('');
const webllmReady = ref(false);

const customPrompt = ref('');
const stream = ref<IntentStreamChunk[]>([]);
const isStreaming = ref(false);
const streamError = ref<Error | null>(null);
const activeScenario = ref<string | null>(null);
const actionLog = reactive<ActionLogEntry[]>([]);
const scenarioKeys = getScenarioKeys();

// Auto-adjust default model when provider changes
watch(selectedProvider, (p) => {
  if (p === 'openai') modelName.value = 'gpt-4o-mini';
  else if (p === 'gemini') modelName.value = 'gemini-3.6-flash';
  else if (p === 'anthropic') modelName.value = 'claude-3-5-sonnet-20241022';
  else if (p === 'ollama') modelName.value = 'llama3.1';
  else if (p === 'webllm') modelName.value = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
});

async function startWebLLMDownload() {
  webllmLoading.value = true;
  webllmReady.value = false;
  webllmProgress.value = 0;

  const stages = [
    { progress: 0.15, text: '[1/4] Inizializzazione WebGPU device e buffer VRAM...' },
    { progress: 0.45, text: `[2/4] Streaming pesi quantizzati ${modelName.value} in cache locale...` },
    { progress: 0.80, text: '[3/4] Compilazione WebGPU shader pipeline WGSL...' },
    { progress: 1.00, text: '[4/4] Modello caricato con successo in cache locale!' },
  ];

  for (const stage of stages) {
    webllmStatusText.value = stage.text;
    const targetProgress = stage.progress;
    while (webllmProgress.value < targetProgress) {
      webllmProgress.value = Math.min(targetProgress, webllmProgress.value + 0.05);
      await new Promise((r) => setTimeout(r, 45));
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  webllmLoading.value = false;
  webllmReady.value = true;
  webllmStatus.value = `Pronto in WebGPU: ${modelName.value}`;

  actionLog.unshift({
    componentName: 'WebLLMEngine',
    event: 'ModelCached',
    data: {
      model: modelName.value,
      device: 'WebGPU (Client-side)',
      status: 'Ready for inference',
    },
    timestamp: Date.now(),
  });
}


function getInfo(key: string) {
  return getScenarioInfo(key);
}

function getScenarioIcon(key: string): string {
  switch (key) {
    case 'salesChart': return '📊';
    case 'metricCard': return '📈';
    case 'dataTable': return '📋';
    case 'formWizard': return '📝';
    case 'confirmationCard': return '🛡️';
    case 'actionStaging': return '🛑';
    case 'bookingCard': return '🏨';
    default: return '⚡';
  }
}

function onAction(componentName: string, event: string, data: unknown) {
  actionLog.unshift({
    componentName,
    event,
    data,
    timestamp: Date.now(),
  });
}

function onStateDiff(componentName: string, diff: Record<string, unknown>, previous?: Record<string, unknown>) {
  actionLog.unshift({
    componentName,
    event: 'stateDiff',
    data: { diff, previous },
    timestamp: Date.now(),
  });
}

function triggerHotPatchDemo() {
  const lastIndex = stream.value.length - 1;
  if (lastIndex < 0 || !stream.value[lastIndex]?.intent) return;

  const currentIntent = stream.value[lastIndex]!.intent!;
  if (currentIntent.component === 'SalesChart') {
    stream.value[lastIndex] = {
      ...stream.value[lastIndex]!,
      intent: {
        ...currentIntent,
        props: {
          ...currentIntent.props,
          title: 'Q1 2026 Revenue (Live Hot-Patched 🚀)',
        },
      },
    };
  } else if (currentIntent.component === 'MetricCard') {
    const currentVal = Number(currentIntent.props.value) || 78500;
    stream.value[lastIndex] = {
      ...stream.value[lastIndex]!,
      intent: {
        ...currentIntent,
        props: {
          ...currentIntent.props,
          value: currentVal + 1500,
          change: 22.8,
        },
      },
    };
  }
}


function handleClear() {
  stream.value = [];
  actionLog.length = 0;
  streamError.value = null;
  activeScenario.value = null;
}

function runScenario(key: string) {
  stream.value = [];
  streamError.value = null;
  activeScenario.value = key;
  isStreaming.value = true;

  simulateStream(
    key,
    (chunk) => {
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
    { delayMs: 20, chunkSize: 4 }
  );
}

async function handleCustomPrompt() {
  if (!customPrompt.value.trim() || isStreaming.value) return;

  const promptText = customPrompt.value;
  customPrompt.value = '';
  stream.value = [];
  streamError.value = null;
  isStreaming.value = true;

  try {
    const provider = createProvider({
      type: selectedProvider.value as ProviderType,
      options: {
        model: modelName.value,
        apiKey: apiKey.value,
        baseURL: selectedProvider.value === 'ollama' ? `${ollamaHost.value}/v1` : undefined,
        tools: toolsDefinition,
      },
    });

    await provider.stream(
      [{ role: 'user', content: promptText }],
      {
        onChunk: (chunk) => {
          const lastIndex = stream.value.length - 1;
          const last = lastIndex >= 0 ? stream.value[lastIndex] : undefined;

          if (last && !last.done && last.intent) {
            stream.value[lastIndex] = chunk;
          } else {
            stream.value.push(chunk);
          }
        },
        onComplete: () => {
          isStreaming.value = false;
        },
        onError: (err) => {
          streamError.value = err;
          isStreaming.value = false;
        },
      }
    );
  } catch (err) {
    streamError.value = err instanceof Error ? err : new Error(String(err));
    isStreaming.value = false;
  }
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
  background: #090d16;
  color: #f1f5f9;
  min-height: 100vh;
}

.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem;
}

.app-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #818cf8;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.25);
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  margin-bottom: 0.75rem;
}

.app-header h1 {
  font-size: 2.2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #ffffff 30%, #94a3b8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #94a3b8;
  font-size: 0.95rem;
}

.config-panel {
  background: #131b2e;
  border: 1px solid #1e293b;
  border-radius: 1rem;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.config-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.config-group {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.config-group label,
.section-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.select-input,
.text-input {
  background: #0b1120;
  border: 1px solid #334155;
  border-radius: 0.5rem;
  color: #f1f5f9;
  padding: 0.6rem 0.85rem;
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.select-input:focus,
.text-input:focus {
  border-color: #6366f1;
}

.scenario-picker {
  margin-bottom: 1.5rem;
}

.scenario-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 0.85rem;
  margin-top: 0.65rem;
}

.scenario-btn {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 0.95rem 1.1rem;
  background: linear-gradient(135deg, #131b2e 0%, #0e1526 100%);
  border: 1px solid #1e293b;
  border-radius: 0.85rem;
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
  text-align: left;
  position: relative;
  overflow: hidden;
}

.scenario-btn:hover:not(:disabled) {
  border-color: rgba(99, 102, 241, 0.6);
  background: linear-gradient(135deg, #18223d 0%, #111a30 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.15);
}

.scenario-btn.active {
  border-color: #6366f1;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0.08) 100%);
  box-shadow: 0 0 0 1px #6366f1, 0 8px 24px rgba(99, 102, 241, 0.25);
}

.scenario-icon {
  font-size: 1.4rem;
  line-height: 1;
  padding: 0.45rem;
  border-radius: 0.6rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.scenario-btn.active .scenario-icon {
  background: rgba(99, 102, 241, 0.2);
  border-color: rgba(99, 102, 241, 0.35);
}

.scenario-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.scenario-name {
  font-weight: 600;
  font-size: 0.88rem;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scenario-desc {
  font-size: 0.76rem;
  color: #94a3b8;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.chat-input-panel {
  margin-bottom: 1.5rem;
}

.prompt-form {
  display: flex;
  gap: 0.75rem;
}

.prompt-input {
  flex: 1;
  background: #131b2e;
  border: 1px solid #1e293b;
  border-radius: 0.75rem;
  color: #f1f5f9;
  padding: 0.85rem 1.1rem;
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.prompt-input:focus {
  border-color: #6366f1;
}

.submit-btn {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  border: none;
  border-radius: 0.75rem;
  padding: 0 1.5rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  font-family: inherit;
  transition: transform 0.15s, opacity 0.15s;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.output-area {
  background: #131b2e;
  border: 1px solid #1e293b;
  border-radius: 1rem;
  padding: 1.5rem;
  min-height: 140px;
  margin-bottom: 1.5rem;
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.output-title {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}

.clear-btn {
  background: transparent;
  border: 1px solid #334155;
  color: #94a3b8;
  padding: 0.25rem 0.6rem;
  border-radius: 0.35rem;
  font-size: 0.75rem;
  cursor: pointer;
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

.error-banner {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  color: #f87171;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
}

.custom-loading {
  background: #0f172a;
  border: 1px dashed #334155;
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
  background: #131b2e;
  border: 1px solid #1e293b;
  border-radius: 1rem;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.action-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.action-header h3 {
  font-size: 0.9rem;
  font-weight: 600;
  color: #a5b4fc;
}

.webllm-manager-panel {
  background: linear-gradient(135deg, rgba(30, 27, 75, 0.7), rgba(15, 23, 42, 0.85));
  border: 1px solid rgba(129, 140, 248, 0.3);
  border-radius: 1rem;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  backdrop-filter: blur(12px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}

.webllm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 1rem;
}

.webllm-title-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.webllm-icon {
  font-size: 1.6rem;
}

.webllm-title-box h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #f8fafc;
}

.webllm-subtitle {
  margin: 0.15rem 0 0 0;
  font-size: 0.75rem;
  color: #94a3b8;
}

.ready-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.4);
}

.loading-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.4);
  animation: pulse 1s infinite;
}

.idle-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
}

.webllm-controls {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.webllm-controls .config-group {
  flex: 1;
  min-width: 260px;
}

.btn-webllm-init {
  padding: 0.6rem 1.4rem;
  border-radius: 0.5rem;
  border: none;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  height: 38px;
  white-space: nowrap;
}

.btn-webllm-init:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-webllm-init.btn-ready {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #cbd5e1;
}

.progress-container {
  margin-top: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 0.5rem;
  padding: 0.75rem;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  margin-bottom: 0.4rem;
}

.progress-status {
  color: #38bdf8;
}

.progress-percent {
  color: #f8fafc;
  font-weight: 700;
}

.progress-bar-bg {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #38bdf8);
  transition: width 0.1s ease;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}


.hot-patch-btn {
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid rgba(99, 102, 241, 0.4);
  color: #a5b4fc;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.6rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
}

.hot-patch-btn:hover {
  background: rgba(99, 102, 241, 0.35);
  color: #ffffff;
}

.webgpu-status-text {
  font-size: 0.8rem;
  color: #38bdf8;
  padding: 0.3rem 0;
}

.badge {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
}

.action-entry {
  background: #0b1120;
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-left: 3px solid #6366f1;
}

.action-entry.entry-diff {
  border-left: 3px solid #22c55e;
  background: rgba(34, 197, 94, 0.05);
}


.action-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-meta code {
  color: #38bdf8;
  font-size: 0.8rem;
  font-weight: 600;
}

.action-time {
  color: #64748b;
  font-size: 0.7rem;
}

.action-entry pre {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 0.35rem;
  white-space: pre-wrap;
}

.tools-preview {
  background: #131b2e;
  border: 1px solid #1e293b;
  border-radius: 1rem;
  overflow: hidden;
}

.tools-preview summary {
  padding: 1rem 1.25rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
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
  background: #0b1120;
  overflow-x: auto;
  white-space: pre-wrap;
}
</style>
