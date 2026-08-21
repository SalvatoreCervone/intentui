import { createIntentUI, autoDiscoverComponents } from '@intentui/vue';
import DefaultSkeleton from './components/DefaultSkeleton.vue';

/**
 * IntentUI configuration with automatic component discovery.
 * Components in ./components/*.vue declare their own schemas and descriptions via `defineIntent()`.
 */
export const intentUI = createIntentUI({
  components: autoDiscoverComponents(
    import.meta.glob('./components/*.vue', { eager: true })
  ),
  fallback: DefaultSkeleton,
});

// Export tool definitions for the LLMs
export const toolsDefinition = intentUI.getToolsDefinition();
