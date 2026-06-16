import type { StorefrontProductCard } from '@/server/storefront/types';

import selectorRulesData from './selector-rules.json';

export type SelectorOption = {
  value: string;
  label: string;
  description?: string;
};

export type SelectorProductRule = {
  productId: string;
  motorType: string;
  industries: string[];
  categories: string[];
  torqueNcm: number;
  peakTorqueNcm: number;
  speedRpm: number;
  frameSize: number;
  shaft: string;
  mounting: string;
  orientation: string;
  temperature: string;
  ipRating: string;
  supplyVoltage: number;
  currentLimit: number;
  driverIncluded: boolean;
  communication: string[];
  feedback: string;
  resolution: string;
  brake: boolean;
  tierHint: string;
  reasonTags: string[];
  keyParameters: Array<{ label: string; value: string }>;
};

type SelectorRules = {
  tips: string[];
  options: {
    motorTypes: SelectorOption[];
    industries: SelectorOption[];
    frameSizes: SelectorOption[];
    shafts: SelectorOption[];
    mountings: SelectorOption[];
    orientations: SelectorOption[];
    temperatures: SelectorOption[];
    ipRatings: SelectorOption[];
    communications: SelectorOption[];
    feedbackModes: SelectorOption[];
    resolutionOptions: SelectorOption[];
  };
  products: SelectorProductRule[];
};

export type SelectorFormState = {
  motorType: string;
  industries: string[];
  requiredTorque: string;
  torqueUnit: 'Ncm' | 'Nm';
  peakTorque: string;
  requiredSpeed: string;
  frameSizeMin: string;
  frameSizeMax: string;
  shaft: string;
  mounting: string;
  orientation: string;
  temperature: string;
  ipRating: string;
  supplyVoltage: string;
  currentLimit: string;
  driverIncluded: 'any' | 'yes' | 'no';
  communication: string[];
  feedback: 'any' | 'open-loop' | 'encoder' | 'closed-loop';
  resolution: string;
  brake: 'any' | 'yes' | 'no';
};

export type SelectorMatchResult = {
  product: StorefrontProductCard;
  rule: SelectorProductRule;
  score: number;
  exact: boolean;
  reasons: string[];
};

export const selectorRules = selectorRulesData as SelectorRules;
export const selectorSteps = ['Application', 'Mechanical', 'Electrical', 'Feedback', 'Results'] as const;
export const SELECTOR_STORAGE_KEY = 'vexmotor-selector-scenario';

const selectorOptionMap = new Map(
  Object.values(selectorRules.options)
    .flat()
    .map((option) => [option.value, option]),
);

function readNumeric(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeArray(values: unknown) {
  if (!Array.isArray(values)) {
    return [] as string[];
  }

  return Array.from(new Set(values.map((value) => String(value).trim()).filter(Boolean)));
}

function normalizeCategory(category?: string | null) {
  switch ((category ?? '').trim().toLowerCase()) {
    case 'stepper':
    case 'bldc':
    case 'servo':
    case 'gearmotor':
    case 'linear-actuator':
      return (category ?? '').trim().toLowerCase();
    default:
      return 'help-me-decide';
  }
}

function scoreByNumericRequirement(required: number | null, actual: number, fullScore: number) {
  if (!required) {
    return 0;
  }

  const ratio = actual / required;
  if (ratio >= 1) {
    return fullScore;
  }

  if (ratio >= 0.85) {
    return Math.round(fullScore * 0.7);
  }

  if (ratio >= 0.65) {
    return Math.round(fullScore * 0.35);
  }

  return 0;
}

function scoreByTolerance(required: number | null, actual: number, fullScore: number) {
  if (!required) {
    return 0;
  }

  const differenceRatio = Math.abs(actual - required) / Math.max(required, 1);
  if (differenceRatio <= 0.1) {
    return fullScore;
  }

  if (differenceRatio <= 0.25) {
    return Math.round(fullScore * 0.7);
  }

  if (differenceRatio <= 0.4) {
    return Math.round(fullScore * 0.4);
  }

  return 0;
}

function toTorqueNcm(value: string, unit: SelectorFormState['torqueUnit']) {
  const parsed = readNumeric(value);
  if (!parsed) {
    return null;
  }

  return unit === 'Nm' ? parsed * 100 : parsed;
}

function encodeBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return globalThis.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = globalThis.atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function createDefaultSelectorState(input?: { category?: string | null; scenario?: Partial<SelectorFormState> | null }) {
  return {
    motorType: normalizeCategory(input?.category),
    industries: [],
    requiredTorque: '',
    torqueUnit: 'Ncm' as const,
    peakTorque: '',
    requiredSpeed: '',
    frameSizeMin: '',
    frameSizeMax: '',
    shaft: 'any',
    mounting: 'any',
    orientation: 'any',
    temperature: 'any',
    ipRating: 'any',
    supplyVoltage: '',
    currentLimit: '',
    driverIncluded: 'any' as const,
    communication: [],
    feedback: 'any' as const,
    resolution: 'any',
    brake: 'any' as const,
    ...(input?.scenario ? normalizeSelectorScenario(input.scenario) : {}),
  };
}

export function normalizeSelectorScenario(input: Partial<SelectorFormState>) {
  return {
    motorType: normalizeCategory(input.motorType),
    industries: normalizeArray(input.industries),
    requiredTorque: String(input.requiredTorque ?? '').trim(),
    torqueUnit: input.torqueUnit === 'Nm' ? 'Nm' : 'Ncm',
    peakTorque: String(input.peakTorque ?? '').trim(),
    requiredSpeed: String(input.requiredSpeed ?? '').trim(),
    frameSizeMin: String(input.frameSizeMin ?? '').trim(),
    frameSizeMax: String(input.frameSizeMax ?? '').trim(),
    shaft: String(input.shaft ?? 'any').trim() || 'any',
    mounting: String(input.mounting ?? 'any').trim() || 'any',
    orientation: String(input.orientation ?? 'any').trim() || 'any',
    temperature: String(input.temperature ?? 'any').trim() || 'any',
    ipRating: String(input.ipRating ?? 'any').trim() || 'any',
    supplyVoltage: String(input.supplyVoltage ?? '').trim(),
    currentLimit: String(input.currentLimit ?? '').trim(),
    driverIncluded: input.driverIncluded === 'yes' || input.driverIncluded === 'no' ? input.driverIncluded : 'any',
    communication: normalizeArray(input.communication),
    feedback: input.feedback === 'open-loop' || input.feedback === 'encoder' || input.feedback === 'closed-loop' ? input.feedback : 'any',
    resolution: String(input.resolution ?? 'any').trim() || 'any',
    brake: input.brake === 'yes' || input.brake === 'no' ? input.brake : 'any',
  } satisfies SelectorFormState;
}

export function decodeSelectorScenario(encoded?: string | null) {
  if (!encoded) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(encoded)) as Partial<SelectorFormState>;
    return normalizeSelectorScenario(parsed);
  } catch {
    return null;
  }
}

export function encodeSelectorScenario(state: SelectorFormState) {
  return encodeBase64Url(JSON.stringify(normalizeSelectorScenario(state)));
}

export function getSelectorOptionLabel(value: string) {
  return selectorOptionMap.get(value)?.label ?? value;
}

export function getSelectorSummaryItems(state: SelectorFormState) {
  const items: Array<{ label: string; value: string; stepIndex: number }> = [];

  if (state.motorType && state.motorType !== 'help-me-decide') {
    items.push({ label: 'Motor type', value: getSelectorOptionLabel(state.motorType), stepIndex: 0 });
  }

  if (state.industries.length) {
    items.push({ label: 'Industries', value: state.industries.map(getSelectorOptionLabel).join(', '), stepIndex: 0 });
  }

  if (state.requiredTorque) {
    items.push({ label: 'Torque', value: `${state.requiredTorque} ${state.torqueUnit}`, stepIndex: 1 });
  }

  if (state.requiredSpeed) {
    items.push({ label: 'Speed', value: `${state.requiredSpeed} rpm`, stepIndex: 1 });
  }

  if (state.frameSizeMin || state.frameSizeMax) {
    items.push({ label: 'Frame range', value: `${state.frameSizeMin || 'Any'} - ${state.frameSizeMax || 'Any'}`, stepIndex: 1 });
  }

  if (state.supplyVoltage) {
    items.push({ label: 'Supply', value: `${state.supplyVoltage} V`, stepIndex: 2 });
  }

  if (state.communication.length) {
    items.push({ label: 'Communication', value: state.communication.map(getSelectorOptionLabel).join(', '), stepIndex: 2 });
  }

  if (state.feedback !== 'any') {
    items.push({ label: 'Feedback', value: getSelectorOptionLabel(state.feedback), stepIndex: 3 });
  }

  if (state.resolution !== 'any') {
    items.push({ label: 'Resolution', value: getSelectorOptionLabel(state.resolution), stepIndex: 3 });
  }

  return items;
}

export function matchSelectorProducts(products: StorefrontProductCard[], state: SelectorFormState) {
  const productsById = new Map(products.map((product) => [product.id, product]));
  const requiredTorque = toTorqueNcm(state.requiredTorque, state.torqueUnit);
  const requiredPeakTorque = toTorqueNcm(state.peakTorque, state.torqueUnit);
  const requiredSpeed = readNumeric(state.requiredSpeed);
  const requiredVoltage = readNumeric(state.supplyVoltage);
  const requiredCurrent = readNumeric(state.currentLimit);
  const frameMin = readNumeric(state.frameSizeMin);
  const frameMax = readNumeric(state.frameSizeMax);

  return selectorRules.products
    .map((rule) => {
      const product = productsById.get(rule.productId);
      if (!product) {
        return null;
      }

      let score = 10;
      const reasons: string[] = [];
      const pushReason = (value: string) => {
        if (value && !reasons.includes(value) && reasons.length < 4) {
          reasons.push(value);
        }
      };

      const motorTypeMatches = state.motorType === 'help-me-decide' || state.motorType === rule.motorType;
      if (state.motorType === 'help-me-decide') {
        score += 12;
      } else if (motorTypeMatches) {
        score += 28;
        pushReason(getSelectorOptionLabel(rule.motorType));
      } else if (state.motorType === 'servo' && rule.motorType === 'stepper' && rule.feedback !== 'open-loop') {
        score += 8;
      }

      const overlappingIndustries = state.industries.filter((industry) => rule.industries.includes(industry));
      if (overlappingIndustries.length) {
        score += Math.min(overlappingIndustries.length * 6, 12);
        pushReason(getSelectorOptionLabel(overlappingIndustries[0]!));
      }

      const torqueScore = scoreByNumericRequirement(requiredTorque, rule.torqueNcm, 16);
      score += torqueScore;
      if (torqueScore >= 10) {
        pushReason(`${rule.torqueNcm} N·cm torque`);
      }

      const peakTorqueScore = scoreByNumericRequirement(requiredPeakTorque, rule.peakTorqueNcm, 8);
      score += peakTorqueScore;

      const speedScore = scoreByNumericRequirement(requiredSpeed, rule.speedRpm, 10);
      score += speedScore;
      if (speedScore >= 7) {
        pushReason(`${rule.speedRpm} rpm capability`);
      }

      if ((!frameMin || rule.frameSize >= frameMin) && (!frameMax || rule.frameSize <= frameMax)) {
        if (frameMin || frameMax) {
          score += 8;
          pushReason(`${rule.frameSize} frame fit`);
        }
      }

      if (state.shaft !== 'any' && state.shaft === rule.shaft) {
        score += 4;
      }

      if (state.mounting !== 'any' && state.mounting === rule.mounting) {
        score += 4;
      }

      if (state.orientation !== 'any' && (state.orientation === rule.orientation || rule.orientation === 'any')) {
        score += 4;
      }

      if (state.temperature !== 'any' && state.temperature === rule.temperature) {
        score += 3;
      }

      if (state.ipRating !== 'any' && state.ipRating === rule.ipRating) {
        score += 3;
      }

      const voltageScore = scoreByTolerance(requiredVoltage, rule.supplyVoltage, 6);
      score += voltageScore;
      if (voltageScore >= 4) {
        pushReason(`${rule.supplyVoltage} V supply fit`);
      }

      score += scoreByTolerance(requiredCurrent, rule.currentLimit, 4);

      if (state.driverIncluded !== 'any' && (state.driverIncluded === 'yes') === rule.driverIncluded) {
        score += 4;
      }

      const overlappingCommunication = state.communication.filter((value) => rule.communication.includes(value));
      if (overlappingCommunication.length) {
        score += Math.min(overlappingCommunication.length * 3, 6);
        pushReason(getSelectorOptionLabel(overlappingCommunication[0]!));
      }

      if (state.feedback !== 'any' && state.feedback === rule.feedback) {
        score += 8;
        pushReason(getSelectorOptionLabel(rule.feedback));
      }

      if (state.resolution !== 'any' && state.resolution === rule.resolution) {
        score += 4;
      }

      if (state.brake !== 'any' && (state.brake === 'yes') === rule.brake) {
        score += 3;
      }

      if (!reasons.length) {
        for (const reasonTag of rule.reasonTags) {
          pushReason(reasonTag);
        }
      }

      const exact = score >= 72 && motorTypeMatches && (!requiredTorque || rule.torqueNcm >= requiredTorque * 0.8) && (!requiredSpeed || rule.speedRpm >= requiredSpeed * 0.75);

      return {
        product,
        rule,
        score: Math.min(99, Math.max(14, score)),
        exact,
        reasons,
      } satisfies SelectorMatchResult;
    })
    .filter((match): match is SelectorMatchResult => Boolean(match))
    .sort((left, right) => right.score - left.score || left.product.name.localeCompare(right.product.name));
}