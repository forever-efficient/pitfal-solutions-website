import type { Metadata } from 'next';
import { PAGE_META, BUSINESS } from '@/lib/constants';

export const metadata: Metadata = {
  title: PAGE_META.privacy.title,
  description: PAGE_META.privacy.description,
};

export default function PrivacyPage() {
  return (
    <div className="py-20 px-4">
      <div className="max-w-3xl mx-auto prose prose-neutral prose-headings:font-display">
        <h1>Privacy Policy</h1>
        <p className="lead">Last updated: February 2026</p>

        <h2>Information We Collect</h2>
        <p>{BUSINESS.name} collects information you provide directly, including:</p>
        <ul>
          <li>Name, email address, and phone number when you submit our contact form</li>
          <li>Session preferences and project details for booking inquiries</li>
          <li>Account credentials for client gallery access</li>
        </ul>

        <h2>How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Respond to your inquiries and provide requested services</li>
          <li>Send booking confirmations and session details</li>
          <li>Provide access to your private client gallery</li>
          <li>Send invoices and process payments</li>
          <li>Improve our services and website experience</li>
        </ul>

        <h2>Data Storage and Security</h2>
        <p>Your data is stored securely using AWS infrastructure with encryption at rest and in transit. We use industry-standard security measures to protect your personal information.</p>

        <h2>Cookies</h2>
        <p>We use essential cookies for client gallery authentication sessions. These are HttpOnly, Secure cookies that expire after 7 days. We do not use tracking or advertising cookies.</p>

        <h2>Third-Party Services</h2>
        <p>We may use the following third-party services:</p>
        <ul>
          <li><strong>AWS</strong> - Cloud infrastructure and email delivery</li>
          <li><strong>Stripe</strong> - Payment processing (when applicable)</li>
        </ul>
        <p>These services have their own privacy policies governing the use of your information.</p>

        <h2>Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Request access to your personal data</li>
          <li>Request correction or deletion of your data</li>
          <li>Opt out of marketing communications</li>
        </ul>

        <h2>Photo and Video Usage</h2>
        <p>Client photos and videos are used only as agreed upon in your service contract. We may use selected images in our portfolio with your written permission. You can request removal of your images at any time.</p>

        <h2>Contact</h2>
        <p>For privacy-related questions, contact us at <a href={`mailto:${BUSINESS.contact.email}`}>{BUSINESS.contact.email}</a>.</p>
      </div>
    </div>
  );
}
