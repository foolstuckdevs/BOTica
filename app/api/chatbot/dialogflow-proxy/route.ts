// Allows frontend (chatbot UI) to send user messages to Dialogflow, get the response, and return it to the client.
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import type { protos } from '@google-cloud/dialogflow';

// Ensure Node runtime for gRPC/HTTP client
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RequestBody = {
  text?: string;
  sessionId?: string;
  languageCode?: string;
};

function getEnv(name: string) {
  return process.env[name];
}

// Lazy import to avoid bundling in edge
async function getDialogflowClient() {
  const projectId = getEnv('DIALOGFLOW_PROJECT_ID');
  const clientEmail = getEnv('DIALOGFLOW_CLIENT_EMAIL');
  const privateKey = getEnv('DIALOGFLOW_PRIVATE_KEY');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Dialogflow credentials missing. Set DIALOGFLOW_PROJECT_ID, DIALOGFLOW_CLIENT_EMAIL, DIALOGFLOW_PRIVATE_KEY.',
    );
  }

  const { SessionsClient } = await import('@google-cloud/dialogflow');
  const client = new SessionsClient({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    },
    projectId,
  });
  return { client, projectId };
}

export async function POST(req: Request) {
  try {
    const { text, sessionId, languageCode }: RequestBody = await req.json();
    const input = typeof text === 'string' ? text.trim() : '';
    if (!input) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    const sid = sessionId && sessionId.length > 0 ? sessionId : uuidv4();
    const lang = languageCode || 'en';

    const { client, projectId } = await getDialogflowClient();
    const sessionPath = client.projectAgentSessionPath(projectId, sid);

    const request: protos.google.cloud.dialogflow.v2.IDetectIntentRequest = {
      session: sessionPath,
      queryInput: {
        text: { text: input, languageCode: lang },
      },
    };

    const [response] = await client.detectIntent(request);
    const result = response.queryResult;
    const fulfillmentText =
      result?.fulfillmentText || 'I did not understand that.';

    return NextResponse.json({
      fulfillmentText,
      sessionId: sid,
      intent: result?.intent?.displayName || null,
      parameters: result?.parameters || null,
    });
  } catch (error) {
    console.error('Dialogflow proxy error:', error);
    const message =
      process.env.NODE_ENV !== 'production' && error instanceof Error
        ? error.message
        : 'Failed to contact Dialogflow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
