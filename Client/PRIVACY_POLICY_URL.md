# Privacy Policy URL for Facebook Lead Forms

## For Development (localhost)
http://localhost:5173/privacy-policy

## For Production (Update with your actual domain)
https://tripskyway.com/privacy-policy
https://www.tripskyway.com/privacy-policy

---

## Important Notes:

1. Facebook requires a LIVE, publicly accessible privacy policy URL
2. For local testing, you need to deploy to a public server or use ngrok
3. The privacy policy page must be accessible without login
4. Must include information about data collection from Facebook Lead Ads

---

## Alternative: Use ngrok for Facebook Testing

If you want to test with Facebook Lead Forms on localhost:

1. Start your Client app:
   cd Client
   npm run dev

2. In another terminal, expose with ngrok:
   ngrok http 5173

3. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)

4. Your privacy policy URL for Facebook:
   https://abc123.ngrok.io/privacy-policy

⚠️ Note: ngrok free tier gives new URLs on each restart

---

## Policy Pages Created:

✅ Privacy Policy: /privacy-policy
✅ Terms of Service: /terms-of-service  
✅ Cancellation Policy: /cancellation-policy

All pages are fully styled with Tailwind CSS and include:
- Professional layout with icons
- Comprehensive legal content
- Mobile responsive design
- Easy navigation
- Contact information
