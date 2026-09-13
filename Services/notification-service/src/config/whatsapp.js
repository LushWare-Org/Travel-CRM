function readEnv() {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    appSecret: process.env.WHATSAPP_APP_SECRET || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v23.0',
  };
}

export const isWhatsappConfigured = () => {
  const { accessToken, phoneNumberId } = readEnv();
  return Boolean(accessToken && phoneNumberId);
};

export default readEnv;
