import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Send } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { fetchConversations, fetchMessages, sendMessage } from '../../api/marketplaceApi';
import { MarketplaceConversation } from '../../api/marketplaceApi';
import { MarketplaceMessage } from '../../types';
import { trackUiAction } from '../../utils/interaction';
import { toast } from 'sonner';

export function MessagesPanel() {
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<MarketplaceConversation[]>([]);
  const [selectedPeerId, setSelectedPeerId] = useState(searchParams.get('peer') || '');
  const [messages, setMessages] = useState<MarketplaceMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.peer.user_id === selectedPeerId) || null,
    [conversations, selectedPeerId],
  );

  const loadConversations = async () => {
    setLoadingConversations(true);
    setError('');
    try {
      const response = await fetchConversations();
      setConversations(response);
      if (!selectedPeerId && response.length > 0) {
        setSelectedPeerId(response[0].peer.user_id);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load conversations.');
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (peerId: string) => {
    if (!peerId) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    try {
      const response = await fetchMessages(peerId);
      setMessages(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load messages.');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    void loadConversations();
  }, []);

  useEffect(() => {
    void loadMessages(selectedPeerId);
  }, [selectedPeerId]);

  const handleSend = async () => {
    if (!selectedPeerId || !draft.trim()) {
      return;
    }
    try {
      await sendMessage({
        receiver_id: selectedPeerId,
        message: draft.trim(),
      });
      trackUiAction('send_message', 'messages_panel', { peerId: selectedPeerId });
      setDraft('');
      await loadMessages(selectedPeerId);
      await loadConversations();
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'Unable to send message.');
    }
  };

  if (loadingConversations) {
    return <div className="p-6">Loading messages...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-primary to-accent text-white px-6 py-5 shadow-lg">
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-sm text-white/80 mt-1">Connect with clients and workers</p>
      </div>

      <div className="px-6 py-5 space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white border rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-2">Conversations</p>
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No conversations yet.</p>
          ) : (
            <div className="space-y-2">
              {conversations.map((item) => (
                <button
                  key={item.peer.user_id}
                  onClick={() => {
                    trackUiAction('select_conversation', 'messages_panel', { peerId: item.peer.user_id });
                    setSelectedPeerId(item.peer.user_id);
                  }}
                  className={`w-full text-left border rounded-lg p-3 active:scale-[0.99] transition-transform ${
                    selectedPeerId === item.peer.user_id ? 'border-primary bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{item.peer.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{item.lastMessage.message}</p>
                    </div>
                    {item.unreadCount > 0 && (
                      <span className="min-w-5 h-5 rounded-full bg-primary text-white text-[11px] px-1 flex items-center justify-center">
                        {item.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-2">
            {selectedConversation ? `Chat with ${selectedConversation.peer.name}` : 'Select a conversation'}
          </p>
          <div className="max-h-80 overflow-y-auto space-y-2 mb-3">
            {loadingMessages ? (
              <p className="text-sm text-muted-foreground">Loading chat...</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No messages yet.</p>
            ) : (
              messages.map((message) => (
                <div key={message.message_id} className="border rounded-lg p-2 text-sm">
                  <p>{message.message}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{new Date(message.timestamp).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleSend();
                }
              }}
            />
            <Button type="button" onClick={() => void handleSend()} disabled={!selectedPeerId || !draft.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
