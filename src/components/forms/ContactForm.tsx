'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { CheckIcon } from '@/components/icons';
import { SERVICES } from '@/lib/constants';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

interface FormData {
  name: string;
  email: string;
  phone: string;
  sessionType: string;
  message: string;
  honeypot: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
}

const sessionTypes = [
  { value: '', label: 'Select a service...' },
  { value: 'brand', label: SERVICES.brand.title },
  { value: 'portrait', label: 'Portrait Session' },
  { value: 'event', label: SERVICES.events.title },
  { value: 'commercial', label: 'Commercial Project' },
  { value: 'other', label: 'Other / General Inquiry' },
];

export function ContactForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    sessionType: '',
    message: '',
    honeypot: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<FormStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email)) {
      newErrors.email = 'Please provide a valid email address';
    }

    if (formData.phone) {
      const phoneRegex = /^[\d\s\-\(\)\+]{10,20}$/;
      if (!phoneRegex.test(formData.phone)) {
        newErrors.phone = 'Please provide a valid phone number';
      }
    }

    if (!formData.message.trim() || formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setStatus('submitting');
    setStatusMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest', // CSRF protection via custom header
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setStatusMessage(data.message || 'Thank you for your message! We will get back to you soon.');
        setFormData({
          name: '',
          email: '',
          phone: '',
          sessionType: '',
          message: '',
          honeypot: '',
        });
      } else {
        setStatus('error');
        setStatusMessage(data.error || 'Something went wrong. Please try again.');
        if (data.errors) {
          const fieldErrors: FormErrors = {};
          data.errors.forEach((err: { field: string; message: string }) => {
            fieldErrors[err.field as keyof FormErrors] = err.message;
          });
          setErrors(fieldErrors);
        }
      }
    } catch {
      setStatus('error');
      setStatusMessage('Network error. Please check your connection and try again.');
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Card variant="outlined">
      <CardContent className="p-6 md:p-8">
        {status === 'success' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon size={32} className="text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">
              Message Sent!
            </h3>
            <p className="text-neutral-600 mb-6">{statusMessage}</p>
            <Button
              variant="outline"
              onClick={() => setStatus('idle')}
            >
              Send Another Message
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6" aria-label="Contact form">
            {/* Honeypot field - hidden from users, bots will fill this */}
            <input
              type="text"
              name="honeypot"
              value={formData.honeypot}
              onChange={(e) => handleChange('honeypot', e.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            <div className="grid md:grid-cols-2 gap-6">
              <Input
                label="Name"
                name="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                error={errors.name}
                required
                placeholder="Your name"
              />
              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                error={errors.email}
                required
                placeholder="your@email.com"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Input
                label="Phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                error={errors.phone}
                placeholder="(303) 555-1234"
                hint="Optional"
              />
              <div className="w-full">
                <label
                  htmlFor="sessionType"
                  className="block text-sm font-medium text-neutral-700 mb-1"
                >
                  Service Type
                </label>
                <select
                  id="sessionType"
                  name="sessionType"
                  value={formData.sessionType}
                  onChange={(e) => handleChange('sessionType', e.target.value)}
                  className="w-full px-4 py-2 text-neutral-900 bg-white border border-neutral-300 rounded-lg transition-colors duration-200 hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {sessionTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Textarea
              label="Message"
              name="message"
              value={formData.message}
              onChange={(e) => handleChange('message', e.target.value)}
              error={errors.message}
              required
              placeholder="Tell us about your project, event, or what you're looking for..."
              rows={5}
            />

            {status === 'error' && (
              <div
                role="alert"
                aria-live="assertive"
                className="bg-red-50 border border-red-200 rounded-lg p-4"
              >
                <p className="text-red-700 text-sm">{statusMessage}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                * Required fields
              </p>
              <Button
                type="submit"
                isLoading={status === 'submitting'}
              >
                Send Message
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
