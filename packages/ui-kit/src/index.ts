import MetricCard, { intent as metricCardIntent } from './components/MetricCard.vue';
import DataTable, { intent as dataTableIntent } from './components/DataTable.vue';
import FormWizard, { intent as formWizardIntent } from './components/FormWizard.vue';
import ConfirmationCard, { intent as confirmationCardIntent } from './components/ConfirmationCard.vue';

export { MetricCard, metricCardIntent };
export { DataTable, dataTableIntent };
export { FormWizard, formWizardIntent };
export { ConfirmationCard, confirmationCardIntent };

/**
 * Pre-configured component registry map ready to pass into `createIntentUI({ components: intentUIComponents })`.
 */
export const intentUIComponents = {
  MetricCard: {
    component: MetricCard,
    description: metricCardIntent.description,
    schema: metricCardIntent.schema,
  },
  DataTable: {
    component: DataTable,
    description: dataTableIntent.description,
    schema: dataTableIntent.schema,
  },
  FormWizard: {
    component: FormWizard,
    description: formWizardIntent.description,
    schema: formWizardIntent.schema,
  },
  ConfirmationCard: {
    component: ConfirmationCard,
    description: confirmationCardIntent.description,
    schema: confirmationCardIntent.schema,
  },
};
