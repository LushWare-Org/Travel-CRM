import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTripWizard } from '../hooks/useTripWizard';
import ChatTranscript from './ChatTranscript';
import { formatCurrency } from '../../../lib/currency';

const GREETING =
  "Hi! Tell me about the trip you're dreaming of and I'll find real packages that match — where, how long, how many travelers, and any budget or preferences?";

export default function TripWizardPanel() {
  const wizard = useTripWizard();
  const [input, setInput] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const navigate = useNavigate();

  // complete_wizard always terminates on a real, server-validated package —
  // navigate straight into the existing customize flow, pre-filled with
  // whatever slots the wizard gathered along the way.
  useEffect(() => {
    if (!wizard.completedPackage) return;
    navigate(`/package/${wizard.completedPackage.id}/customize`, {
      state: {
        travelers: wizard.wizardState.slots?.travelers,
        preferences: wizard.wizardState.slots?.preferences,
      },
    });
  }, [wizard.completedPackage, navigate, wizard.wizardState.slots]);

  const handleSend = () => {
    const text = input;
    setInput('');
    void wizard.send(text);
  };

  const hasContactMethod = Boolean(contactEmail.trim() || contactPhone.trim() || contactWhatsapp.trim());

  const handleContactSubmit = () => {
    const parts: string[] = [];
    if (contactName.trim()) parts.push(`my name is ${contactName.trim()}`);
    if (contactEmail.trim()) parts.push(`my email is ${contactEmail.trim()}`);
    if (contactPhone.trim()) parts.push(`my phone number is ${contactPhone.trim()}`);
    if (contactWhatsapp.trim()) parts.push(`my WhatsApp is ${contactWhatsapp.trim()}`);
    if (parts.length === 0) return;
    void wizard.send(`Here's my contact info: ${parts.join(', ')}.`);
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setContactWhatsapp('');
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <ChatTranscript greeting={GREETING} messages={wizard.messages} isSending={wizard.isSending} />

      {wizard.error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 flex items-center justify-between gap-2">
          <p className="text-xs text-red-700">{wizard.error}</p>
          <button type="button" onClick={wizard.retry} className="text-xs font-semibold text-red-700 underline shrink-0">
            Retry
          </button>
        </div>
      )}

      {wizard.wizardError && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-200">
          <p className="text-xs text-amber-800">{wizard.wizardError}</p>
        </div>
      )}

      {wizard.policyAnswer && (
        <div className="p-4 border-t border-gray-200 bg-blue-50">
          {wizard.policyAnswer.answered ? (
            <div className="space-y-2">
              {wizard.policyAnswer.snippets?.map((s) => (
                <blockquote key={s.docId} className="text-sm text-gray-800 border-l-4 border-brand-400 pl-3">
                  <p>{s.quote}</p>
                  <cite className="text-xs text-gray-500 not-italic">— {s.title}</cite>
                </blockquote>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-700">
              {wizard.policyAnswer.fallbackMessage}
              {wizard.policyAnswer.supportEmail && (
                <>
                  {' '}
                  Contact us at{' '}
                  <a className="underline" href={`mailto:${wizard.policyAnswer.supportEmail}`}>
                    {wizard.policyAnswer.supportEmail}
                  </a>
                  .
                </>
              )}
            </p>
          )}
        </div>
      )}

      {wizard.packages && (
        <div className="p-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {wizard.packages.length === 0 ? (
            <p className="text-sm text-gray-600 col-span-2">No matching packages yet — try adjusting your budget or destination.</p>
          ) : (
            wizard.packages.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                onClick={() => wizard.selectPackage(pkg)}
                disabled={wizard.isSending}
                className="text-left border border-gray-200 rounded-xl p-3 hover:border-brand-400 hover:shadow-md transition-all disabled:opacity-50"
              >
                <p className="font-semibold text-sm text-gray-900">{pkg.title}</p>
                <p className="text-xs text-gray-600">{pkg.destination} · {pkg.durationDays} days</p>
                <p className="text-sm font-bold text-brand-600 mt-1">{formatCurrency(pkg.sellPrice)}</p>
              </button>
            ))
          )}
        </div>
      )}

      {wizard.contactPrompt && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleContactSubmit();
          }}
          className="p-4 border-t border-gray-200 bg-blue-50 space-y-2"
        >
          <p className="text-sm font-medium text-gray-800">How should we reach you with the best options?</p>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Phone"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <input
              type="text"
              value={contactWhatsapp}
              onChange={(e) => setContactWhatsapp(e.target.value)}
              placeholder="WhatsApp"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!hasContactMethod || wizard.isSending}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-brand-600 to-brand-accent-600 text-white disabled:opacity-50"
            >
              Send contact info
            </button>
          </div>
        </form>
      )}

      <div className="p-3 border-t border-gray-200 bg-white flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
          placeholder="Tell us about your trip..."
          disabled={wizard.isSending}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={wizard.isSending || !input.trim()}
          className="w-10 h-10 rounded-xl bg-gradient-to-r from-brand-600 to-brand-accent-600 text-white flex items-center justify-center disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
