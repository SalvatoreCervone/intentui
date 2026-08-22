import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createIntentUI } from '@intentui/vue';
import {
  MetricCard,
  DataTable,
  FormWizard,
  ConfirmationCard,
  ActionStagingCard,
  intentUIComponents,
} from '../src';


describe('@intentui/ui-kit components', () => {
  describe('MetricCard', () => {
    it('should render metric title, value, and positive trend badge', () => {
      const wrapper = mount(MetricCard, {
        props: {
          title: 'Monthly Revenue',
          value: 45000,
          unit: '€',
          change: 14.2,
          timeframe: 'vs last month',
        },
      });

      expect(wrapper.text()).toContain('Monthly Revenue');
      expect(wrapper.text()).toContain('45.000');
      expect(wrapper.text()).toContain('+14.2%');
      expect(wrapper.find('.metric-badge.up').exists()).toBe(true);
    });

    it('should emit action on card click', async () => {
      const wrapper = mount(MetricCard, {
        props: {
          title: 'Active Users',
          value: 1200,
        },
      });

      await wrapper.trigger('click');
      expect(wrapper.emitted('action')).toBeDefined();
    });
  });

  describe('DataTable', () => {
    const columns = [
      { key: 'name', label: 'Nome' },
      { key: 'role', label: 'Ruolo' },
      { key: 'status', label: 'Stato', type: 'badge' as const },
    ];

    const rows = [
      { name: 'Alice', role: 'Engineer', status: 'Attivo' },
      { name: 'Bob', role: 'Designer', status: 'In attesa' },
      { name: 'Charlie', role: 'PM', status: 'Annullato' },
    ];

    it('should render table headers and rows', () => {
      const wrapper = mount(DataTable, {
        props: {
          title: 'Elenco Dipendenti',
          columns,
          rows,
        },
      });

      expect(wrapper.text()).toContain('Elenco Dipendenti');
      expect(wrapper.text()).toContain('Alice');
      expect(wrapper.text()).toContain('Bob');
      expect(wrapper.find('.badge-success').text()).toBe('Attivo');
    });

    it('should filter rows on search query', async () => {
      const wrapper = mount(DataTable, {
        props: {
          title: 'Elenco Dipendenti',
          columns,
          rows,
        },
      });

      const input = wrapper.find('.search-input');
      await input.setValue('Alice');

      expect(wrapper.text()).toContain('Alice');
      expect(wrapper.text()).not.toContain('Bob');
    });
  });

  describe('FormWizard', () => {
    it('should render form fields and emit submit on submit', async () => {
      const wrapper = mount(FormWizard, {
        props: {
          title: 'Configura Progetto',
          fields: [
            { name: 'projectName', label: 'Nome Progetto', type: 'text' },
            { name: 'environment', label: 'Ambiente', type: 'select', options: ['dev', 'prod'] },
          ],
        },
      });

      expect(wrapper.text()).toContain('Configura Progetto');
      expect(wrapper.text()).toContain('Nome Progetto');

      await wrapper.find('.form-input').setValue('My AI App');
      await wrapper.find('form').trigger('submit.prevent');

      expect(wrapper.emitted('submit')).toBeDefined();
      expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
        projectName: 'My AI App',
      });
    });
  });

  describe('ConfirmationCard', () => {
    it('should render confirmation details and emit submit on confirm', async () => {
      const wrapper = mount(ConfirmationCard, {
        props: {
          title: 'Elimina Server',
          message: 'Sei sicuro di voler eliminare il cluster?',
          severity: 'danger',
          details: [{ label: 'Server ID', value: 'srv-9942' }],
        },
      });

      expect(wrapper.text()).toContain('Elimina Server');
      expect(wrapper.text()).toContain('srv-9942');

      await wrapper.find('.btn-confirm').trigger('click');
      expect(wrapper.emitted('submit')).toBeDefined();
      expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
        confirmed: true,
      });
    });
  });

  describe('ActionStagingCard', () => {
    it('should render staging parameters, diff comparison, and emit stateChange on inline edit', async () => {
      const wrapper = mount(ActionStagingCard, {
        props: {
          title: 'Autorizzazione Bonifico',
          description: 'Esecuzione trasferimento fondi verso fornitore',
          actionId: 'tx-8831',
          riskLevel: 'high',
          parameters: [
            { key: 'recipient', label: 'Beneficiario', value: 'Acme Corp', type: 'text' },
            { key: 'amount', label: 'Importo EUR', value: 5000, previousValue: 2000, type: 'number' },
            { key: 'urgent', label: 'Urgente', value: true, type: 'boolean' },
          ],
        },
      });

      expect(wrapper.text()).toContain('Autorizzazione Bonifico');
      expect(wrapper.text()).toContain('Beneficiario');
      expect((wrapper.find('.staging-input').element as HTMLInputElement).value).toBe('Acme Corp');
      expect(wrapper.text()).toContain('HIGH RISK');
      expect(wrapper.text()).toContain('2000'); // old val
      expect(wrapper.find('.param-diff-badge').exists()).toBe(true);

      // Edit a parameter inline
      const input = wrapper.find('.staging-input');
      await input.setValue('Acme Global LLC');


      expect(wrapper.emitted('stateChange')).toBeDefined();

      // Agreement required for HIGH risk
      const confirmBtn = wrapper.find('.btn-staging-confirm');
      expect(confirmBtn.attributes('disabled')).toBeDefined();

      // Check the agreement box
      await wrapper.find('.agreement-label input').setValue(true);
      expect(confirmBtn.attributes('disabled')).toBeUndefined();

      // Submit confirmation
      await confirmBtn.trigger('click');
      expect(wrapper.emitted('submit')).toBeDefined();
      expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
        confirmed: true,
        actionId: 'tx-8831',
      });
    });
  });

  describe('Registry Integration', () => {
    it('should generate valid tool definitions for all ui-kit components', () => {
      const intentUI = createIntentUI({
        components: intentUIComponents,
      });

      const tools = intentUI.getToolsDefinition();
      expect(tools).toHaveLength(5);

      const toolNames = tools.map((t) => t.function.name);
      expect(toolNames).toContain('render_metric_card');
      expect(toolNames).toContain('render_data_table');
      expect(toolNames).toContain('render_form_wizard');
      expect(toolNames).toContain('render_confirmation_card');
      expect(toolNames).toContain('render_action_staging_card');
    });
  });
});

