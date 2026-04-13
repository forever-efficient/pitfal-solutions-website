import type { Metadata } from 'next';
import { PAGE_META, BUSINESS } from '@/lib/constants';

export const metadata: Metadata = {
  title: PAGE_META.privacy.title,
  description: PAGE_META.privacy.description,
  alternates: { canonical: '/privacy/' },
};

export default function PrivacyPage() {
  return (
    <div className="py-20 px-4">
      <div className="max-w-3xl mx-auto prose prose-neutral prose-headings:font-display">
        <h1>Privacy Policy</h1>
        <p className="lead">Last updated: February 2026</p>

        <h2>Information Collected</h2>
        <p>{BUSINESS.name} collects information you provide directly, including:</p>
        <ul>
          <li>Name, email address, and phone number when you submit the contact form</li>
          <li>Session preferences and project details for booking inquiries</li>
          <li>Account credentials for client gallery access</li>
        </ul>

        <h2>How Your Information Is Used</h2>
        <p>The information collected is used to:</p>
        <ul>
          <li>Respond to your inquiries and provide requested services</li>
          <li>Send booking confirmations and session details</li>
          <li>Provide access to your private client gallery</li>
          <li>Send invoices and process payments</li>
          <li>Improve services and website experience</li>
        </ul>

        <h2>Data Storage and Security</h2>
        <p>Your data is stored securely using AWS infrastructure with encryption at rest and in transit. Industry-standard security measures are used to protect your personal information.</p>

        <h2>Cookies</h2>
        <p>Essential cookies are used for client gallery authentication sessions. These are HttpOnly, Secure cookies that expire after 7 days. No tracking or advertising cookies are used.</p>

        <h2>Third-Party Services</h2>
        <p>The following third-party services may be used:</p>
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
        <p>Client photos and videos are used only as agreed upon in your service contract. Selected images may be used in the portfolio with your written permission. You can request removal of your images at any time.</p>

        <h2>Contact</h2>
        <p>For privacy-related questions, reach out at <a href={`mailto:${BUSINESS.contact.email}`}>{BUSINESS.contact.email}</a>.</p>
      </div>
    </div>
  );
}
