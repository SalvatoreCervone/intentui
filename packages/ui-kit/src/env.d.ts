declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  import type { ComponentDefinition } from '@intentui/vue';

  const component: DefineComponent<{}, {}, any> & {
    intent: ComponentDefinition;
  };
  export default component;
  export const intent: ComponentDefinition;
}
