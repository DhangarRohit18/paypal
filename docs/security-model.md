# PAYPAL AEGIS SECURITY ARCHITECTURE & THREAT MODEL

## 1. Core Threat Vectors & Defenses

| Threat Vector | Attack Scenario | AEGIS Defense Layer | Deterministic Action |
|---|---|---|---|
| **Prompt Injection** | Malicious seller injects instructions into product descriptions commanding agent to capture funds. | `AEGIS_INPUT_SCANNER` | Pattern scanner quarantines and redacts malicious phrases before LLM context injection. |
| **Budget Limit Bypass** | Adversary attempts to add high-cost items exceeding spending envelope. | `AEGIS_TOOL_GATEWAY` | Deterministic `SpendingGuard` rejects item; AI model cannot override code. |
| **Cart Tampering** | User or script modifies cart line items after signing authorization mandate. | `AEGIS_PAYMENT_FINGERPRINT` | Cart version mismatch detected; prior cryptographic mandate permanently invalidated. |
| **Replay Attacks** | Attacker attempts to capture payment twice using previously authorized mandate. | `AEGIS_PAYMENT_FINGERPRINT` | Single-use flag (`usedAt`) checked; duplicate calls blocked with `MANDATE_ALREADY_USED`. |
| **Mandate Expiration** | Attacker attempts to use stale approval mandate. | `AEGIS_PAYMENT_FINGERPRINT` | 15-minute TTL enforced; calls past window return `MANDATE_EXPIRED`. |
| **Price Spoofing** | Compromised browser attempts to send `$1.00` total in HTTP request. | `AEGIS_TOOL_GATEWAY` | Client-submitted totals are ignored; prices are pulled directly from server catalogue. |
| **System Compromise** | Abnormal autonomous agent behavior or suspicious activity spike. | `AEGIS_KILL_SWITCH` | Instant global halt of cart operations, passport generation, and payment execution. |

---

## 2. Cryptographic Mandate Specification

The HMAC-SHA256 Signed Approval Mandate is calculated as follows:
```typescript
const sortedPayload = {
  cartVersion: data.cartVersion,
  createdAt: data.createdAt,
  currency: data.currency,
  finalTotal: Number(data.finalTotal.toFixed(2)),
  itemCount: data.itemCount,
  passportId: data.passportId,
  userId: data.userId
};

const canonicalJson = JSON.stringify(sortedPayload);
const fingerprint = crypto.createHmac('sha256', HMAC_SECRET)
  .update(canonicalJson)
  .digest('hex');
```

Any modification to any field in the order results in an avalanche effect in the SHA-256 digest, preventing unauthorized modifications.

