export default function TermsPage() {
  const updated = 'March 21, 2026';

  return (
    <div className="w-full max-w-2xl mx-auto py-10">
      <div className="rounded-lg bg-gray-800 p-8 shadow-lg text-gray-300 space-y-6 text-sm leading-relaxed">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Terms of Service</h1>
          <p className="text-gray-500 text-xs">Last updated: {updated}</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">1. Acceptance</h2>
          <p>By creating an account or using Sanctrel, you agree to these Terms of Service. If you do not agree, do not use the app.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">2. Eligibility</h2>
          <p>You must be at least 13 years old to use Sanctrel. By using the app you represent that you meet this requirement.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">3. Your Account</h2>
          <p>You are responsible for maintaining the security of your account and password. You are responsible for all activity that occurs under your account. Notify us immediately if you believe your account has been compromised.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">4. Acceptable Use</h2>
          <p>You agree not to use Sanctrel to:</p>
          <ul className="list-disc list-inside space-y-1 pl-2 text-gray-400">
            <li>Harass, threaten, or harm other users</li>
            <li>Post illegal content or content that violates the rights of others</li>
            <li>Spam, phish, or distribute malware</li>
            <li>Impersonate other people or entities</li>
            <li>Attempt to gain unauthorized access to the system or other users' accounts</li>
            <li>Use the service for any unlawful purpose</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts that violate these rules.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">5. Content</h2>
          <p>You retain ownership of content you post on Sanctrel. By posting content, you grant us a limited license to store and display it as necessary to operate the service. You are solely responsible for the content you post.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">6. Termination</h2>
          <p>We may suspend or terminate your access to Sanctrel at any time, with or without cause. You may stop using the service at any time.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">7. Disclaimer of Warranties</h2>
          <p>Sanctrel is provided &quot;as is&quot; without warranties of any kind. We do not guarantee the service will be available at all times or free of errors.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">8. Limitation of Liability</h2>
          <p>To the fullest extent permitted by law, Sanctrel and its operators shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">9. Governing Law</h2>
          <p>These terms are governed by the laws of the United States. Any disputes shall be resolved in the applicable courts of the United States.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">10. Changes</h2>
          <p>We may update these terms at any time. Continued use of Sanctrel after changes constitutes acceptance of the new terms.</p>
        </section>
      </div>
    </div>
  );
}
