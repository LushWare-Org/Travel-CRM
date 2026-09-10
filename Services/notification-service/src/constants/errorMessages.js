// Written for a caller, not an operator: no supplier names, no environment
// variables, no provider error text. The provider payloads are logged where they
// are caught, so nothing is lost for debugging — it just does not reach a browser.

export const EMAIL_NOT_CONFIGURED =
  'Email is temporarily unavailable. Please try again in a moment.';
export const EMAIL_SEND_FAILED = "We couldn't send that email. Please try again.";

export const WHATSAPP_UNAVAILABLE =
  'WhatsApp messaging is temporarily unavailable. Please try again in a moment.';
export const WHATSAPP_SEND_FAILED =
  "We couldn't send that WhatsApp message. Please check the details and try again.";

export const INVALID_EMAIL_PAYLOAD = 'Please check the email details and try again.';
export const INVALID_WHATSAPP_PAYLOAD = 'Please check the message details and try again.';
