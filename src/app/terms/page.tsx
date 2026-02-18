import type { Metadata } from 'next';
import { PAGE_META, BUSINESS } from '@/lib/constants';

export const metadata: Metadata = {
  title: PAGE_META.terms.title,
  description: PAGE_META.terms.description,
};

export default function TermsPage() {
  return (
    <div className="py-20 px-4">
      <div className="max-w-3xl mx-auto prose prose-neutral prose-headings:font-display">
        <h1>Terms of Service</h1>
        <p className="lead">Last updated: February 2026</p>

        <h2>Services</h2>
        <p>{BUSINESS.name} provides professional {BUSINESS.servicesOffering.toLowerCase()} including brand photography, portrait sessions, and event coverage in the {BUSINESS.location.full} area.</p>

        <h2>Booking and Payment</h2>
        <ul>
          <li>A non-refundable retainer is required to secure your session date</li>
          <li>Remaining balance is due on the day of the session</li>
          <li>Prices are subject to change but will be honored for confirmed bookings</li>
        </ul>

        <h2>Cancellation Policy</h2>
        <ul>
          <li>Cancellations made 48+ hours before the session: retainer may be applied to a rescheduled date</li>
          <li>Cancellations made less than 48 hours before: retainer is forfeited</li>
          <li>No-shows: full session fee is due</li>
          <li>Weather-related rescheduling for outdoor sessions is accommodated at no charge</li>
        </ul>

        <h2>Image Delivery</h2>
        <ul>
          <li>Edited images are delivered within 2-4 weeks of the session</li>
          <li>Images are delivered via secure online gallery</li>
          <li>Gallery access is available for 90 days from delivery</li>
          <li>Rush delivery may be available for an additional fee</li>
        </ul>

        <h2>Usage Rights</h2>
        <ul>
          <li>Clients receive a personal-use license for all delivered images</li>
          <li>Commercial usage rights are included with brand photography packages</li>
          <li>{BUSINESS.name} retains the right to use images for portfolio and marketing purposes unless otherwise agreed in writing</li>
          <li>Images may not be altered, manipulated, or used to misrepresent the original context</li>
        </ul>

        <h2>Client Galleries</h2>
        <ul>
          <li>Client gallery access is password-protected and private</li>
          <li>Gallery passwords should not be shared beyond intended recipients</li>
          <li>Downloaded images are for personal use unless otherwise specified</li>
        </ul>

        <h2>Liability</h2>
        <p>While we take every precaution, {BUSINESS.name} is not liable for unforeseen circumstances that may affect the session (equipment failure, acts of nature, venue restrictions). In such cases, we will work with you to reschedule or find alternative solutions.</p>

        <h2>Intellectual Property</h2>
        <p>All images and videos remain the intellectual property of {BUSINESS.name} until full payment is received. Upon full payment, clients receive a license to use the images as outlined above.</p>

        <h2>Contact</h2>
        <p>Questions about these terms? Contact us at <a href={`mailto:${BUSINESS.contact.email}`}>{BUSINESS.contact.email}</a>.</p>
      </div>
    </div>
  );
}
