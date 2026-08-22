import { useState, useEffect, useCallback } from 'react';
import { X, MessageCircle, Clock, Loader2, Send, CheckCheck, User, Bot } from 'lucide-react';
import toast from 'react-hot-toast';
import { leadAPI } from '../../../services/api';

const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Direction/kind is encoded as a prefix on the note text by the backend
 * (see Services/lead-service's logCommunication / sendWhatsappReply) —
 * there's no separate column for it. */
function classify(notes = '') {
  if (notes.startsWith('WhatsApp (customer): ')) return { kind: 'inbound', text: notes.replace('WhatsApp (customer): ', '') };
  if (notes.startsWith('WhatsApp (agent): ')) return { kind: 'agent', text: notes.replace('WhatsApp (agent): ', '') };
  if (notes.startsWith('WhatsApp status: ')) return { kind: 'status', text: notes.replace('WhatsApp status: ', '') };
  if (notes.startsWith('WhatsApp: ')) return { kind: 'system', text: notes.replace('WhatsApp: ', '') };
  return { kind: 'system', text: notes };
}

const formatTime = (date) =>
  new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const WhatsAppHistoryDialog = ({ isOpen, onClose, lead, onSuccess }) => {
  const [logs, setLogs] = useState([]);
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
      setLogs((data?.communicationLogs || []).filter((l) => l.type === 'whatsapp'));
    } catch (err) {
      toast.error(err.message || 'Failed to load WhatsApp history');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (isOpen && leadId) load();
  }, [isOpen, leadId, load]);

  if (!isOpen || !lead) return null;

  const sorted = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));
  const lastInbound = [...sorted].reverse().find((l) => classify(l.notes).kind === 'inbound');
  const sessionOpen = lastInbound && Date.now() - new Date(lastInbound.date).getTime() < SESSION_WINDOW_MS;
  const phone = lead.whatsapp || lead.phone;

  const handleSend = async () => {
    if (!replyText.trim()) return;
    try {
      setSending(true);
      await leadAPI.sendWhatsappReply(leadId, replyText.trim());
      setReplyText('');
      await load();
      onSuccess?.();
    } catch (err) {
      toast.error(err.message || 'Failed to send WhatsApp reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">WhatsApp</h2>
                <p className="text-sm text-green-100 mt-0.5">{lead.name} • {phone || 'No number on file'}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
            </div>
          ) : sorted.length > 0 ? (
            <div className="space-y-3">
              {sorted.map((log) => {
                const { kind, text } = classify(log.notes);
                if (kind === 'status') {
                  return (
                    <div key={log.id} className="text-center text-xs text-gray-400">
                      {text} · {formatTime(log.date)}
                    </div>
                  );
                }
                const isInbound = kind === 'inbound';
                return (
                  <div key={log.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      isInbound ? 'bg-white border border-gray-200' : 'bg-green-600 text-white'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
                      <div className={`flex items-center gap-1 mt-1 text-[11px] ${isInbound ? 'text-gray-400' : 'text-green-100'}`}>
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
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-lg font-semibold text-gray-600 mb-1">No WhatsApp activity yet</p>
              <p className="text-sm text-gray-400">Sent documents and customer replies will show up here</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          {!phone ? (
            <p className="text-sm text-gray-400 text-center">This lead has no phone number on file.</p>
          ) : sessionOpen ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !sending && handleSend()}
                placeholder="Reply to the customer..."
                disabled={sending}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={sending || !replyText.trim()}
                className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 shadow-lg shadow-green-500/25"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                No live 24h session with this customer — a free-form reply isn't allowed. Send a Quotation, Invoice,
                Receipt, or Voucher instead to reach them via an approved WhatsApp template.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppHistoryDialog;
