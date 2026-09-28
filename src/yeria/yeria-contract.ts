export const YERIA_CONTRACT_VERSION = '1.0.0';
export const YERIA_API_PREFIX = '/api/v1/yeria';
export const YERIA_LEGACY_PREFIX = '/yeria';

export const YERIA_CONTRACT = {
  name: 'Klinzo Yeria API',
  version: YERIA_CONTRACT_VERSION,
  status: 'stable',
  canonicalBasePath: YERIA_API_PREFIX,
  legacyBasePath: YERIA_LEGACY_PREFIX,
  authentication: {
    publicDiscovery: 'optional Bearer token',
    subscriberData: 'Yeria public-service Bearer token required',
    agentOperations: 'Yeria agent-service Bearer token required',
  },
  deprecationPolicy: {
    noticeDays: 90,
    rule: 'Une modification incompatible exige une nouvelle version majeure du chemin.',
  },
  documentation: '/api/docs',
} as const;
