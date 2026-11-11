import { v4 as uuidv4 } from 'uuid';
import { ISecurityEvent } from '../../../shared/types.js';
import { store } from '../db/inMemoryStore.js';

// AEGIS Prompt Injection Patterns
const INJECTION_PATTERNS: Array<{ regex: RegExp; name: string }> = [
  { regex: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i, name: 'IGNORE_PREVIOUS_INSTRUCTIONS' },
  { regex: /disregard\s+(all\s+)?(prior|previous|safety|system)\s+(rules|prompts|instructions?)/i, name: 'DISREGARD_SAFETY' },
  { regex: /bypass\s+(the\s+)?(approval|budget|limit|passport|mandate|payment|aegis|security)/i, name: 'BYPASS_SECURITY_GATE' },
  { regex: /exceed\s+(the\s+)?(budget|spending\s+limit)/i, name: 'EXCEED_BUDGET' },
  { regex: /buy\s+immediately(\s+without\s+approval)?/i, name: 'UNAUTHORIZED_IMMEDIATE_PURCHASE' },
  { regex: /reveal\s+(private|secret|system|hidden|internal|credentials?|api\s*key)/i, name: 'CREDENTIAL_DATA_EXFIL' },
  { regex: /change\s+payment\s+(details|recipient|account)/i, name: 'PAYMENT_REDIRECT_TAMPER' },
  { regex: /execute\s+(an\s+)?(authorized\s+)?paypal\s+(capture|payment)/i, name: 'DIRECT_PAYPAL_EXECUTION_ATTEMPT' },
  { regex: /capture\s+(payment|order|funds)\s+now/i, name: 'DIRECT_CAPTURE_TRIGGER' },
  { regex: /override\s+(security|rules|policy|spending\s+guard)/i, name: 'OVERRIDE_GUARD_POLICY' },
  { regex: /system\s*instruction\s*:/i, name: 'SYSTEM_INSTRUCTION_SPOOF' },
  { regex: /you\s+are\s+now\s+(an?\s+)?unrestricted/i, name: 'ROLEPLAY_JAILBREAK' },
  { regex: /sudo\s+approve/i, name: 'PRIVILEGE_ESCALATION_SIMULATION' }
];

export interface InjectionCheckResult {
  safe: boolean;
  flaggedPhrases: string[];
  detectedPatterns: string[];
}

export function detectInjection(
  text: string,
  source: ISecurityEvent['source'] = 'user_input'
): InjectionCheckResult {
  const flaggedPhrases: string[] = [];
  const detectedPatterns: string[] = [];

  for (const { regex, name } of INJECTION_PATTERNS) {
    const match = text.match(regex);
    if (match) {
      flaggedPhrases.push(match[0]);
      detectedPatterns.push(name);
    }
  }

  const safe = flaggedPhrases.length === 0;

  if (!safe) {
    const event: ISecurityEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      eventType: 'PROMPT_INJECTION_DETECTED',
      source,
      severity: 'HIGH',
      payloadExcerpt: text.slice(0, 250),
      actionTaken: 'BLOCKED',
      defenceLayer: 'AEGIS_INPUT_SCANNER',
      remedySuggested: 'Untrusted input quarantined. Malicious directives neutralized before reaching agent context.'
    };
    store.addSecurityEvent(event);
  }

  return { safe, flaggedPhrases, detectedPatterns };
}

export function sanitizeForLLM(text: string): string {
  let sanitized = text;
  for (const { regex } of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(regex, '[CONTENT REDACTED BY AEGIS DEFENSE GATEWAY]');
  }
  return sanitized;
}

