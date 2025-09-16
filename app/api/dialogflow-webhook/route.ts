// Dialogflow ES webhook: checks product stock and returns a fulfillment message.
import { NextResponse } from 'next/server';
import { db } from '@/database/drizzle';
import { products } from '@/database/schema';
import { and, sql, asc } from 'drizzle-orm';

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
      if (typeof v === 'string') {
        const t = v.trim();
        return t || undefined;
      }
      if (Array.isArray(v)) {
        const first = (v as unknown[]).find(
          (x): x is string =>
            typeof x === 'string' && (x as string).trim().length > 0,
        );
        return first;
      }
      return undefined;
    };

    let fulfillmentText = "Sorry, I couldn't find that product.";

    if (intent === 'Check Stock' && queryText) {
      // Prefer explicit Dialogflow parameters when available
      const productParam =
        getString(params, 'product') ||
        getString(params, 'product_name') ||
        getString(params, 'medicine') ||
        getString(params, 'item');

      // Helper: find multiple matches by name, brand, or generic
      const findMatches = async (needle: string, limit = 8) => {
        const rows = await db
          .select({
            id: products.id,
            name: products.name,
            brandName: products.brandName,
            quantity: products.quantity,
            dosageForm: products.dosageForm,
            unit: products.unit,
          })
          .from(products)
          .where(
            and(
              sql`(${products.name} ILIKE ${'%' + needle + '%'} OR ${
                products.brandName
              } ILIKE ${'%' + needle + '%'} OR ${products.genericName} ILIKE ${
                '%' + needle + '%'
              })`,
              sql`${products.deletedAt} IS NULL`,
              sql`${products.quantity} > 0`,
              sql`${products.expiryDate} >= CURRENT_DATE`,
            ),
          )
          .orderBy(asc(products.name))
          .limit(limit);
        return rows;
      };

      let matches: Array<{
        id: number;
        name: string;
        brandName: string | null;
        quantity: number;
        dosageForm: string | null;
        unit: string | null;
      }> = [];

      if (productParam) {
        matches = await findMatches(productParam);
      }

      if (matches.length === 0) {
        // Fallback: infer keywords from user's sentence
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
        words.sort((a, b) => b.length - a.length);
        for (const w of words.slice(0, 5)) {
          // sequentially try a few longest keywords
          const res = await findMatches(w);
          if (res.length > 0) {
            matches = res;
            break;
          }
        }
      }

      if (matches.length === 1) {
        const item = matches[0];
        const parts: string[] = [];
        if (item.brandName) parts.push(item.brandName);
        if (item.dosageForm) parts.push(item.dosageForm.toLowerCase());
        if (item.unit) parts.push(item.unit.toLowerCase());
        const meta = parts.length ? ` — ${parts.join(', ')}` : '';
        fulfillmentText = `${item.name}${meta} — ${item.quantity} in stock.`;
      } else if (matches.length > 1) {
        const maxList = 5;
        const shown = matches.slice(0, maxList);
        const lines = shown.map((m, i) => {
          const parts: string[] = [];
          if (m.brandName) parts.push(m.brandName);
          if (m.dosageForm) parts.push(m.dosageForm.toLowerCase());
          if (m.unit) parts.push(m.unit.toLowerCase());
          const meta = parts.length ? ` — ${parts.join(', ')}` : '';
          return `${i + 1}) ${m.name}${meta} — ${m.quantity} in stock`;
        });
        const extra =
          matches.length > maxList
            ? `\n...and ${
                matches.length - maxList
              } more. Please specify brand or dosage form.`
            : '';
        fulfillmentText = `Matches (${matches.length}):\n${lines.join(
          '\n',
        )}${extra}`;
      }
    } else if (intent === 'Suggest Alternative' && queryText) {
      // 1) Get target term from parameters or fallback keywords
      const productParam =
        getString(params, 'product') ||
        getString(params, 'product_name') ||
        getString(params, 'medicine') ||
        getString(params, 'item');

      const cleaned = queryText
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const stop = new Set([
        'suggest',
        'alternative',
        'alternatives',
        'for',
        'to',
        'the',
        'a',
        'an',
        'please',
      ]);
      const words = cleaned
        .split(' ')
        .filter((w) => w.length >= 3 && !stop.has(w));
      words.sort((a, b) => b.length - a.length);

      const term = productParam ?? words[0] ?? '';
      if (!term) {
        fulfillmentText = 'Please specify a product to find alternatives.';
        return NextResponse.json({ fulfillmentText });
      }

      // 2) Find a reference product to derive genericName/category
      const ref = await db
        .select({
          id: products.id,
          name: products.name,
          brandName: products.brandName,
          genericName: products.genericName,
          categoryId: products.categoryId,
        })
        .from(products)
        .where(
          and(
            sql`(${products.name} ILIKE ${'%' + term + '%'} OR ${
              products.brandName
            } ILIKE ${'%' + term + '%'} OR ${products.genericName} ILIKE ${
              '%' + term + '%'
            })`,
            sql`${products.deletedAt} IS NULL`,
          ),
        )
        .orderBy(asc(products.name))
        .limit(1);

      const refItem = ref[0];

      // 3) Look for alternatives by same generic name first
      let alternatives: Array<{
        id: number;
        name: string;
        brandName: string | null;
        dosageForm: string | null;
        unit: string | null;
        quantity: number;
      }> = [];

      const generic = refItem?.genericName ?? term;
      if (generic) {
        alternatives = await db
          .select({
            id: products.id,
            name: products.name,
            brandName: products.brandName,
            dosageForm: products.dosageForm,
            unit: products.unit,
            quantity: products.quantity,
          })
          .from(products)
          .where(
            and(
              sql`${products.genericName} ILIKE ${'%' + generic + '%'}`,
              sql`${products.deletedAt} IS NULL`,
              sql`${products.quantity} > 0`,
              sql`${products.expiryDate} >= CURRENT_DATE`,
            ),
          )
          .orderBy(asc(products.name))
          .limit(8);
      }

      // 4) Fallback: same category if few/no generic matches
      if (alternatives.length === 0 && refItem?.categoryId != null) {
        alternatives = await db
          .select({
            id: products.id,
            name: products.name,
            brandName: products.brandName,
            dosageForm: products.dosageForm,
            unit: products.unit,
            quantity: products.quantity,
          })
          .from(products)
          .where(
            and(
              sql`${products.categoryId} = ${refItem.categoryId}`,
              sql`${products.deletedAt} IS NULL`,
              sql`${products.quantity} > 0`,
              sql`${products.expiryDate} >= CURRENT_DATE`,
            ),
          )
          .orderBy(asc(products.name))
          .limit(8);
      }

      if (alternatives.length > 0) {
        const maxList = 5;
        const shown = alternatives.slice(0, maxList);
        const lines = shown.map((m, i) => {
          const parts: string[] = [];
          if (m.brandName) parts.push(m.brandName);
          if (m.dosageForm) parts.push(m.dosageForm.toLowerCase());
          if (m.unit) parts.push(m.unit.toLowerCase());
          const meta = parts.length ? ` — ${parts.join(', ')}` : '';
          return `${i + 1}) ${m.name}${meta} — ${m.quantity} in stock`;
        });
        const extra =
          alternatives.length > maxList
            ? `\n...and ${alternatives.length - maxList} more.`
            : '';
        const label = refItem?.genericName ?? term;
        fulfillmentText = `Alternatives for ${label} (${
          alternatives.length
        }):\n${lines.join('\n')}${extra}`;
      } else {
        fulfillmentText = `Sorry, I couldn't find alternatives for ${term}.`;
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
