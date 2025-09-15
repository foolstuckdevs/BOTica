// Dialogflow ES webhook: checks product stock and returns a fulfillment message.
import { NextResponse } from 'next/server';
import { db } from '@/database/drizzle';
import { products } from '@/database/schema';
import { and, sql } from 'drizzle-orm';

// Ensure this route runs in the Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DialogflowWebhookRequest = {
  queryResult?: {
    intent?: { displayName?: string };
    queryText?: string;
    parameters?: Record<string, unknown>;
  };
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as DialogflowWebhookRequest;

    const intent = body.queryResult?.intent?.displayName ?? '';
    const queryText = body.queryResult?.queryText?.trim() ?? '';
    const params = (body.queryResult?.parameters ?? {}) as Record<
      string,
      unknown
    >;

    const getString = (
      obj: Record<string, unknown>,
      key: string,
    ): string | undefined => {
      const v = obj[key];
      if (typeof v === 'string') return v.trim() || undefined;
      if (Array.isArray(v)) {
        const first = v.find((x) => typeof x === 'string' && x.trim());
        return typeof first === 'string' ? first : undefined;
      }
      return undefined;
    };

    let fulfillmentText = "Sorry, I couldn't find that product.";

    if (intent === 'Check Stock' && queryText) {
      // 1) Prefer explicit Dialogflow parameters when available
      const productParam =
        getString(params, 'product') ||
        getString(params, 'product_name') ||
        getString(params, 'medicine') ||
        getString(params, 'item');

      const findByNameOrBrand = async (needle: string) => {
        const rows = await db
          .select({
            id: products.id,
            name: products.name,
            quantity: products.quantity,
            dosageForm: products.dosageForm,
            unit: products.unit,
          })
          .from(products)
          .where(
            and(
              sql`(${products.name} ILIKE ${'%' + needle + '%'} OR ${
                products.brandName
              } ILIKE ${'%' + needle + '%'})`,
              sql`${products.deletedAt} IS NULL`,
            ),
          )
          .limit(1);
        return rows[0];
      };

      let item = null as {
        id: number;
        name: string;
        quantity: number;
        dosageForm: string | null;
        unit: string | null;
      } | null;

      if (productParam) {
        item = await findByNameOrBrand(productParam);
      }

      // 2) Fallback: try to infer a keyword from the user's sentence
      if (!item) {
        const cleaned = queryText
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const stop = new Set([
          'do',
          'we',
          'have',
          'in',
          'stock',
          'the',
          'a',
          'an',
          'is',
          'there',
          'any',
          'of',
          'for',
          'and',
          'please',
          'medicine',
          'meds',
        ]);
        const words = cleaned
          .split(' ')
          .filter((w) => w.length >= 3 && !stop.has(w));

        // Try longer words first
        words.sort((a, b) => b.length - a.length);

        for (const w of words.slice(0, 5)) {
          item = await findByNameOrBrand(w);
          if (item) break;
        }
      }
      if (item) {
        fulfillmentText = `${item.name} has ${item.quantity} in stock.`;
        if (item.dosageForm)
          fulfillmentText += ` Dosage form: ${item.dosageForm}.`;
        if (item.unit) fulfillmentText += ` Unit: ${item.unit}.`;
      }
    }

    return NextResponse.json({ fulfillmentText });
  } catch (err) {
    console.error('Dialogflow webhook error:', err);
    return NextResponse.json(
      { fulfillmentText: 'An error occurred processing your request.' },
      { status: 500 },
    );
  }
}
