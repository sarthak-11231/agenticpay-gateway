# AgenticPay Gateway 🛡️💳

### Bounded Autonomous Commerce Engine & Financial Guardrail Gateway
*Built for Track 01: Autonomous Commerce & Agentic Payments*

---

## 📌 Executive Summary

As autonomous AI agents begin executing commercial transactions, granting Large Language Models (LLMs) direct execution authority over financial payment gateways creates catastrophic enterprise risks: **adversarial prompt injections, arbitrary discount hallucinations, negative pricing exploits, and race-condition inventory drains.**

**AgenticPay Gateway** resolves this through an immutable, zero-trust architecture. Instead of allowing Gemini to trigger payment endpoints directly, an immutable, deterministic TypeScript bounding engine sits between the conversational model and Razorpay. The LLM provides natural negotiation intelligence, but only the deterministic code gatekeeper holds the cryptographic authority to validate catalog invariant rules, sign payloads via HMAC-SHA256, and trigger financial settlement.

---

## 🧱 Architectural Topology

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          BUYER / ADVERSARY LAYER                       │
│  (Human Shopper / Autonomous Buyer Agent / Red-Team Injection Script)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Natural Language / REST Bids
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      CONVERSATIONAL INTELLIGENCE                       │
│                Google Gemini 2.5 Multi-Turn Reasoner                   │
│   • Semantic negotiation context    • High-margin upsell detection     │
│   • Catalog semantic grounding      • AI Flash Campaign synthesis      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Proposed Transaction Intent
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               DETERMINISTIC BOUNDING ENGINE (ZERO-TRUST)               │
│                     TypeScript Invariant Enforcement                   │
│   [✓] RULE_SKU_EXISTS       ➔ Validates against active catalog         │
│   [✓] RULE_STOCK_AVAILABLE  ➔ Prevents inventory DoS / exhaustion      │
│   [✓] RULE_PRICE_FLOOR      ➔ Blocks negative pricing & deep cuts      │
│   [✓] RULE_MAX_DISCOUNT     ➔ Enforces dynamic merchant discount cap   │
│   [✓] RULE_MAX_ORDER_CAP    ➔ Restricts session risk limits            │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ BLOCKED (Violates Policy)       │ PASSED (Compliant)
                   ▼                                 ▼
         ┌───────────────────┐             ┌───────────────────┐
         │   403 Forbidden   │             │ AP2 Cryptographic │
         │  Execution Halted │             │ HMAC-SHA256 Sign  │
         └───────────────────┘             └─────────┬─────────┘
                                                     │ Verified Payload
                                                     ▼
                                           ┌───────────────────┐
                                           │  Razorpay Gateway │
                                           │Live Testnet Capture│
                                           └─────────┬─────────┘
                                                     │ Settlement Success
                                                     ▼
                                           ┌───────────────────┐
                                           │ Dynamic Inventory │
                                           │ Decrement Engine  │
                                           └───────────────────┘
```

---

## 🚀 Key Platform Features

### 1. Dynamic Merchant Policy Guardrails
* Store operators configure hard discount ceilings (e.g., 10%–25% max) and session risk caps via a dynamic slider drawer.
* Policy changes propagate instantly across evaluation routes, preventing AI hallucination or over-discounting.

### 2. Autonomous Upsell & Cross-Sell Engine
* Rather than acting as a passive order taker, Gemini inspects catalog margins when a primary deal is struck.
* Automatically synthesizes high-margin bundles (e.g., pairing Sony XM5 headphones with an Anker 67W GaN charger).
* Acceptance dynamically re-evaluates total cart value against policy floors before expanding basket size.

### 3. Red-Team Threat Matrix (5-Vector Audit)
* Built-in security audit suite testing five concurrent attack classes:
  * **CWE-77:** System Prompt Overrides & Jailbreaks (e.g., AirPods @ ₹500).
  * **CWE-190:** Integer Underflow & Negative Pricing.
  * **CWE-400:** Inventory Exhaustion / Stock Draining Denial of Service.
  * **Catalog Hallucination:** Injections proposing unlisted dummy SKUs.
  * **Ceiling Breaches:** Micro-discounts exceeding configured merchant caps.
* Blocks 100% of malicious vectors deterministically with `<2ms` evaluation latency.

### 4. Autonomous Agent-to-Agent (A2A) Commerce
* Machine-to-machine negotiation where an autonomous Buyer Agent and Merchant Agent negotiate multi-round bids until reaching an equilibrium price compliant with merchant margins.

### 5. AP2 Cryptographic Non-Repudiation
* Generates an **HMAC-SHA256** cryptographic digest for every approved transaction payload (`sku`, `price`, `buyerId`, `timestamp`).
* Merchants and buyers can download signed `.json` AP2 Audit Receipts for tamper-proof dispute resolution.

### 6. AI Flash Campaign Orchestrator
* In one click, Gemini scans physical inventory quantities to locate surplus stock and generates targeted promotional copy bounded strictly by merchant policy.

---

## 🛠️ Tech Stack

* **Framework:** Next.js 14 / 15 (App Router, Server Actions, TypeScript)
* **Styling:** Tailwind CSS (Custom Editorial Parchment / High-Contrast Theme)
* **LLM Engine:** Google Gemini 2.5 Flash via `@google/genai` SDK
* **Payment Processing:** Razorpay Native Web Checkout & Node SDK
* **Cryptography:** Web Crypto API (`HMAC-SHA256`)

---

## 📦 Getting Started

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/sarthak-11231/agenticpay-gateway.git
cd agenticpay-gateway
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the project root:
```env
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Razorpay Testnet Credentials
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id

# Security Signing Secret
HMAC_SECRET_KEY=agenticpay_super_secret_audit_key_2026
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Quick Test Scenarios

1. **Compliant Flow:** In the Sandbox chat, enter *"Can I get 1 Sony XM5 for ₹27500?"* ➔ Evaluates as **`PASSED`**.
2. **Adversarial Flow:** Click the preset chip *"Prompt Injection (AirPods @ ₹500)"* ➔ Intercepted as **`BLOCKED`**.
3. **Automated Audit:** Switch to **Threat Matrix** ➔ Click *"Run 5-Vector Penetration Audit"* ➔ **5/5 BLOCKED** (`<2ms` defense speed).
4. **Autonomous A2A:** Switch to **Autonomous A2A** ➔ Click *"Execute A2A Multi-Round Loop"* ➔ Autonomous agent dialogue settles on compliant price with instant Razorpay authorization.
5. **Checkout & Decrement:** Authorize order ➔ Complete Razorpay test modal ➔ Live stock counter drops immediately.
