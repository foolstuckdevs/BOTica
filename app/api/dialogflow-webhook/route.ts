//Receives POST requests from Dialogflow when an intent is triggered, queries database, and returns a response.
import { NextResponse } from 'next/server';
import { db } from '@/database/drizzle';
import { products } from '@/database/schema';
import { sql } from 'drizzle-orm';

// Ensure this route runs in the Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DialogflowWebhookRequest = {
  queryResult?: {
    intent?: { displayName?: string };
    queryText?: string; // full user query
    parameters?: Record<string, unknown>;
  };
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as DialogflowWebhookRequest;

    const intent = body.queryResult?.intent?.displayName ?? '';
    const queryText = body.queryResult?.queryText?.trim() ?? '';

    let fulfillmentText = "Sorry, I couldn't find that product.";

    if (intent === 'Check Stock' && queryText) {
      // Fuzzy search in DB using ILIKE
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
          sql`${products.name} ILIKE ${'%' + queryText + '%'} AND ${
            products.deletedAt
          } IS NULL`,
        )
        .limit(1);

      const item = rows[0];
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
