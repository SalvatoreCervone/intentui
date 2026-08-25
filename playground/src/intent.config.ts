import { createIntentUI, autoDiscoverComponents } from '@intentui-vue/vue';
import { intentUIComponents } from '@intentui-vue/ui-kit';
import DefaultSkeleton from './components/DefaultSkeleton.vue';

/**
 * IntentUI configuration combining:
 * 1. Locally auto-discovered components in ./components/*.vue
 * 2. Standard headless UI Kit components from @intentui-vue/ui-kit (MetricCard, DataTable, FormWizard, ConfirmationCard)
 */
export const intentUI = createIntentUI({
  components: {
    ...intentUIComponents,
    ...autoDiscoverComponents(
      import.meta.glob('./components/*.vue', { eager: true })
    ),
  },
  fallback: DefaultSkeleton,
});

// Export tool definitions for the LLMs
export const toolsDefinition = intentUI.getToolsDefinition();
