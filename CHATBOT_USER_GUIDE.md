# BOTica Chatbot User Guide

## 🤖 Overview

BOTica is an intelligent pharmacy assistant chatbot designed specifically for **internal use by licensed pharmacists and pharmacy staff** in the Philippines. It provides accurate, compliant, and professional information to support clinical decision-making and inventory management.

## 🎯 Purpose & Scope

### ✅ What BOTica Can Do

- **Inventory Management**: Check stock levels, prices, and expiry dates
- **Drug Information**: Provide educational content from trusted medical sources
- **OTC Guidance**: Offer general dosage ranges for over-the-counter medications
- **Prescription Compliance**: Block inappropriate dosage requests for prescription drugs
- **Clinical Support**: Assist with drug classifications and basic pharmaceutical information
- **Session Awareness**: Remember recent drug queries for contextual follow-ups
- **Missing Information Handling**: Categorized responses for stock vs clinical data gaps

### ❌ What BOTica Cannot Do

- Provide specific dosage instructions for prescription medications
- Replace professional medical judgment
- Diagnose medical conditions
- Prescribe medications
- Provide customer-facing medical advice
- Answer non-pharmacy related questions (redirects professionally)

---

## 📱 How to Use the Chatbot

### Accessing the Chatbot

1. Log in to your BOTica pharmacy management system
2. Navigate to the chatbot interface (usually visible as a chat icon)
3. Start typing your query in the chat input field

### Basic Query Types

#### 1. **Inventory Queries**

```
"Do we have paracetamol in stock?"
"What's the price of amoxicillin 500mg?"
"Show me biogesic stock levels"
"When does our ibuprofen expire?"
```

**Expected Response Format:**

```
Paracetamol 500mg: 147 units at ₱4.25 (exp: March 15, 2026).

---
Sources: BOTica Inventory
```

#### 2. **OTC Medication Dosage** ✅ ALLOWED

```
"What's the dosage for paracetamol?"
"How much ibuprofen for adults?"
"Dosage for vitamin C tablets?"
```

**Expected Response Format:**

```
Paracetamol 500mg: Adult 500mg-1g every 4-6 hours, max 4g/day.
Pediatric: 10-15mg/kg every 4-6 hours. Do not exceed recommended dose.
Consult healthcare professional before use.

📦 Stock: Biogesic (147 units at ₱4.25), Panadol (64 units at ₱6.25).

---
Sources: BOTica Inventory, OpenFDA
```

#### 3. **Prescription Medication Queries** 🔴 DOSAGE BLOCKED

```
"What's the dosage for amoxicillin?" ❌ BLOCKED
"How much metformin should I give?" ❌ BLOCKED
"Dosage for antibiotics?" ❌ BLOCKED
```

**Expected Response Format:**

```
Amoxicillin 500mg is prescription-only medication. Cannot provide dosage
without valid physician prescription. Commonly prescribed for bacterial
infections. Prescription required from physician.

📦 Inventory: Amoxicillin 500mg — 47 units at ₱11.75 (exp: February 10, 2027).

---
Sources: BOTica Inventory, OpenFDA
```

#### 4. **Drug Information Queries**

```
"What is metformin used for?"
"Side effects of ibuprofen?"
"What are the indications for amoxicillin?"
```

#### 5. **Inventory + Clinical Combination**

````
"Stock and dosage for paracetamol"
"Price and usage of vitamin C"
"```
"Availability and side effects of ibuprofen"
````

#### 6. **Out-of-Scope Queries** 🚫 REDIRECTED

```
"What's the weather today?" ❌ OUT OF SCOPE
"How are you feeling?" ❌ OUT OF SCOPE
"Can you diagnose my symptoms?" ❌ OUT OF SCOPE
"Tell me about politics" ❌ OUT OF SCOPE
```

**Expected Response Format:**

```
I'm a pharmacy assistant focused on medication inventory and drug information.
How can I help you with pharmacy-related questions today?

I can help with:
• Stock levels and pricing
• OTC medication guidance
• Drug information and classifications
• Inventory management

---
Sources: BOTica System
```

---

## 🏥 Compliance & Safety Features"

```

---

## 🏥 Compliance & Safety Features

### Prescription Drug Compliance

- **Strict Blocking**: Never provides dosage for prescription medications
- **Educational Only**: Provides indication, side effects, and storage information
- **Clear Messaging**: Always states "Prescription required from physician"
- **Legal Protection**: Ensures pharmacy stays compliant with regulations

### OTC Drug Guidelines

- **General Ranges**: Provides standard adult dosage ranges
- **Pediatric Guidance**: Includes weight-based recommendations when appropriate
- **Safety Warnings**: Always includes maximum daily limits and precautions
- **Professional Disclaimer**: Requires healthcare professional consultation

### Source Verification

- **Trusted Sources Only**: BOTica Inventory, OpenFDA, MedlinePlus, RxNorm, MIMS Philippines
- **Clear Attribution**: Every response shows exact sources used
- **No Hallucination**: Strict controls prevent made-up information

### Advanced Attribution Rules

- **Single Source per Sentence**: Each sentence traces to exactly one source
- **No Source Blending**: Different sources are presented as separate statements
- **Conflict Handling**: When sources disagree, both viewpoints are shown separately
- **Local Context**: Philippine sources (MIMS Philippines, FDA Philippines) are added separately when available
- **Confirmation Rule**: When multiple sources agree, only one is cited to avoid redundancy

**Example of Conflicting Sources:**

```

OpenFDA states: Adult dose 500mg every 6 hours.
MIMS Philippines states: Adult dose 250mg every 4 hours for local formulations.

---

Sources: OpenFDA, MIMS Philippines

```

---

## 📋 Response Templates

### Template 1: Inventory Only

```

[Product Name]: [Quantity] units at ₱[Price] (exp: [Date]).

---

Sources: BOTica Inventory

```

### Template 2: OTC Medication

```

[Drug Name]: Adult [dose] every [frequency], max [daily limit].
Pediatric: [weight-based dosing]. [Safety warning].
Consult healthcare professional before use.

📦 [Stock Information]

---

Sources: BOTica Inventory, [External Source]

```

### Template 3: Prescription Drug (Blocked)

```

[Drug Name] is prescription-only medication. Cannot provide dosage
without valid physician prescription. [Indication].
Prescription required from physician.

📦 [Stock Information]

---

Sources: BOTica Inventory, [External Source]

```

### Template 4: No Information Available

```

I don't have that information right now.

---

Sources: BOTica Inventory

```

---

## 🚨 Important Guidelines for Staff

### ✅ DO Use BOTica For:

- Quick inventory checks during busy periods
- Refreshing memory on OTC dosage ranges
- Verifying drug classifications (OTC vs Prescription)
- Getting basic drug information from reliable sources
- Checking stock levels and expiry dates
- Educational reference for common medications

### ❌ DON'T Use BOTica For:

- Customer-facing medical advice
- Prescription dosage decisions (always consult prescribing physician)
- Replacing professional pharmaceutical judgment
- Complex drug interaction analysis
- Patient-specific medical recommendations
- Emergency medical situations

### 🔐 Professional Responsibilities

- **Always verify**: Cross-check critical information with official sources
- **Professional judgment**: Use your licensed expertise for final decisions
- **Patient safety**: Never rely solely on chatbot for prescription medications
- **Documentation**: Maintain proper pharmaceutical records as required
- **Compliance**: Follow all local pharmacy regulations and guidelines

---

## 🎯 Optimization Tips

### Getting Better Results

1. **Be Specific**: Include drug name, strength, and form when possible

   - Good: "paracetamol 500mg tablet dosage"
   - Avoid: "pain medicine dosage"

2. **Use Standard Names**: Use generic or common brand names

   - Good: "paracetamol" or "biogesic"
   - Avoid: "that fever medicine"

3. **Single Focus**: Ask one question at a time for clearest results

   - Good: "stock level for amoxicillin 500mg"
   - Avoid: "tell me everything about amoxicillin"

4. **Professional Terms**: Use pharmacy terminology
   - Good: "indications", "contraindications", "dosage form"
   - Avoid: "what's it for", "how bad is it"

### Understanding Responses

- **Concise Format**: Responses are deliberately brief and factual
- **Source Attribution**: Always check the sources listed at bottom
- **Professional Language**: Uses clinical terminology familiar to pharmacists
- **Compliance First**: Safety and legal compliance prioritized over convenience

---

## 🔧 Troubleshooting

### Common Issues & Solutions

#### "I don't have that information right now"

**Cause**: Information not available in BOTica's approved sources
**Solution**:

- Try rephrasing with generic drug name
- Check official pharmaceutical references manually
- Verify product exists in your inventory system

#### Chatbot provides general info instead of specific dosage

**Cause**: Product classified as prescription medication
**Solution**: This is correct behavior - consult prescribing physician for prescription dosages

#### Response seems too brief

**Cause**: BOTica uses strict templates to prevent over-answering
**Solution**: This is intentional - ask follow-up questions if more detail needed

#### Chatbot says "I'm a pharmacy assistant focused on medication inventory..."

**Cause**: Query was detected as out-of-scope (non-pharmacy related)
**Solution**: This is correct behavior - rephrase your question to focus on:
- Medication names, stock, or pricing
- Drug information or dosage guidance
- Pharmacy inventory management
**Examples**: Instead of "How are you?" ask "Do we have paracetamol in stock?"

#### Different sources show conflicting information

**Cause**: Legitimate differences between international and local sources
**Solution**: This is intentional behavior - BOTica shows both viewpoints separately
**Example**: "OpenFDA states X. MIMS Philippines states Y."
**Action**: Use professional judgment to determine which applies to your situation

#### Stock information doesn't match current inventory

**Cause**: Database sync delay or product name mismatch
**Solution**:

- Verify product name spelling
- Check inventory system directly
- Report persistent discrepancies to system administrator

---

## 📞 Support & Maintenance

### For Technical Issues

- Contact your BOTica system administrator
- Report any inaccurate information immediately
- Document any compliance concerns

### Regular Best Practices

- Use chatbot as supplementary tool, not primary reference
- Maintain professional pharmaceutical standards
- Keep BOTica system updated with current inventory
- Review responses for accuracy before acting

### Training Recommendations

- New staff should shadow experienced pharmacists using BOTica
- Regular review of compliance guidelines
- Periodic training updates as system evolves

---

## 🧠 Advanced Features

### Session Awareness

BOTica remembers your recent drug queries within the conversation session:

```

You: "paracetamol dosage"
BOTica: [Provides OTC dosage info]

You: "side effects"
BOTica: [Provides side effects for paracetamol - remembers context]

```

**Session Memory Includes:**
- Last mentioned drug name
- Recent drug queries
- Contextual follow-up detection

### Missing Information Handling

BOTica provides specific responses for different types of missing information:

#### Stock Data Missing
```

"This product is not in the current BOTica inventory."

---

Sources: BOTica Inventory

```

#### Clinical Data Missing
```

"Clinical details for this drug are not available from approved sources."

---

Sources: OpenFDA, MedlinePlus

```

### Out-of-Scope Detection

BOTica automatically detects and redirects non-pharmacy queries:

**Triggers out-of-scope response:**
- Greetings without context ("hi", "hello")
- Non-pharmacy topics (weather, sports, politics)
- Personal health advice requests
- System/technical questions
- Gibberish or test inputs

**Professional Redirection:**
```

I'm a pharmacy assistant. How can I help with medication inventory or drug information today?

---

Sources: BOTica System

```

Sources: BOTica System

```

---

## 📚 Quick Reference Card

| Query Type               | Example                            | Expected Response                        |
| ------------------------ | ---------------------------------- | ---------------------------------------- |
| **Inventory**            | "biogesic stock"                   | Stock levels, price, expiry              |
| **OTC Dosage**           | "paracetamol dosage"               | General ranges + disclaimers             |
| **Prescription Dosage**  | "amoxicillin dosage"               | ❌ BLOCKED + education only              |
| **Drug Info**            | "what is metformin for"            | Indications from trusted sources         |
| **Combination**          | "paracetamol stock and dosage"     | Inventory + OTC guidance                 |
| **Contextual Follow-up** | "side effects" (after drug query)  | Context-aware response                   |
| **Missing Stock**        | "aspirin 100mg" (not in inventory) | "Not in current BOTica inventory"        |
| **Missing Clinical**     | "rare drug indications"            | "Clinical details not available"         |
| **Out-of-Scope**         | "what's the weather?"              | 🚫 REDIRECTED + help menu                |
| **Greetings**            | "hello" (no context)               | 🚫 REDIRECTED + pharmacy assistance menu |

---

## ⚖️ Legal & Compliance Notice

**IMPORTANT**: BOTica is designed for internal pharmacy staff use only. All information provided should be verified through appropriate professional channels. This system does not replace licensed pharmaceutical expertise or official prescribing guidelines. Always follow local pharmacy regulations and professional standards.

---

_Last Updated: September 2025_
_Version: 1.0_
_For: Internal Pharmacy Staff Use Only_

```

```
