import { Mail, MessageCircle, Send, Loader2 } from 'lucide-react';
import { ChannelTab } from './BillingPrimitives';

/**
 * Channel-tab email/WhatsApp send panel shared by InvoiceDialog and
 * ReceiptDialog so both billing documents send through the same UI and the
 * same backend contract (`POST .../:id/send` with `{ channel, email, phone }`).
 */
const SendDocumentPanel = ({ channel, onChannelChange, email, onEmailChange, phone, onPhoneChange, onSend, sending }) => (
  <div className="rounded-xl border border-slate-200 p-5">
    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Send via</p>
    <div className="mb-3 inline-flex rounded-lg border border-slate-200 p-1">
      <ChannelTab active={channel === 'email'} onClick={() => onChannelChange('email')} icon={Mail} label="Email" />
      <ChannelTab active={channel === 'whatsapp'} onClick={() => onChannelChange('whatsapp')} icon={MessageCircle} label="WhatsApp" />
    </div>
    {channel === 'email' ? (
      <input
        type="email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        placeholder="recipient@email.com"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      />
    ) : (
      <input
        type="tel"
        value={phone}
        onChange={(e) => onPhoneChange(e.target.value)}
        placeholder="+1 555 123 4567"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      />
    )}
    <button
      onClick={onSend}
      disabled={sending}
      className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
    >
      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      {sending ? 'Sending…' : `Send via ${channel === 'email' ? 'Email' : 'WhatsApp'}`}
    </button>
  </div>
);

export default SendDocumentPanel;
