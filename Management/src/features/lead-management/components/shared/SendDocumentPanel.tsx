import { Mail, MessageCircle, Send, Loader2 } from 'lucide-react';
import { ChannelTab } from './BillingPrimitives';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SendDocumentPanelProps {
  channel: 'email' | 'whatsapp';
  onChannelChange: (channel: 'email' | 'whatsapp') => void;
  email: string;
  onEmailChange: (email: string) => void;
  phone: string;
  onPhoneChange: (phone: string) => void;
  onSend: () => void;
  sending: boolean;
}

/**
 * Channel-tab email/WhatsApp send panel shared by InvoiceDialog and
 * ReceiptDialog so both billing documents send through the same UI and the
 * same backend contract (`POST .../:id/send` with `{ channel, email, phone }`).
 */
const SendDocumentPanel = ({ channel, onChannelChange, email, onEmailChange, phone, onPhoneChange, onSend, sending }: SendDocumentPanelProps) => (
  <Card className="p-5">
    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Send via</p>
    <div className="mb-3 inline-flex rounded-lg border border-border p-1">
      <ChannelTab active={channel === 'email'} onClick={() => onChannelChange('email')} icon={Mail} label="Email" />
      <ChannelTab active={channel === 'whatsapp'} onClick={() => onChannelChange('whatsapp')} icon={MessageCircle} label="WhatsApp" />
    </div>
    {channel === 'email' ? (
      <Input
        type="email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        placeholder="recipient@email.com"
      />
    ) : (
      <Input
        type="tel"
        value={phone}
        onChange={(e) => onPhoneChange(e.target.value)}
        placeholder="+1 555 123 4567"
      />
    )}
    <Button onClick={onSend} disabled={sending} className="mt-3 w-full">
      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      {sending ? 'Sending…' : `Send via ${channel === 'email' ? 'Email' : 'WhatsApp'}`}
    </Button>
  </Card>
);

export default SendDocumentPanel;
