import { useState, useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType } from '../../types';
import { ChatMessage } from '../../components/ChatMessage';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Send, Sparkles, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { fetchSuggestedPrompts, queryAssistant } from '../../api/marketplaceApi';

function makeMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function Home() {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I\'m your AI assistant. How can I help you find the perfect service today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let active = true;
    fetchSuggestedPrompts()
      .then((prompts) => {
        if (active) {
          setSuggestedPrompts(prompts);
        }
      })
      .catch(() => {
        if (active) {
          setSuggestedPrompts([
            'Find vet near me',
            'Book electrician',
            'Home cleaning tomorrow',
            'Emergency plumber',
          ]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSend = async (message?: string) => {
    const text = message || input;
    if (!text.trim()) return;

    const userMessage: ChatMessageType = {
      id: makeMessageId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await queryAssistant(text);
      setMessages((prev) => [
        ...prev,
        {
          id: makeMessageId(),
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
          serviceResults: response.serviceResults,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: makeMessageId(),
          role: 'assistant',
          content: 'I could not fetch live results right now. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-accent text-white px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-semibold">Global Shreni</h1>
              <p className="text-xs text-white/80">AI-Powered Services</p>
            </div>
          </div>
          <button className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-sm">
            <MapPin className="w-4 h-4" />
            <span className="text-xs">Bangalore</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h2 className="text-lg font-semibold mb-3">Suggested prompts</h2>
            <div className="grid grid-cols-2 gap-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="bg-gradient-to-br from-blue-50 to-purple-50 border border-primary/20 rounded-xl p-3 text-sm text-left hover:shadow-md transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-white p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything..."
            className="flex-1 h-12 bg-input-background border-0 rounded-xl"
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim()}
            size="icon"
            className="h-12 w-12 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
