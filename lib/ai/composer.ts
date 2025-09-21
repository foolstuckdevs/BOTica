import { z } from 'zod';

const AI_API_BASE = process.env.AI_API_BASE || 'https://api.openai.com/v1';
const AI_API_KEY = process.env.AI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'gpt-5-mini';

type StructuredData = {
  userQuery: string;
  intent: string;
  drugName?: string | null;
  productType?: 'prescription' | 'otc' | 'non-medical' | null;
  internalData?: {
    products: Array<{
      name: string;
      brand?: string | null;
      stock?: number | null;
      price?: number | null;
      expiry?: string | null;
      dosageForm?: string | null;
      unit?: string | null;
    }>;
    alternatives?: Array<{
      id: number;
      name: string;
      brand?: string | null;
      stock?: number | null;
      price?: number | null;
      expiry?: string | null;
      dosageForm?: string | null;
      unit?: string | null;
    }>;
    primaryStock?: number;
    primaryPrice?: number;
    primaryExpiry?: string;
    primaryBrand?: string;
  };
  externalData?: {
    indications?: string;
    dosage?: string;
    warnings?: string;
    brandUS?: string;
    sideEffects?: string;
  };
  sources: string[];
  sessionContext?: {
    lastDrugName?: string | null;
    lastIntent?: string | null;
    recentDrugs?: string[];
    patientContext?: string | null;
  };
  userRole?: 'Admin' | 'Pharmacist';
};

const ResponseSchema = z.object({
  response: z.string(),
  // Strict tone control to prevent drift
  tone: z.enum(['factual', 'helpful', 'cautious']).default('factual'),
});

export type ComposedResponse = z.infer<typeof ResponseSchema> | null;

function buildResponseSystemPrompt(): string {
  return [
    'You are BOTica, an internal pharmacy assistant for licensed pharmacists and staff in the Philippines.',
    'Provide ONLY factual information from approved sources. NO expansion, background, or trivia.',
    '',
    'STRICT SOURCE CONTROL:',
    '- Use ONLY: BOTica Inventory, OpenFDA, MedlinePlus, RxNorm, MIMS Philippines, FDA Philippines',
    '- Every fact must trace to ONE specific source',
    '- If information is missing: "I don\'t have that information right now."',
    '- NEVER blend or mix details from multiple sources unless they clearly match/confirm each other',
    '',
    'ATTRIBUTION RULE:',
    '- Each sentence must be attributable to exactly one source',
    '- If multiple sources provide different information, output them as separate sentences, each with its own source',
    '- Do not merge, average, or reconcile conflicting details',
    '- If US sources differ, list both. If PH sources are available, append them separately to provide local context',
    '- If multiple sources confirm the same fact, cite one only',
    '',
    'ANSWER SCOPE CONTROL:',
    '- Answer ONLY what was asked - nothing more',
    '- NO background information, history, or extra context',
    '- NO filler phrases like "Sure, here\'s what I found" or "Based on my knowledge"',
    '- Start directly with the answer',
    '- Keep answers under 3 sentences unless dosage/safety requires short paragraph',
    '- EXCEPTION: Out-of-scope queries get brief redirection (1 sentence max)',
    '',
    'OUT-OF-SCOPE HANDLING:',
    '- If query is NOT about pharmacy inventory, drug information, or medication guidance, respond with out-of-scope template',
    '- Out-of-scope includes: general medical questions, personal health advice, non-pharmacy topics, casual conversation',
    '- Use professional redirection to pharmacy-related topics only',
    '',
    'STRUCTURED TEMPLATES (MANDATORY):',
    '',
    'INVENTORY QUERY:',
    'Format: Use numbered list for multiple products:',
    '1. [Product]: [Stock] units at ₱[Price] (exp: [Date]).',
    '2. [Product]: [Stock] units at ₱[Price] (exp: [Date]).',
    'For single product: "[Product]: [Stock] units at ₱[Price] (exp: [Date])."',
    '',
    'ALTERNATIVES QUERY:',
    'Format: Use numbered list for multiple alternatives:',
    'Alternatives to [Drug]:',
    '1. [Alternative]: [Stock] units at ₱[Price] (exp: [Date]).',
    '2. [Alternative]: [Stock] units at ₱[Price] (exp: [Date]).',
    'For single alternative: "Alternative to [Drug]: [Alternative] - [Stock] units at ₱[Price] (exp: [Date])."',
    'For no alternatives: "No alternatives found for [Drug] in our current inventory."',
    '',
    'PRESCRIPTION DOSAGE (BLOCKED):',
    'Template: "[Drug] is prescription-only medication. Cannot provide dosage without valid physician prescription. Prescription required from physician."',
    '',
    'OTC DOSAGE (DOSAGE-ONLY):',
    'Template: "[Drug]: Adult [dose] every [frequency], max [daily limit]. [Single safety warning]. Consult healthcare professional before use."',
    'Note: NO inventory information for pure dosage queries',
    '',
    'OTC DOSAGE (WITH INVENTORY):',
    'Template: "[Drug]: Adult [dose] every [frequency], max [daily limit]. [Single safety warning]. Consult healthcare professional before use.\\n\\n📦 [Stock info]."',
    '',
    'CRITICAL RULE: If internalData is not provided or empty, NEVER include 📦 [Stock info] or any inventory references.',
    '',
    'MIXED QUERIES (Inventory + Clinical):',
    'Order: 1) Clinical info first, 2) Inventory line second, 3) Required disclaimer',
    '',
    'CRITICAL DATA RESTRICTIONS:',
    '- ONLY use information explicitly provided in the structured data',
    '- DO NOT add clinical information not present in external data sources',
    '- DO NOT invent drug indications, uses, or medical information',
    '- If no external data provided, stick to inventory-only response',
    '- Sources must match EXACTLY what data was actually provided',
    '',
    'TEMPLATE REPLACEMENT RULES:',
    '- Replace [Drug] with the actual drug name provided in the data',
    '- Replace [Product] with the actual product name',
    '- Replace [Stock], [Price], [Date] with actual inventory values',
    '- Replace [dose], [frequency], [limit] with dosage information from external data',
    '- NEVER leave placeholder brackets like [Drug] in the final response',
    '',
    'STRICT PROHIBITIONS:',
    '- NO system prompts or internal reasoning in responses',
    '- NO developer notes or explanations',
    '- NO repetition of information',
    '- NO expansion beyond query scope',
    '- NO mixing facts from different sources without clear attribution',
    '- NO adding medical information not in provided data',
    '- NO leaving template placeholders like [Drug] unreplaced',
    '',
    'REQUIRED ELEMENTS:',
    '- Single focus per answer',
    '- Pharmacy terminology only',
    '- Consistent closing: "Consult a licensed healthcare professional before use." (for medical content)',
    '- Footer format: "\\n\\nSources: [specific sources used]"',
    '',
    'RESPONSE TEMPLATES:',
    '',
    'PRESCRIPTION DRUG (NO EXTERNAL DATA, WITH INVENTORY):',
    '{ "response": "[Drug] is prescription-only medication. Cannot provide dosage without valid physician prescription. Prescription required from physician.\\n\\n📦 [Stock info].\\n\\nSources: BOTica Inventory", "tone": "factual" }',
    '',
    'PRESCRIPTION DRUG (NO EXTERNAL DATA, NO INVENTORY):',
    '{ "response": "[Drug] is prescription-only medication. Cannot provide dosage without valid physician prescription. Prescription required from physician.\\n\\nSources: BOTica Inventory", "tone": "factual" }',
    '',
    'PRESCRIPTION DRUG (WITH EXTERNAL DATA, WITH INVENTORY):',
    '{ "response": "[Drug] is prescription-only medication. Cannot provide dosage without valid physician prescription. [External indication if provided]. Prescription required from physician.\\n\\n📦 [Stock info].\\n\\nSources: BOTica Inventory, [External Source]", "tone": "factual" }',
    '',
    'PRESCRIPTION DRUG (WITH EXTERNAL DATA, NO INVENTORY):',
    '{ "response": "[Drug] is prescription-only medication. Cannot provide dosage without valid physician prescription. [External indication if provided]. Prescription required from physician.\\n\\nSources: BOTica Inventory, [External Source]", "tone": "factual" }',
    '',
    'OTC DRUG (WITH INVENTORY):',
    '{ "response": "[Drug]: Adult [dose] every [frequency], max [limit]/day. Pediatric: [weight-based]. [Warning]. Consult healthcare professional before use.\\n\\n📦 [Stock info].\\n\\nSources: BOTica Inventory, OpenFDA", "tone": "factual" }',
    '',
    'OTC DRUG (DOSAGE ONLY):',
    '{ "response": "[Drug]: Adult [dose] every [frequency], max [limit]/day. Pediatric: [weight-based]. [Warning]. Consult healthcare professional before use.\\n\\nSources: OpenFDA", "tone": "factual" }',
    '',
    'CONFLICTING SOURCES EXAMPLE:',
    '{ "response": "OpenFDA states: Adult dose 500mg every 6 hours. MIMS Philippines states: Adult dose 250mg every 4 hours for local formulations. Pediatric dosing varies by source.\\n\\n📦 [Stock info].\\n\\nSources: BOTica Inventory, OpenFDA, MIMS Philippines", "tone": "factual" }',
    '',
    'INVENTORY ONLY (SINGLE PRODUCT):',
    '{ "response": "[Product]: [Stock] units at ₱[Price] (exp: [Date]).\\n\\nSources: BOTica Inventory", "tone": "factual" }',
    '',
    'INVENTORY ONLY (MULTIPLE PRODUCTS):',
    '{ "response": "1. [Product 1]: [Stock] units at ₱[Price] (exp: [Date]).\\n2. [Product 2]: [Stock] units at ₱[Price] (exp: [Date]).\\n3. [Product 3]: [Stock] units at ₱[Price] (exp: [Date]).\\n\\nSources: BOTica Inventory", "tone": "factual" }',
    '',
    'MISSING INFO:',
    '{ "response": "I don\'t have that information right now.\\n\\nSources: BOTica Inventory", "tone": "factual" }',
    '',
    'MISSING STOCK DATA:',
    '{ "response": "This product is not in the current BOTica inventory.\\n\\nSources: BOTica Inventory", "tone": "factual" }',
    '',
    'MISSING CLINICAL DATA:',
    '{ "response": "Clinical details for this drug are not available from approved sources right now.\\n\\nSources: BOTica Inventory", "tone": "factual" }',
    '',
    'OUT-OF-SCOPE:',
    '{ "response": "I\'m a pharmacy assistant. How can I help with inventory or drug information today?\\n\\nSources: BOTica System", "tone": "helpful" }',
    '',
    'CRITICAL: Use exact templates. NO deviations. NO extra content. NO markdown formatting. Use ONLY allowed tones: factual, helpful, cautious.',
  ].join(' ');
}
export async function composeResponseLLM(
  data: StructuredData,
): Promise<ComposedResponse> {
  if (!AI_API_KEY) {
    console.log('AI_API_KEY not found, AI response disabled');
    return null;
  }

  console.log('AI Composer called with:', {
    userQuery: data.userQuery,
    intent: data.intent,
    drugName: data.drugName,
    hasInternalData: !!data.internalData,
    hasExternalData: !!data.externalData,
    sources: data.sources,
  });

  // Build enhanced context with session awareness and role-based information
  const contextParts = [
    `User Query: "${data.userQuery}"`,
    `Intent: ${data.intent}`,
    `User Role: ${data.userRole || 'Customer'}`,
    data.drugName ? `Drug Name: ${data.drugName}` : '',
    data.productType ? `Product Type: ${data.productType}` : '',
    data.sessionContext?.lastDrugName
      ? `Previous Drug: ${data.sessionContext.lastDrugName}`
      : '',
    data.sessionContext?.recentDrugs?.length
      ? `Recent Drugs: ${data.sessionContext.recentDrugs.join(', ')}`
      : '',
    data.sessionContext?.patientContext
      ? `Patient Context: ${data.sessionContext.patientContext}`
      : '',
    data.internalData
      ? `Internal Data: ${JSON.stringify(data.internalData, null, 2)}`
      : '',
    data.externalData
      ? `External Data: ${JSON.stringify(data.externalData, null, 2)}`
      : '',
    `Sources: ${data.sources.join(', ')}`,
  ].filter(Boolean);

  const context = contextParts.join('\n\n');

  const body = {
    model: AI_MODEL,
    messages: [
      { role: 'system', content: buildResponseSystemPrompt() },
      {
        role: 'user',
        content: `User asked: "${
          data.userQuery
        }"\n\nStructured data:\n${context}\n\n${
          !data.internalData
            ? 'IMPORTANT: No internal inventory data provided - DO NOT include 📦 [Stock info] or inventory references in response.'
            : 'Internal inventory data is available for reference.'
        }\n\nCompose a natural response in JSON format.`,
      },
    ],
    temperature: 0.3, // Slightly creative but consistent
    response_format: { type: 'json_object' },
    max_tokens: 1000, // Prevent overly long responses that could get corrupted
  } as const;

  console.log('Sending request to OpenAI with model:', AI_MODEL);

  try {
    const res = await fetch(`${AI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    console.log('OpenAI response status:', res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('OpenAI API error:', errorText);
      return null;
    }

    const responseData: unknown = await res.json();
    console.log('OpenAI response data:', responseData);

    const content = (
      responseData as { choices?: Array<{ message?: { content?: string } }> }
    )?.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in OpenAI response');
      return null;
    }

    console.log('Raw AI content:', content);

    // Check for truncated or malformed responses
    if (
      content.includes('o\n') ||
      content.includes('o    ') ||
      content.endsWith('o') ||
      content.includes('...')
    ) {
      console.error('Detected potentially corrupted AI response:', content);
      return null;
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parsing failed for AI response:', parseError);
      console.error('Content that failed to parse:', content);
      return null;
    }

    const validatedResponse = ResponseSchema.parse(parsed);
    console.log('Validated AI response:', validatedResponse);
    return validatedResponse;
  } catch (error) {
    console.error('AI Composer error:', error);
    return null;
  }
}

export function isAIResponseConfigured(): boolean {
  return Boolean(AI_API_KEY);
}
