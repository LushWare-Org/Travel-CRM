import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Clock, Loader2, Send, CheckCheck, User, Bot } from 'lucide-react';
import toast from 'react-hot-toast';
import { leadAPI } from '../../../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

interface CommunicationLog {
  id: string;
  type: string;
  notes: string;
  date: string;
}

interface Lead {
  _id?: string;
  id?: string;
  name: string;
  whatsapp?: string;
  phone?: string;
}

/** Direction/kind is encoded as a prefix on the note text by the backend
 * (see Services/lead-service's logCommunication / sendWhatsappReply) —
 * there's no separate column for it. */
function classify(notes = ''): { kind: 'inbound' | 'agent' | 'status' | 'system'; text: string } {
  if (notes.startsWith('WhatsApp (customer): ')) return { kind: 'inbound', text: notes.replace('WhatsApp (customer): ', '') };
  if (notes.startsWith('WhatsApp (agent): ')) return { kind: 'agent', text: notes.replace('WhatsApp (agent): ', '') };
  if (notes.startsWith('WhatsApp status: ')) return { kind: 'status', text: notes.replace('WhatsApp status: ', '') };
  if (notes.startsWith('WhatsApp: ')) return { kind: 'system', text: notes.replace('WhatsApp: ', '') };
  return { kind: 'system', text: notes };
}

const formatTime = (date: string) =>
  new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

interface WhatsAppHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSuccess?: () => void;
}

const WhatsAppHistoryDialog = ({ isOpen, onClose, lead, onSuccess }: WhatsAppHistoryDialogProps) => {
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState('');

  const leadId = lead?._id || lead?.id;

  const load = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const res = await leadAPI.getLead(leadId);
      const data = res?.data ?? res;
      setLogs((data?.communicationLogs || []).filter((l: CommunicationLog) => l.type === 'whatsapp'));
    } catch (err: any) {
      toast.error(err.message || 'Failed to load WhatsApp history');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (isOpen && leadId) load();
  }, [isOpen, leadId, load]);

  if (!lead) return null;

  const sorted = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const lastInbound = [...sorted].reverse().find((l) => classify(l.notes).kind === 'inbound');
  const sessionOpen = lastInbound && Date.now() - new Date(lastInbound.date).getTime() < SESSION_WINDOW_MS;
  const phone = lead.whatsapp || lead.phone;

  const handleSend = async () => {
    if (!replyText.trim() || !leadId) return;
    try {
      setSending(true);
      await leadAPI.sendWhatsappReply(leadId, replyText.trim());
      setReplyText('');
      await load();
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send WhatsApp reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden flex flex-col gap-0">
        <DialogHeader className="bg-primary text-primary-foreground p-6 shrink-0 space-y-0">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary-foreground/10">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-primary-foreground">WhatsApp</DialogTitle>
              <DialogDescription className="text-primary-foreground/80 mt-0.5">
                {lead.name} • {phone || 'No number on file'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-muted/30">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : sorted.length > 0 ? (
            <div className="space-y-3">
              {sorted.map((log) => {
                const { kind, text } = classify(log.notes);
                if (kind === 'status') {
                  return (
                    <div key={log.id} className="text-center text-xs text-muted-foreground">
                      {text} · {formatTime(log.date)}
                    </div>
                  );
                }
                const isInbound = kind === 'inbound';
                return (
                  <div key={log.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      isInbound ? 'bg-card border border-border' : 'bg-primary text-primary-foreground'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
                      <div className={`flex items-center gap-1 mt-1 text-xs ${isInbound ? 'text-muted-foreground' : 'text-primary-foreground/80'}`}>
                        {isInbound ? <User className="w-3 h-3" /> : kind === 'agent' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                        <span>{formatTime(log.date)}</span>
                        {!isInbound && <CheckCheck className="w-3 h-3 ml-0.5" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-foreground mb-1">No WhatsApp activity yet</p>
              <p className="text-sm text-muted-foreground">Sent documents and customer replies will show up here</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border shrink-0">
          {!phone ? (
            <p className="text-sm text-muted-foreground text-center">This lead has no phone number on file.</p>
          ) : sessionOpen ? (
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !sending && handleSend()}
                placeholder="Reply to the customer..."
                disabled={sending}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={sending || !replyText.trim()} size="icon">
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-warning/10 border border-warning/20 rounded-xl px-4 py-3">
              <Clock className="w-4 h-4 text-warning shrink-0" />
              <span>
                No live 24h session with this customer — a free-form reply isn't allowed. Send a Quotation, Invoice,
                Receipt, or Voucher instead to reach them via an approved WhatsApp template.
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppHistoryDialog;
