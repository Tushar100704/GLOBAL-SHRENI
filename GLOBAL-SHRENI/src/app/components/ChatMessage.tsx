import { ChatMessage as ChatMessageType } from '../types';
import { ServiceCard } from './ServiceCard';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end mb-4"
      >
        <div className="bg-gradient-to-r from-primary to-accent text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
          <p className="text-sm">{message.content}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start mb-4"
    >
      <div className="max-w-[85%]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs text-muted-foreground">AI Assistant</span>
        </div>

        {message.content && (
          <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 mb-3">
            <p className="text-sm">{message.content}</p>
          </div>
        )}

        {message.serviceResults && message.serviceResults.length > 0 && (
          <div className="space-y-3">
            {message.serviceResults.map((partner) => (
              <ServiceCard key={partner.id} partner={partner} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
