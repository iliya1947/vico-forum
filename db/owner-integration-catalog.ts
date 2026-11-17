import type {RequiredLocalizationRead} from "../app/observability/integration-runtime";
import type {RetainedStorageSample} from "./owner-file-monitoring";
import type {SystemOverview} from "./owner-system-monitoring";
import type {SafePayload} from "./owner-system-history";
export const INTEGRATION_MONITOR_KEYS=['integrations.database','integrations.authentication','integrations.storage','integrations.translation'] as const;
export type IntegrationMonitorKey=typeof INTEGRATION_MONITOR_KEYS[number];
export type IntegrationValues=Record<string,string|number|boolean|null>;
export interface RetainedIntegrationFact {id:string;occurredAt:string;kind:string;source:string;values:IntegrationValues}
export interface IntegrationCurrentMonitor {
  key:IntegrationMonitorKey;schemaVersion:1;source:'application';quality:'measured';observedAt:string;values:IntegrationValues;
  recording:'available'|'unavailable';coverageFrom:string|null;lastObservedAt:string|null;
}
export interface OwnerIntegrationsCurrent {
  monitors:IntegrationCurrentMonitor[];
  database:{observedAt:string;source:'existing-system-dependency-reader';quality:'measured'|'unavailable';values:SafePayload;recording:SystemOverview['recording'];
    retainedSample:null|{id:string;observedAt:string;source:'database';schemaVersion:1;quality:string;values:SafePayload}};
  requiredLocalizationRead:RequiredLocalizationRead|null;
  authentication:{source:'database';observedAt:string;values:IntegrationValues;googleMethodLink:RetainedIntegrationFact|null;genericSession:RetainedIntegrationFact|null};
  storageSamples:RetainedStorageSample[];
  translation:{taskOutcome:RetainedIntegrationFact|null;providerExecution:RetainedIntegrationFact|null};
}
