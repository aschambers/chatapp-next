export default function PrivacyPage() {
  const updated = 'March 21, 2026';

  return (
    <div className="w-full max-w-2xl mx-auto py-10">
      <div className="rounded-lg bg-gray-800 p-8 shadow-lg text-gray-300 space-y-6 text-sm leading-relaxed">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Privacy Policy</h1>
          <p className="text-gray-500 text-xs">Last updated: {updated}</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">1. Information We Collect</h2>
          <p>When you create an account, we collect your username, email address, and password (stored as a secure hash). If you upload a profile picture, it is stored on Cloudinary. Messages you send are stored in our database to enable real-time chat and message history.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">2. How We Use Your Information</h2>
          <p>We use your information solely to operate Meshyve. This includes authenticating your account, displaying your username and profile picture to other users, delivering messages, and sending account-related emails such as email verification and password resets.</p>
          <p>We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">3. Data Storage</h2>
          <p>Your data is stored on servers located in the United States. Profile pictures are stored via Cloudinary. We take reasonable technical measures to protect your data, but no system is completely secure.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">4. Cookies</h2>
          <p>Meshyve uses a single authentication cookie to keep you logged in. This cookie is essential for the app to function and does not track you across other websites.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">5. Your Rights</h2>
          <p>You may delete your account at any time by contacting us. Upon request, we will delete your personal information, including your email and profile picture. Messages you have sent may remain in server logs for a limited period.</p>
          <p>If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information we collect and the right to request deletion.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">6. Children</h2>
          <p>Meshyve is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has created an account, please contact us and we will delete it.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">7. Changes to This Policy</h2>
          <p>We may update this policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated date.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">8. Contact</h2>
          <p>If you have questions about this Privacy Policy, please contact us through the app.</p>
        </section>
      </div>
    </div>
  );
}
