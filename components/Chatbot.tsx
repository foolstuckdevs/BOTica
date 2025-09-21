'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, SendHorizonal, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Sender = 'user' | 'bot';
type Message = { sender: Sender; content: string; ts: number };

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      content:
        'Hi! I’m BOTica, your pharmacy assistant. How can I help you today?',
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [showScrollDown, setShowScrollDown] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  // Track conversation context for better follow-ups
  const [sessionContext, setSessionContext] = useState<{
    lastDrugName: string | null;
    lastIntent: string | null;
    recentDrugs: string[];
    patientContext: string | null;
  }>({
    lastDrugName: null,
    lastIntent: null,
    recentDrugs: [],
    patientContext: null,
  });

  const scrollToBottom = (smooth = true) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollDown(dist > 160);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const outgoing = input.trim();
    setInput('');
    setMessages((m) => [
      ...m,
      { sender: 'user', content: outgoing, ts: Date.now() },
    ]);
    setIsTyping(true);

    try {
      // PASS 1: Intent extraction
      const p1 = await fetch('/api/ai/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: outgoing }),
      });
      const intentJson = (await p1.json().catch(() => ({}))) as Partial<{
        intent:
          | 'drug_info'
          | 'stock_check'
          | 'dosage'
          | 'alternatives'
          | 'other';
        drugName: string | null;
        needs: string[];
        sources: string[];
        error?: string;
      }>;
      if (!p1.ok) {
        const content = `Assistant error: ${
          intentJson.error ?? 'intent failed'
        }`;
        setMessages((m) => [...m, { sender: 'bot', content, ts: Date.now() }]);
        return;
      }

      // Build PASS 2 payload with enhanced conversational memory
      const finalPayload: {
        intent:
          | 'drug_info'
          | 'stock_check'
          | 'dosage'
          | 'alternatives'
          | 'other';
        drugName: string | null | undefined;
        needs: string[] | undefined;
        sources: string[] | undefined;
        text: string;
        sessionContext?: {
          lastDrugName: string | null;
          lastIntent: string | null;
          recentDrugs: string[];
          patientContext: string | null;
        };
      } = {
        intent: (intentJson.intent ?? 'other') as
          | 'drug_info'
          | 'stock_check'
          | 'dosage'
          | 'alternatives'
          | 'other',
        drugName: intentJson.drugName,
        needs: intentJson.needs,
        sources: intentJson.sources,
        text: outgoing,
        sessionContext: sessionContext,
      };

      // If no drugName detected but we have a recent one and the intent needs it, reuse it
      const intentNeedsDrug =
        finalPayload.intent === 'dosage' ||
        finalPayload.intent === 'drug_info' ||
        finalPayload.intent === 'alternatives';
      if (
        (!finalPayload.drugName ||
          finalPayload.drugName?.toLowerCase() === 'it') &&
        sessionContext.lastDrugName &&
        intentNeedsDrug
      ) {
        finalPayload.drugName = sessionContext.lastDrugName;
      }

      // Ensure appropriate sources are present
      const src = new Set(finalPayload.sources ?? []);
      if (finalPayload.intent === 'dosage') src.add('external_db');
      // Extract patient context from current message BEFORE API call
      const patientKeywords = outgoing
        .toLowerCase()
        .match(/\b(adult|child|elderly|baby|infant|teenager|pregnant)\b/);

      // Extract dosage form from current message
      const dosageFormKeywords = outgoing
        .toLowerCase()
        .match(
          /\b(tablet|capsule|syrup|suspension|liquid|injection|cream|ointment|gel|patch)\b/,
        );

      // Update session context before making API call
      const updatedSessionContext = { ...sessionContext };

      if (patientKeywords) {
        updatedSessionContext.patientContext = patientKeywords[0];
      }

      if (dosageFormKeywords && finalPayload.drugName) {
        const enhancedDrugName = `${finalPayload.drugName} ${dosageFormKeywords[0]}`;
        updatedSessionContext.lastDrugName = enhancedDrugName;
      }

      // Use the updated context in the API call
      finalPayload.sessionContext = updatedSessionContext;

      if (
        finalPayload.intent === 'stock_check' ||
        finalPayload.intent === 'drug_info' ||
        finalPayload.intent === 'alternatives'
      )
        src.add('internal_db');
      finalPayload.sources = Array.from(src);

      // PASS 2: Final response
      const p2 = await fetch('/api/ai/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });
      const resp = (await p2.json().catch(() => ({}))) as Partial<{
        response: string; // New AI-generated response
        patientSummary: string; // Legacy fallback
        pharmacistNotes: string[];
        warnings: string[];
        sources: string[];
        matches: Array<{
          id: number;
          name: string;
          brand: string | null;
          stock: number | null;
          price: number | null;
          expiry?: string;
        }>;
        alternatives: Array<{
          id: number;
          name: string;
          brand: string | null;
          stock: number | null;
          price: number | null;
          expiry?: string;
        }>;
        error?: string;
      }>;

      // Update session context with conversation memory
      if (finalPayload.drugName) {
        setSessionContext((prev) => ({
          ...prev,
          lastDrugName: finalPayload.drugName || null,
          lastIntent: finalPayload.intent,
          recentDrugs: prev.recentDrugs.includes(finalPayload.drugName || '')
            ? prev.recentDrugs
            : [
                ...prev.recentDrugs.slice(-4),
                finalPayload.drugName || '',
              ].filter(Boolean),
        }));
      } else if (resp?.matches && resp.matches.length > 0) {
        const drugName = resp.matches[0].name;
        setSessionContext((prev) => ({
          ...prev,
          lastDrugName: drugName,
          lastIntent: finalPayload.intent,
          recentDrugs: prev.recentDrugs.includes(drugName)
            ? prev.recentDrugs
            : [...prev.recentDrugs.slice(-4), drugName],
        }));
      }

      // Update session context state for next API call
      if (patientKeywords) {
        setSessionContext((prev) => ({
          ...prev,
          patientContext: patientKeywords[0],
        }));
      }

      // Update drug name in context to include dosage form if specified
      if (dosageFormKeywords && finalPayload.drugName) {
        const enhancedDrugName = `${finalPayload.drugName} ${dosageFormKeywords[0]}`;
        setSessionContext((prev) => ({
          ...prev,
          lastDrugName: enhancedDrugName,
        }));
      }

      const content = p2.ok
        ? formatPass2(resp)
        : `Assistant error: ${resp.error ?? 'response failed'}`;
      setMessages((m) => [...m, { sender: 'bot', content, ts: Date.now() }]);
    } catch {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Chatbot error: PASS pipeline failed');
      }
      setMessages((m) => [
        ...m,
        {
          sender: 'bot',
          content: 'Sorry, I had trouble connecting. Please try again.',
          ts: Date.now(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  function formatPass2(
    resp: Partial<{
      response: string; // New AI-generated response
      patientSummary: string; // Legacy fallback
      pharmacistNotes: string[];
      warnings: string[];
      sources: string[];
    }>,
  ): string {
    // If we have the new AI-generated response, use it directly
    // (AI response already includes proper source attribution)
    if (resp.response) {
      return resp.response;
    }

    // Fallback to legacy format for compatibility
    const lines: string[] = [];
    if (resp.patientSummary) lines.push(resp.patientSummary);
    if (resp.pharmacistNotes?.length) {
      lines.push('', 'Notes:');
      for (const n of resp.pharmacistNotes) lines.push(`• ${n}`);
    }
    if (resp.warnings?.length) {
      lines.push('', 'Warnings:');
      for (const w of resp.warnings) lines.push(`• ${w}`);
    }
    if (resp.sources?.length) {
      lines.push('', `Sources: ${resp.sources.join(', ')}`);
    }
    return lines.join('\n');
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <Card className="w-[380px] h-[560px] rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col">
          <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-blue-700">
                <Bot className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                <div className="text-[13px] font-semibold">
                  BOTica Assistant
                </div>
                <p className="text-[11px] text-blue-100">
                  {isTyping ? 'Typing…' : 'Online'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 rounded-full h-7 w-7"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <CardContent className="flex-1 p-0 bg-white flex min-h-0">
            <div
              ref={scrollerRef}
              className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1.5 bg-gray-50"
              role="log"
              aria-live="polite"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${
                    m.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div className="max-w-[85%]">
                    <div
                      className={`rounded-2xl px-3 py-1.5 text-[13px] leading-snug shadow-sm whitespace-pre-line ${
                        m.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                      }`}
                    >
                      {m.content}
                    </div>
                    <div
                      className={`mt-0.5 text-[10px] ${
                        m.sender === 'user'
                          ? 'text-blue-300 text-right'
                          : 'text-gray-400'
                      }`}
                    >
                      {new Date(m.ts).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-tl-none px-4 py-2 max-w-[85%] text-sm shadow">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-75" />
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-150" />
                    </div>
                  </div>
                </div>
              )}

              {showScrollDown && (
                <div className="sticky bottom-1 flex justify-end pointer-events-none">
                  <Button
                    type="button"
                    size="sm"
                    className="pointer-events-auto rounded-full bg-blue-600 hover:bg-blue-700 shadow"
                    onClick={() => scrollToBottom()}
                    aria-label="Scroll to latest message"
                  >
                    Jump to latest
                  </Button>
                </div>
              )}
            </div>
          </CardContent>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="sticky bottom-0 bg-white flex items-center gap-2 border-t border-gray-200 px-3 py-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message…"
              className="flex-1 text-sm rounded-full bg-gray-100 border-none focus-visible:ring-1 focus-visible:ring-blue-500 h-9"
              aria-label="Message"
            />
            <Button
              type="submit"
              size="sm"
              className="rounded-full bg-blue-600 hover:bg-blue-700 h-9 px-3"
              disabled={!input.trim()}
              aria-label="Send message"
            >
              <SendHorizonal className="w-4 h-4 text-white" />
            </Button>
          </form>
        </Card>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full p-4 bg-gradient-to-br from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg transition-all hover:scale-105"
        >
          <Bot className="text-white w-6 h-6" />
          <span className="sr-only">Chat with us</span>
        </Button>
      )}
    </div>
  );
}
