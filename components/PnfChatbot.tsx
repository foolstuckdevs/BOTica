'use client';

import { useState, useRef, useEffect } from 'react';
import { SendHorizonal, Activity, Bot, Clock, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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

const GREETING = `Good day. I'm BOTica Drug Reference Assistant. How can I help you?`;

const SAMPLE_QUESTIONS = [
  'What is the dosage for Paracetamol?',
  'Tell me about amoxicillin side effects',
  'What are contraindications for Sodium Bicarbonate?',
  'What are the drug interactions for Aluminum Hydroxide?',
];

function extractDrugCandidate(text: string): string | undefined {
  const match = text.match(
    /(?:about|regarding|info on|information on|for| versus | vs\.? )\s+([a-z0-9][a-z0-9\s\-]+)/i,
  );

  if (match?.[1]) {
    const cleaned = match[1]
      .replace(/[?.!,]/g, ' ')
      .split(' ')
      .map((word) => word.trim())
      .filter(Boolean)
      .slice(0, 3) // capture up to first few tokens (e.g., "sodium chloride")
      .join(' ')
      .trim();

    if (cleaned.length > 2) {
      return cleaned;
    }
  }

  return undefined;
}

function renderAssistantContent(message: ChatMessage) {
  return message.content.split('\n').map((line, index) => {
    // Match section headings (e.g., "Overview:", "Dosage:", etc.)
    const isHeading = /^\s*[A-Z][A-Za-z\s]+:\s*$/.test(line);
    if (isHeading) {
      return (
        <p
          key={index}
          className="text-xs font-bold text-slate-900 mt-3 first:mt-0 mb-1.5"
        >
          {line.replace(/:\s*$/, '')}
        </p>
      );
    }

    if (!line.trim()) {
      return <div key={index} className="h-2" />;
    }

    // Render regular content lines
    return (
      <p key={index} className="text-xs text-slate-700 leading-[1.6]">
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

function SuggestionChips({
  onSelect,
  disabled,
}: {
  onSelect: (question: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3 mt-3">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="h-3.5 w-3.5 text-blue-600" />
        <p className="text-xs font-semibold text-slate-700">
          Suggested Questions
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {SAMPLE_QUESTIONS.map((question, index) => (
          <button
            key={index}
            onClick={() => onSelect(question)}
            disabled={disabled}
            className="group text-left text-xs px-4 py-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-50/50 border border-blue-100 text-slate-700 hover:from-blue-100 hover:to-blue-50 hover:border-blue-200 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-start gap-2"
          >
            <span className="text-blue-600 font-medium mt-0.5 group-hover:translate-x-0.5 transition-transform">
              →
            </span>
            <span className="flex-1 leading-relaxed">{question}</span>
          </button>
        ))}
      </div>
    </div>
  );
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
  const [lastDrugDiscussed, setLastDrugDiscussed] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSuggestionClick = (question: string) => {
    setInput(question);
    // Auto-send the question
    sendMessage(question);
  };

  const sendMessage = async (presetQuestion?: string) => {
    const question = presetQuestion || input.trim();
    if (!question) return;

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

    const candidate = extractDrugCandidate(question);
    let contextHint = lastDrugDiscussed || undefined;

    if (candidate) {
      const candidateNormalized = candidate.toLowerCase();
      if (
        lastDrugDiscussed &&
        lastDrugDiscussed.toLowerCase() !== candidateNormalized
      ) {
        contextHint = undefined;
      } else if (!lastDrugDiscussed) {
        contextHint = candidate;
      }
    }

    try {
      const response = await fetch('/api/pnf-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          chatHistory: history,
          lastDrugDiscussed: contextHint,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to contact formulary assistant');
      }

      const payload = await response.json();

      // Update the drug context for next question
      if (typeof payload.drugContext === 'string') {
        setLastDrugDiscussed(payload.drugContext);
      }

      const assistant: ChatMessage = {
        role: 'assistant',
        content: payload.answer,
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
        'w-full h-full max-h-[85vh] flex flex-col border border-gray-200 shadow-lg overflow-hidden rounded-2xl py-0 gap-0 min-h-0',
        className,
      )}
    >
      <div className="px-4 py-4 border-b bg-white flex items-center justify-between gap-3">
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
            aria-label="Close PNF assistant"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-4 p-4 bg-gradient-to-b from-slate-50 to-white min-h-0"
        >
          {messages.map((message, index) => (
            <div key={index} className="flex flex-col gap-2">
              <div
                className={`max-w-[100%] rounded-2xl p-3.5 text-xs shadow-sm whitespace-pre-line ${
                  message.role === 'assistant'
                    ? 'bg-white border border-gray-200 text-slate-900'
                    : 'bg-gradient-to-br from-blue-600 to-blue-500 text-white self-end shadow-md'
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
              {/* Show suggestion chips after the greeting (first message) */}
              {index === 0 && messages.length === 1 && !isLoading ? (
                <div className="mt-2">
                  <SuggestionChips
                    onSelect={handleSuggestionClick}
                    disabled={isLoading}
                  />
                </div>
              ) : null}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
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
          className="border-t border-gray-200 p-3 bg-white flex gap-2 items-center"
        >
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about dosage, side effects, contraindications..."
            className="text-sm flex-1 h-11 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="sm"
            className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-sm hover:shadow transition-all"
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
        <div
          aria-hidden={!isOpen}
          className={cn(
            'w-[400px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-8rem)] shadow-2xl',
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
