import { useEffect, useState } from 'react';
import { Building2, Save, Upload, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI, uploadAPI } from '../services/api';

const EMPTY_FORM = {
  companyName: '', companyShortName: '', companyLegalName: '', tagline: '', logoUrl: '',
  contactEmail: '', salesEmail: '', supportEmail: '', contactPhone: '', whatsappNumber: '', website: '',
  themeInk: '', themeMuted: '', themeAccent: '', themeAccentDark: '',
  defaultCurrency: '', defaultTaxRate: '', defaultServiceChargeRate: '', quotationValidityDays: '',
  quotationTerms: '', cancellationPolicy: '', ratingTagline: '',
  paymentMethods: '',
  docPrefixQuotation: '', docPrefixInvoice: '', docPrefixReceipt: '',
  docPrefixPayment: '', docPrefixCreditNote: '', docPrefixVoucher: '',
  bankName: '', bankAccountName: '', bankAccountNumber: '', bankIfscCode: '',
  bankSwiftCode: '', bankBranch: '', bankAccountType: '', upiId: '',
};

const NULLABLE_FIELDS = [
  'companyShortName', 'companyLegalName', 'tagline', 'logoUrl',
  'contactEmail', 'salesEmail', 'supportEmail', 'contactPhone', 'whatsappNumber', 'website',
  'themeInk', 'themeMuted', 'themeAccent', 'themeAccentDark',
  'quotationTerms', 'cancellationPolicy', 'ratingTagline',
  'bankName', 'bankAccountName', 'bankAccountNumber', 'bankIfscCode',
  'bankSwiftCode', 'bankBranch', 'bankAccountType', 'upiId',
];

const settingsToForm = (settings) => ({
  companyName: settings.companyName ?? '',
  companyShortName: settings.companyShortName ?? '',
  companyLegalName: settings.companyLegalName ?? '',
  tagline: settings.tagline ?? '',
  logoUrl: settings.logoUrl ?? '',
  contactEmail: settings.contactEmail ?? '',
  salesEmail: settings.salesEmail ?? '',
  supportEmail: settings.supportEmail ?? '',
  contactPhone: settings.contactPhone ?? '',
  whatsappNumber: settings.whatsappNumber ?? '',
  website: settings.website ?? '',
  themeInk: settings.themeInk ?? '',
  themeMuted: settings.themeMuted ?? '',
  themeAccent: settings.themeAccent ?? '',
  themeAccentDark: settings.themeAccentDark ?? '',
  defaultCurrency: settings.defaultCurrency ?? '',
  defaultTaxRate: settings.defaultTaxRate ?? '',
  defaultServiceChargeRate: settings.defaultServiceChargeRate ?? '',
  quotationValidityDays: settings.quotationValidityDays ?? '',
  quotationTerms: settings.quotationTerms ?? '',
  cancellationPolicy: settings.cancellationPolicy ?? '',
  ratingTagline: settings.ratingTagline ?? '',
  paymentMethods: (settings.paymentMethods || []).join(', '),
  docPrefixQuotation: settings.docNumberPrefixes?.quotation ?? '',
  docPrefixInvoice: settings.docNumberPrefixes?.invoice ?? '',
  docPrefixReceipt: settings.docNumberPrefixes?.receipt ?? '',
  docPrefixPayment: settings.docNumberPrefixes?.payment ?? '',
  docPrefixCreditNote: settings.docNumberPrefixes?.creditNote ?? '',
  docPrefixVoucher: settings.docNumberPrefixes?.voucher ?? '',
  bankName: settings.bankName ?? '',
  bankAccountName: settings.bankAccountName ?? '',
  bankAccountNumber: settings.bankAccountNumber ?? '',
  bankIfscCode: settings.bankIfscCode ?? '',
  bankSwiftCode: settings.bankSwiftCode ?? '',
  bankBranch: settings.bankBranch ?? '',
  bankAccountType: settings.bankAccountType ?? '',
  upiId: settings.upiId ?? '',
});

const formToPayload = (form) => {
  const payload = { companyName: form.companyName };
  for (const field of NULLABLE_FIELDS) {
    payload[field] = form[field].trim() === '' ? null : form[field];
  }
  payload.defaultCurrency = form.defaultCurrency.trim().toUpperCase() || 'USD';
  payload.defaultTaxRate = form.defaultTaxRate === '' ? null : Number(form.defaultTaxRate);
  payload.defaultServiceChargeRate = form.defaultServiceChargeRate === '' ? null : Number(form.defaultServiceChargeRate);
  payload.quotationValidityDays = form.quotationValidityDays === '' ? 30 : Number(form.quotationValidityDays);
  payload.paymentMethods = form.paymentMethods
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  payload.docNumberPrefixes = {
    quotation: form.docPrefixQuotation.trim() || undefined,
    invoice: form.docPrefixInvoice.trim() || undefined,
    receipt: form.docPrefixReceipt.trim() || undefined,
    payment: form.docPrefixPayment.trim() || undefined,
    creditNote: form.docPrefixCreditNote.trim() || undefined,
    voucher: form.docPrefixVoucher.trim() || undefined,
  };
  return payload;
};

function Field({ label, helperText, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        {...props}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
      />
      {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
    </div>
  );
}

function TextAreaField({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <textarea
        {...props}
        rows={4}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
      />
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

const OrganizationSettings = () => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const response = await adminAPI.getSettings();
        if (response.status === 'success' && response.data?.settings) {
          setForm(settingsToForm(response.data.settings));
        }
      } catch (err) {
        toast.error(err.message || 'Failed to load organization settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const response = await uploadAPI.uploadSingle(file);
      if (response.success && response.data?.url) {
        setForm((f) => ({ ...f, logoUrl: response.data.url }));
        toast.success('Logo uploaded');
      } else {
        toast.error(response.message || 'Logo upload failed');
      }
    } catch (err) {
      toast.error(err.message || 'Logo upload failed');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!form.companyName.trim()) {
      toast.error('Company name is required');
      return;
    }
    setSaving(true);
    try {
      const response = await adminAPI.updateSettings(formToPayload(form));
      if (response.status === 'success' && response.data?.settings) {
        setForm(settingsToForm(response.data.settings));
        toast.success('Organization settings saved');
      } else {
        toast.error(response.message || 'Failed to save settings');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gray-900 rounded-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Organization Settings</h1>
              <p className="text-sm text-gray-500">
                Company identity, branding, and quotation defaults used across the CRM
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <Section title="Company Identity" description="Shown on quotations, invoices, and the Management sidebar">
          <Field label="Company Name" required value={form.companyName} onChange={set('companyName')} />
          <Field label="Short Name" value={form.companyShortName} onChange={set('companyShortName')} />
          <Field label="Legal Name" value={form.companyLegalName} onChange={set('companyLegalName')} />
          <Field label="Tagline" value={form.tagline} onChange={set('tagline')} />
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo</label>
            <div className="flex items-center gap-3">
              {form.logoUrl && (
                <img src={form.logoUrl} alt="Logo preview" className="h-10 w-auto rounded border border-gray-200" />
              )}
              <label className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploadingLogo ? 'Uploading...' : 'Upload logo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
              </label>
            </div>
          </div>
        </Section>

        <Section title="Contact & Web">
          <Field label="Contact Email" type="email" value={form.contactEmail} onChange={set('contactEmail')} />
          <Field label="Sales Email" type="email" value={form.salesEmail} onChange={set('salesEmail')} />
          <Field label="Support Email" type="email" value={form.supportEmail} onChange={set('supportEmail')} />
          <Field label="Phone" value={form.contactPhone} onChange={set('contactPhone')} />
          <Field label="WhatsApp Number" value={form.whatsappNumber} onChange={set('whatsappNumber')} />
          <Field label="Website" value={form.website} onChange={set('website')} />
        </Section>

        <Section title="Quotation PDF Theme" description="Colors used on generated quotation and invoice PDFs">
          <Field label="Ink (text)" type="color" value={form.themeInk || '#1F2937'} onChange={set('themeInk')} />
          <Field label="Muted text" type="color" value={form.themeMuted || '#64748B'} onChange={set('themeMuted')} />
          <Field label="Accent" type="color" value={form.themeAccent || '#F5A623'} onChange={set('themeAccent')} />
          <Field label="Accent (dark)" type="color" value={form.themeAccentDark || '#D98A0B'} onChange={set('themeAccentDark')} />
        </Section>

        <Section title="Quotation Defaults" description="Used whenever a quotation doesn't specify its own values">
          <Field label="Default Currency" maxLength={3} value={form.defaultCurrency} onChange={set('defaultCurrency')} helperText="3-letter code, e.g. USD" />
          <Field label="Validity (days)" type="number" min="1" value={form.quotationValidityDays} onChange={set('quotationValidityDays')} />
          <Field label="Default Tax Rate (%)" type="number" min="0" max="100" step="0.01" value={form.defaultTaxRate} onChange={set('defaultTaxRate')} />
          <Field label="Default Service Charge Rate (%)" type="number" min="0" max="100" step="0.01" value={form.defaultServiceChargeRate} onChange={set('defaultServiceChargeRate')} />
          <Field label="Rating Tagline" value={form.ratingTagline} onChange={set('ratingTagline')} helperText="Shown in the PDF footer band" />
          <Field label="Payment Methods" value={form.paymentMethods} onChange={set('paymentMethods')} helperText="Comma-separated, e.g. Bank Transfer, UPI, Visa" />
          <div className="sm:col-span-2">
            <TextAreaField label="Terms & Conditions" value={form.quotationTerms} onChange={set('quotationTerms')} />
          </div>
          <div className="sm:col-span-2">
            <TextAreaField label="Cancellation Policy" value={form.cancellationPolicy} onChange={set('cancellationPolicy')} />
          </div>
        </Section>

        <Section title="Document Number Prefixes" description="Leave blank to keep the default prefix for that document type">
          <Field label="Quotation" placeholder="QUO" value={form.docPrefixQuotation} onChange={set('docPrefixQuotation')} />
          <Field label="Invoice" placeholder="INV" value={form.docPrefixInvoice} onChange={set('docPrefixInvoice')} />
          <Field label="Receipt" placeholder="REC" value={form.docPrefixReceipt} onChange={set('docPrefixReceipt')} />
          <Field label="Payment" placeholder="PAY" value={form.docPrefixPayment} onChange={set('docPrefixPayment')} />
          <Field label="Credit Note" placeholder="CN" value={form.docPrefixCreditNote} onChange={set('docPrefixCreditNote')} />
          <Field label="Voucher" placeholder="VOU" value={form.docPrefixVoucher} onChange={set('docPrefixVoucher')} />
        </Section>

        <Section title="Bank & Payment Details" description="Shown on quotation PDFs when configured — visible to customers">
          <Field label="Bank Name" value={form.bankName} onChange={set('bankName')} />
          <Field label="Account Name" value={form.bankAccountName} onChange={set('bankAccountName')} />
          <Field label="Account Number" value={form.bankAccountNumber} onChange={set('bankAccountNumber')} />
          <Field label="Account Type" value={form.bankAccountType} onChange={set('bankAccountType')} />
          <Field label="IFSC Code" value={form.bankIfscCode} onChange={set('bankIfscCode')} />
          <Field label="SWIFT Code" value={form.bankSwiftCode} onChange={set('bankSwiftCode')} />
          <Field label="Branch" value={form.bankBranch} onChange={set('bankBranch')} />
          <Field label="UPI ID" value={form.upiId} onChange={set('upiId')} />
        </Section>
      </div>
    </div>
  );
};

export default OrganizationSettings;
