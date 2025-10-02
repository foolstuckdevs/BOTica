'use client';

import { useState, useRef, useEffect } from 'react';
import { SendHorizonal, Activity, Bot, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Citation {
  chunkId?: string;
  drugName?: string;
  section?: string;
  pageRange?: string;
  snippet?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  createdAt: number;
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

type CitationSummary = {
  id: string;
  drugName: string;
  pageRange?: string;
};

const GREETING = `Good day. I'm BOTica Drug Reference Assistant. How can I help you today?`;

function renderAssistantContent(message: ChatMessage) {
  return message.content.split('\n').map((line, index) => {
    // Match section headings (e.g., "Overview:", "Dosage:", etc.)
    const isHeading = /^\s*[A-Z][A-Za-z\s]+:\s*$/.test(line);
    if (isHeading) {
      return (
        <p
          key={index}
          className="text-xs font-semibold text-slate-900 mt-3 first:mt-0 mb-1"
        >
          {line.replace(/:\s*$/, '')}
        </p>
      );
    }

    if (!line.trim()) {
      return <div key={index} className="h-1" />;
    }

    // Render regular content lines
    return (
      <p key={index} className="text-xs text-slate-700 leading-relaxed">
        {line}
      </p>
    );
  });
}

function renderTimestamp(createdAt: number, latencyMs?: number) {
  const timestamp = new Date(createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-400">
      <Clock className="h-3 w-3" />
      <span>{timestamp}</span>
      {typeof latencyMs === 'number' ? (
        <span aria-label="latency">• {latencyMs} ms</span>
      ) : null}
    </div>
  );
}

function summarizeCitations(citations?: Citation[]): CitationSummary[] {
  if (!citations?.length) return [];

  const unique = new Map<string, CitationSummary>();

  citations.forEach((citation, index) => {
    const drugName = citation.drugName?.trim() || 'Referenced section';
    const pageRange = citation.pageRange?.trim();
    const keyBase = `${drugName}|${pageRange ?? ''}`;
    const key = keyBase.length ? keyBase : String(index);

    if (!unique.has(key)) {
      unique.set(key, { id: key, drugName, pageRange });
    }
  });

  return Array.from(unique.values());
}

function PnfChatbotPanel({ onClose, className }: PnfChatbotPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: GREETING,
      createdAt: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const question = input.trim();

    const outgoing: ChatMessage = {
      role: 'user',
      content: question,
      createdAt: Date.now(),
    };

    setMessages((current) => [...current, outgoing]);
    setInput('');
    setIsLoading(true);

    const history = [...messages, outgoing].map(
      (m) => `${m.role}: ${m.content}`,
    );

    try {
      const response = await fetch('/api/pnf-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          chatHistory: history,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to contact formulary assistant');
      }

      const payload = await response.json();

      const assistant: ChatMessage = {
        role: 'assistant',
        content: payload.answer,
        citations: payload.citations ?? payload.sources,
        createdAt: Date.now(),
        latencyMs: payload.latencyMs,
      };

      setMessages((current) => [...current, assistant]);
    } catch (error) {
      console.error(error);
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            'Sorry, I could not reach the formulary right now. Please try again later.',
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card
      className={cn(
        'w-full h-full max-h-[85vh] flex flex-col border border-blue-100 shadow-md overflow-hidden rounded-xl py-0 gap-0 min-h-0',
        className,
      )}
    >
      <div className="px-4 py-3 border-b bg-gradient-to-r from-blue-600 to-blue-500 text-white flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6" />
          <div className="flex flex-col text-sm">
            <span className="font-semibold">
              BOTica Drug Reference Assistant
            </span>
            <span className="text-xs text-blue-100">
              Based on the Philippine National Formulary
            </span>
          </div>
        </div>
        {onClose ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-full h-8 w-8"
            onClick={onClose}
            aria-label="Close PNF assistant"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-4 p-3 bg-slate-50 min-h-0"
        >
          {messages.map((message, index) => {
            const citationSummaries = summarizeCitations(message.citations);

            return (
              <div key={index} className="flex flex-col gap-2">
                <div
                  className={`max-w-[100%] rounded-xl p-2 text-xs shadow-sm whitespace-pre-line ${
                    message.role === 'assistant'
                      ? 'bg-white border border-slate-200 text-slate-900'
                      : 'bg-blue-600 text-white self-end'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    renderAssistantContent(message)
                  ) : (
                    <p className="text-xs leading-relaxed">{message.content}</p>
                  )}
                </div>
                {message.role === 'assistant' ? (
                  <div className="ml-1 mt-1">
                    {renderTimestamp(message.createdAt, message.latencyMs)}
                  </div>
                ) : null}

                {message.role === 'assistant' && citationSummaries.length ? (
                  <div className="ml-4 space-y-1.5 text-[10px] text-slate-600">
                    {citationSummaries.map((summary) => (
                      <div
                        key={summary.id}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-2 shadow-sm"
                      >
                        <span className="font-semibold text-slate-700">
                          Source:
                        </span>{' '}
                        Philippine National Formulary
                        {summary.pageRange ? ` (pp. ${summary.pageRange})` : ''}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage();
          }}
          className="border-t p-2 bg-white flex gap-2 items-center"
        >
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about drug related questions..."
            className="text-xs flex-1"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="sm"
            className="rounded-full bg-blue-600 hover:bg-blue-700"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <Activity className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizonal className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function FloatingPnfAssistant({
  defaultOpen = false,
  className,
}: Omit<PnfChatbotProps, 'variant'>) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40"
          role="presentation"
          onClick={() => setIsOpen(false)}
        />
      ) : null}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {isOpen ? (
          <div className="w-[380px] max-w-[calc(100vw-3rem)] h-[560px] max-h-[calc(100vh-8rem)] shadow-2xl">
            <PnfChatbotPanel
              onClose={() => setIsOpen(false)}
              className={cn('h-full min-h-0', className)}
            />
          </div>
        ) : null}
        <Button
          onClick={() => setIsOpen((prev) => !prev)}
          size="lg"
          className="rounded-full p-4 bg-gradient-to-br from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg transition-all hover:scale-105"
          aria-pressed={isOpen}
        >
          <Bot className="text-white w-6 h-6" />
          <span className="sr-only">Toggle PNF Assistant</span>
        </Button>
      </div>
    </>
  );
}

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
