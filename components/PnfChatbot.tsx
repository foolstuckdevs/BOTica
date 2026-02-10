'use client';

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import {
  SendHorizonal,
  Bot,
  X,
  Sparkles,
  Loader2,
  Pill,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** True while the assistant is still streaming */
  streaming?: boolean;
  latencyMs?: number;
}

interface PnfChatbotPanelProps {
  onClose?: () => void;
  className?: string;
}

export interface PnfChatbotProps {
  variant?: 'inline' | 'floating';
  defaultOpen?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const GREETING =
  "Good day! I'm **BOTica**, your Drug Reference Assistant.\n\nI can look up any medicine in the **Philippine National Formulary** — just ask about:\n\n- **Dosage** — adult, pediatric, and route-specific doses\n- **Side Effects** — adverse reactions by frequency\n- **Contraindications** — when NOT to use a drug\n- **Drug Interactions** — clinically significant interactions\n- **Pregnancy Category** — safety classification (A/B/C/D/X)\n- **Precautions** — warnings and monitoring\n- **Dose Adjustment** — renal/hepatic modifications\n- **Administration** — how to give/take the medication\n- **Formulations** — available forms and strengths\n- **Indications** — approved uses\n- **Classification** — Rx/OTC and ATC class\n- **Drug Comparison** — side-by-side comparison of two drugs\n\nType a drug name and your question, or try a suggestion below!";

/**
 * All question categories the chatbot can answer, grouped by topic.
 * On each render the UI picks a random subset so users discover the
 * full range of the assistant's capabilities.
 */
const ALL_SUGGESTIONS: { label: string; questions: string[] }[] = [
  {
    label: 'Dosage',
    questions: [
      'What is the dosage for Paracetamol?',
      'Recommended dose of Amoxicillin for adults?',
      'Pediatric dosage for Ibuprofen?',
    ],
  },
  {
    label: 'Side Effects',
    questions: [
      'Tell me about Amoxicillin side effects',
      'Adverse reactions of Metformin?',
      'What are the side effects of Losartan?',
    ],
  },
  {
    label: 'Contraindications',
    questions: [
      'Contraindications for Sodium Bicarbonate?',
      'Who should not take Aspirin?',
      'When is Metformin contraindicated?',
    ],
  },
  {
    label: 'Drug Interactions',
    questions: [
      'Drug interactions for Aluminum Hydroxide?',
      'Can Warfarin be taken with Aspirin?',
      'Interactions between Omeprazole and Clopidogrel?',
    ],
  },
  {
    label: 'Pregnancy Category',
    questions: [
      'Is Paracetamol safe during pregnancy?',
      'Pregnancy category of Amoxicillin?',
      'Which antibiotics are safe for pregnant women?',
    ],
  },
  {
    label: 'Precautions',
    questions: [
      'Precautions when using Metformin?',
      'What to monitor while on Warfarin?',
      'Safety precautions for Digoxin?',
    ],
  },
  {
    label: 'Dose Adjustment',
    questions: [
      'Dose adjustment for renal impairment with Metformin?',
      'Hepatic dose adjustment for Paracetamol?',
      'Renal dosing of Amoxicillin?',
    ],
  },
  {
    label: 'Administration',
    questions: [
      'How should Omeprazole be administered?',
      'Can Amoxicillin be taken with food?',
      'How to give IV Paracetamol?',
    ],
  },
  {
    label: 'Formulations',
    questions: [
      'Available formulations of Paracetamol?',
      'Does Amoxicillin come in suspension?',
      'What forms does Diclofenac come in?',
    ],
  },
  {
    label: 'Indications',
    questions: [
      'What is Metformin used for?',
      'Indications of Salbutamol?',
      'When is Omeprazole prescribed?',
    ],
  },
  {
    label: 'Classification',
    questions: [
      'Is Paracetamol an OTC or Rx drug?',
      'What class does Losartan belong to?',
      'ATC classification of Amoxicillin?',
    ],
  },
  {
    label: 'Comparison',
    questions: [
      'Difference between Paracetamol and Ibuprofen?',
      'Compare Omeprazole and Ranitidine',
      'Losartan vs Amlodipine for hypertension?',
    ],
  },
];

/** Pick one random question from each category, then shuffle and take 5 */
function pickSuggestions(): string[] {
  const pool = ALL_SUGGESTIONS.map(
    (cat) => cat.questions[Math.floor(Math.random() * cat.questions.length)],
  );
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 5);
}

/* ------------------------------------------------------------------ */
/*  Markdown-lite renderer                                             */
/* ------------------------------------------------------------------ */

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={`list-${listKey++}`} className="list-disc list-inside space-y-1 my-1.5 text-[13px] text-slate-700 leading-relaxed">
        {listItems.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      flushList();
      elements.push(<div key={`br-${i}`} className="h-1.5" />);
      continue;
    }

    // Bullet list item
    if (/^[-•*]\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^[-•*]\s+/, ''));
      continue;
    }

    // Numbered list item
    if (/^\d+[.)]\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^\d+[.)]\s+/, ''));
      continue;
    }

    // Table row (e.g. | cell | cell | cell |)
    if (/^\|(.+)\|\s*$/.test(trimmed)) {
      // Skip separator rows like |---|---|---|
      if (/^\|[\s\-:|]+\|\s*$/.test(trimmed)) continue;

      const cells = trimmed
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());

      // Detect header row (first table row before a separator)
      const nextLine = lines[i + 1]?.trim() ?? '';
      const isHeader = /^\|[\s\-:|]+\|\s*$/.test(nextLine);

      flushList();
      elements.push(
        <div
          key={`tr-${i}`}
          className={cn(
            'grid gap-1 py-1.5 px-2 text-[12px] leading-relaxed border-b border-gray-100',
            isHeader ? 'font-semibold text-slate-900 bg-slate-50 rounded-t-lg' : 'text-slate-700',
          )}
          style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}
        >
          {cells.map((cell, ci) => (
            <div key={ci} className="min-w-0 break-words">
              {renderInline(cell)}
            </div>
          ))}
        </div>,
      );
      continue;
    }

    // Must flush any pending list before non-list content
    flushList();

    // Bold heading line (e.g. **Overview**)
    if (/^\*\*[^*]+\*\*\s*[-—:]?\s*$/.test(trimmed)) {
      const label = trimmed.replace(/\*\*/g, '').replace(/[-—:]\s*$/, '').trim();
      elements.push(
        <div
          key={`h-${i}`}
          className="flex items-center gap-2 mt-3 first:mt-0 mb-1"
        >
          <Pill className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          <p className="text-[13px] font-semibold text-slate-900">{label}</p>
        </div>,
      );
      continue;
    }

    // Italic source note
    if (/^_.*_$/.test(trimmed)) {
      elements.push(
        <p key={`src-${i}`} className="text-[11px] text-slate-400 italic mt-3">
          {trimmed.replace(/^_|_$/g, '')}
        </p>,
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-[13px] text-slate-700 leading-relaxed">
        {renderInline(trimmed)}
      </p>,
    );
  }

  flushList();
  return <>{elements}</>;
}

/**
 * Handle inline markdown: **bold**
 */
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <span key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/* ------------------------------------------------------------------ */
/*  Suggestion chips                                                   */
/* ------------------------------------------------------------------ */

function SuggestionChips({
  onSelect,
  disabled,
}: {
  onSelect: (q: string) => void;
  disabled?: boolean;
}) {
  // Defer random pick to client-side only to avoid SSR hydration mismatch
  const [suggestions, setSuggestions] = useState<string[]>([]);
  useEffect(() => {
    setSuggestions(pickSuggestions());
  }, []);

  return (
    <div className="space-y-3 mt-3">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="h-3.5 w-3.5 text-blue-600" />
        <p className="text-xs font-semibold text-slate-700">Try asking…</p>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {suggestions.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelect(q)}
            disabled={disabled}
            className="group text-left text-xs px-4 py-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-50/50 border border-blue-100 text-slate-700 hover:from-blue-100 hover:to-blue-50 hover:border-blue-200 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-start gap-2"
          >
            <span className="text-blue-600 font-medium mt-0.5 group-hover:translate-x-0.5 transition-transform">
              →
            </span>
            <span className="flex-1 leading-relaxed">{q}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SSE stream reader                                                  */
/* ------------------------------------------------------------------ */

async function* readSSE(
  response: Response,
): AsyncGenerator<{ type: string; [key: string]: unknown }> {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const payload = JSON.parse(trimmed.slice(6));
        yield payload;
      } catch {
        // skip malformed events
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Chat Panel                                                         */
/* ------------------------------------------------------------------ */

function PnfChatbotPanel({ onClose, className }: PnfChatbotPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: GREETING },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Thinking…');
  const [activeDrug, setActiveDrug] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll on new content
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(
    async (presetQuestion?: string) => {
      const question = (presetQuestion || input).trim();
      if (!question || isLoading) return;

      // Abort any previous stream
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMsg: ChatMessage = { role: 'user', content: question };
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: '',
        streaming: true,
      };

      // Pick a loading label that matches the query type
      const q = question.toLowerCase().trim();
      if (/\b(vs\.?|versus|compare|difference)\b/.test(q)) {
        setLoadingText('Comparing drugs…');
      } else if (
        q.length <= 3 ||
        /^(hi|hello|hey|good\s*(morning|afternoon|evening|day)|thanks|thank|bye|who\s+are)/i.test(q) ||
        /what\s+(can|do)\s+you/i.test(q)
      ) {
        setLoadingText('Thinking…');
      } else {
        setLoadingText('Searching formulary…');
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput('');
      setIsLoading(true);

      // Build history from current messages (excluding greeting & the new ones)
      const history = messages
        .filter(
          (m) =>
            m.role === 'user' ||
            (m.role === 'assistant' && m.content !== GREETING),
        )
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        const res = await fetch('/api/pnf-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            question,
            chatHistory: history,
            activeDrug: activeDrug || undefined,
          }),
        });

        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }

        let latencyMs: number | undefined;

        for await (const event of readSSE(res)) {
          if (controller.signal.aborted) break;

          switch (event.type) {
            case 'meta':
              if (typeof event.drugContext === 'string' && event.drugContext) {
                setActiveDrug(event.drugContext);
              }
              break;

            case 'token':
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + (event.content as string),
                  };
                }
                return updated;
              });
              break;

            case 'done':
              latencyMs = event.latencyMs as number;
              break;

            case 'error':
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content:
                      'Sorry, something went wrong while generating the response. Please try again.',
                    streaming: false,
                  };
                }
                return updated;
              });
              break;
          }
        }

        // Finalize streaming
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              streaming: false,
              latencyMs,
            };
          }
          return updated;
        });
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error('[PnfChatbot]', err);

        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              content:
                'Sorry, I could not reach the formulary right now. Please try again later.',
              streaming: false,
            };
          }
          return updated;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, activeDrug],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <Card
      className={cn(
        'w-full h-full max-h-[85vh] flex flex-col border border-gray-200 shadow-lg overflow-hidden rounded-2xl py-0 gap-0 min-h-0',
        className,
      )}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b bg-white flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl flex items-center justify-center shadow-sm">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900">
              Drug Reference Assistant
            </span>
            <span className="text-xs text-slate-500">
              Philippine National Formulary
            </span>
          </div>
        </div>
        {onClose ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg h-8 w-8"
            onClick={onClose}
            aria-label="Close assistant"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-4 p-4 bg-gradient-to-b from-slate-50 to-white min-h-0"
        >
          {messages.map((message, index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <div
                className={cn(
                  'max-w-[100%] rounded-2xl p-3.5 shadow-sm',
                  message.role === 'assistant'
                    ? 'bg-white border border-gray-200 text-slate-900'
                    : 'bg-gradient-to-br from-blue-600 to-blue-500 text-white self-end shadow-md',
                )}
              >
                {message.role === 'assistant' ? (
                  <>
                    {renderMarkdown(message.content)}
                    {message.streaming && (
                      <span className="inline-block w-1.5 h-4 bg-blue-500 rounded-sm animate-pulse ml-0.5 align-text-bottom" />
                    )}
                  </>
                ) : (
                  <p className="text-[13px] leading-relaxed">
                    {message.content}
                  </p>
                )}
              </div>

              {/* Latency badge */}
              {message.role === 'assistant' &&
                !message.streaming &&
                typeof message.latencyMs === 'number' && (
                  <span className="text-[10px] text-slate-400 ml-1">
                    Responded in {(message.latencyMs / 1000).toFixed(1)}s
                  </span>
                )}

              {/* Suggestion chips after greeting */}
              {index === 0 && messages.length === 1 && !isLoading && (
                <SuggestionChips
                  onSelect={(q) => sendMessage(q)}
                  disabled={isLoading}
                />
              )}
            </div>
          ))}

          {/* Typing indicator (before first token arrives) */}
          {isLoading &&
            messages[messages.length - 1]?.role === 'assistant' &&
            messages[messages.length - 1]?.content === '' && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                    <span>{loadingText}</span>
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-gray-200 p-3 bg-white flex gap-2 items-center shrink-0"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about dosage, side effects, contraindications…"
            className="text-sm flex-1 h-11 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="sm"
            className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-sm hover:shadow transition-all"
            disabled={isLoading || !input.trim()}
          >
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Floating wrapper                                                   */
/* ------------------------------------------------------------------ */

function FloatingPnfAssistant({
  defaultOpen = false,
  className,
}: Omit<PnfChatbotProps, 'variant'>) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40"
          role="presentation"
          onClick={() => setIsOpen(false)}
        />
      )}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <div
          aria-hidden={!isOpen}
          className={cn(
            'w-[420px] max-w-[calc(100vw-3rem)] h-[620px] max-h-[calc(100vh-8rem)] shadow-2xl',
            isOpen ? 'pointer-events-auto' : 'hidden pointer-events-none',
          )}
        >
          <PnfChatbotPanel
            onClose={() => setIsOpen(false)}
            className={cn('h-full min-h-0', className)}
          />
        </div>
        <Button
          onClick={() => setIsOpen((prev) => !prev)}
          size="lg"
          className="rounded-2xl p-4 bg-gradient-to-br from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-xl hover:shadow-2xl transition-all hover:scale-105 border border-blue-400/20"
          aria-pressed={isOpen}
        >
          <Bot className="text-white w-6 h-6" />
          <span className="sr-only">Toggle PNF Assistant</span>
        </Button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export function PnfChatbot({
  variant = 'inline',
  className,
  defaultOpen,
}: PnfChatbotProps) {
  if (variant === 'floating') {
    return (
      <FloatingPnfAssistant className={className} defaultOpen={defaultOpen} />
    );
  }
  return <PnfChatbotPanel className={className} />;
}

export { PnfChatbotPanel as PnfChatbotCard, FloatingPnfAssistant };
export default PnfChatbot;
