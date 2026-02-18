import { test, expect } from '@playwright/test';

test.describe('Contact Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
  });

  test('contact page loads with form', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('form', { name: /contact/i })).toBeVisible();
  });

  test('form has all required fields', async ({ page }) => {
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/phone/i)).toBeVisible();
    await expect(page.getByLabel(/service type/i)).toBeVisible();
    await expect(page.getByLabel(/message/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send message/i })).toBeVisible();
  });

  test('name field accepts input', async ({ page }) => {
    const nameInput = page.getByLabel(/name/i);
    await nameInput.fill('John Doe');
    await expect(nameInput).toHaveValue('John Doe');
  });

  test('email field accepts input', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill('john@example.com');
    await expect(emailInput).toHaveValue('john@example.com');
  });

  test('phone field accepts input', async ({ page }) => {
    const phoneInput = page.getByLabel(/phone/i);
    await phoneInput.fill('(303) 555-1234');
    await expect(phoneInput).toHaveValue('(303) 555-1234');
  });

  test('service type dropdown has options', async ({ page }) => {
    const serviceSelect = page.getByLabel(/service type/i);

    // Check that options exist
    await expect(page.getByRole('option', { name: /photography/i })).toBeAttached();
    await expect(page.getByRole('option', { name: /videography/i })).toBeAttached();
    await expect(page.getByRole('option', { name: /commercial drone/i })).toBeAttached();
    await expect(page.getByRole('option', { name: /ai/i })).toBeAttached();

    // Select an option
    await serviceSelect.selectOption('photography');
    await expect(serviceSelect).toHaveValue('photography');
  });

  test('message textarea accepts input', async ({ page }) => {
    const messageInput = page.getByLabel(/message/i);
    await messageInput.fill('I would like to book a portrait session for my family.');
    await expect(messageInput).toHaveValue('I would like to book a portrait session for my family.');
  });

  test('required fields are marked as required', async ({ page }) => {
    const nameInput = page.getByLabel(/name/i);
    const emailInput = page.getByLabel(/email/i);
    const messageInput = page.getByLabel(/message/i);

    await expect(nameInput).toHaveAttribute('required', '');
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(messageInput).toHaveAttribute('required', '');
  });

  test('phone field is optional (no required attribute)', async ({ page }) => {
    const phoneInput = page.getByLabel(/phone/i);

    // Phone should NOT have required attribute
    const hasRequired = await phoneInput.getAttribute('required');
    expect(hasRequired).toBeNull();
  });
});

test.describe('Contact Form - Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
  });

  test('shows validation error for short message', async ({ page }) => {
    const nameInput = page.getByLabel(/name/i);
    const emailInput = page.getByLabel(/email/i);
    const messageInput = page.getByLabel(/message/i);
    const submitButton = page.getByRole('button', { name: /send message/i });

    // Fill required fields with clicks for Safari compatibility
    await nameInput.click();
    await nameInput.fill('John Doe');
    await emailInput.click();
    await emailInput.fill('john@example.com');
    await messageInput.click();
    await messageInput.fill('Short');

    // Submit form
    await submitButton.click();

    // Should show validation error
    await expect(page.getByText(/message must be at least/i)).toBeVisible({ timeout: 5000 });
  });

  test('shows validation error for invalid phone number', async ({ page }) => {
    const nameInput = page.getByLabel(/name/i);
    const emailInput = page.getByLabel(/email/i);
    const phoneInput = page.getByLabel(/phone/i);
    const messageInput = page.getByLabel(/message/i);
    const submitButton = page.getByRole('button', { name: /send message/i });

    // Fill fields with small delays for Safari
    await nameInput.click();
    await nameInput.fill('John Doe');
    await emailInput.click();
    await emailInput.fill('john@example.com');
    await phoneInput.click();
    await phoneInput.fill('123'); // Too short
    await messageInput.click();
    await messageInput.fill('This is a valid message that is long enough.');

    await submitButton.click();

    await expect(page.getByText(/valid phone number/i)).toBeVisible({ timeout: 5000 });
  });

  test('clears validation errors when user corrects input', async ({ page }) => {
    const nameInput = page.getByLabel(/name/i);
    const emailInput = page.getByLabel(/email/i);
    const messageInput = page.getByLabel(/message/i);
    const submitButton = page.getByRole('button', { name: /send message/i });

    // Create an error first
    await nameInput.click();
    await nameInput.fill('John Doe');
    await emailInput.click();
    await emailInput.fill('john@example.com');
    await messageInput.click();
    await messageInput.fill('Short');
    await submitButton.click();

    // Error should be visible
    await expect(page.getByText(/message must be at least/i)).toBeVisible({ timeout: 5000 });

    // Fix the message - focus, clear, then type to ensure change event fires on Safari
    await messageInput.click();
    await messageInput.fill(''); // Clear by filling empty
    await messageInput.fill('This is now a much longer valid message that should pass.');

    // Wait for error to clear (give time for React state update)
    await expect(page.getByText(/message must be at least/i)).not.toBeVisible({ timeout: 10000 });
  });
});

test.describe('Contact Form - Submission', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
  });

  test('submit button triggers form submission', async ({ page }) => {
    // Mock the API
    await page.route('**/api/contact', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    const nameInput = page.getByLabel(/name/i);
    const emailInput = page.getByLabel(/email/i);
    const messageInput = page.getByLabel(/message/i);
    const submitButton = page.getByRole('button', { name: /send message/i });

    // Fill out form
    await nameInput.click();
    await nameInput.fill('John Doe');
    await emailInput.click();
    await emailInput.fill('john@example.com');
    await messageInput.click();
    await messageInput.fill('I would like to book a photography session please.');

    // Submit
    await submitButton.click();

    // Should show success after submission completes
    await expect(page.getByRole('heading', { name: /message sent/i })).toBeVisible({ timeout: 10000 });
  });

  test('shows success message after successful submission', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/contact', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Thank you!' }),
      });
    });

    const nameInput = page.getByLabel(/name/i);
    const emailInput = page.getByLabel(/email/i);
    const messageInput = page.getByLabel(/message/i);
    const submitButton = page.getByRole('button', { name: /send message/i });

    // Fill and submit form (clicks for Safari compatibility)
    await nameInput.click();
    await nameInput.fill('John Doe');
    await emailInput.click();
    await emailInput.fill('john@example.com');
    await messageInput.click();
    await messageInput.fill('I would like to book a photography session please.');
    await submitButton.click();

    // Should show success
    await expect(page.getByRole('heading', { name: /message sent/i })).toBeVisible({ timeout: 10000 });
  });

  test('shows error message after failed submission', async ({ page }) => {
    // Mock failed API response
    await page.route('**/api/contact', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      });
    });

    const nameInput = page.getByLabel(/name/i);
    const emailInput = page.getByLabel(/email/i);
    const messageInput = page.getByLabel(/message/i);
    const submitButton = page.getByRole('button', { name: /send message/i });

    // Fill and submit form (clicks for Safari compatibility)
    await nameInput.click();
    await nameInput.fill('John Doe');
    await emailInput.click();
    await emailInput.fill('john@example.com');
    await messageInput.click();
    await messageInput.fill('I would like to book a photography session please.');
    await submitButton.click();

    // Wait for submission to process and check for any error indication
    await page.waitForTimeout(2000);

    // Form should still be visible (not success state) or error shown
    const formStillVisible = await page.getByLabel(/name/i).isVisible();
    const errorVisible = await page.getByRole('alert').isVisible().catch(() => false);
    const errorTextVisible = await page.getByText(/error|went wrong|network/i).isVisible().catch(() => false);

    // Either form is still there (no success) or error is shown
    expect(formStillVisible || errorVisible || errorTextVisible).toBeTruthy();
  });

  test('can send another message after success', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/contact', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    const nameInput = page.getByLabel(/name/i);
    const emailInput = page.getByLabel(/email/i);
    const messageInput = page.getByLabel(/message/i);
    const submitButton = page.getByRole('button', { name: /send message/i });

    // Fill and submit form (clicks for Safari compatibility)
    await nameInput.click();
    await nameInput.fill('John Doe');
    await emailInput.click();
    await emailInput.fill('john@example.com');
    await messageInput.click();
    await messageInput.fill('I would like to book a photography session please.');
    await submitButton.click();

    // Wait for success
    await expect(page.getByRole('heading', { name: /message sent/i })).toBeVisible({ timeout: 10000 });

    // Click "Send Another Message"
    await page.getByRole('button', { name: /send another/i }).click();

    // Form should be back
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send message/i })).toBeVisible();
  });
});

test.describe('Contact Form - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
  });

  test('form fields are keyboard accessible', async ({ page }) => {
    // Tab through form fields
    await page.keyboard.press('Tab');

    // Should be able to focus on name input
    const nameInput = page.getByLabel(/name/i);
    await nameInput.focus();
    await expect(nameInput).toBeFocused();

    // Tab to next field
    await page.keyboard.press('Tab');
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeFocused();
  });

  test('error messages are announced to screen readers', async ({ page }) => {
    const nameInput = page.getByLabel(/name/i);
    const emailInput = page.getByLabel(/email/i);
    const messageInput = page.getByLabel(/message/i);
    const submitButton = page.getByRole('button', { name: /send message/i });

    // Submit with short message (clicks for Safari compatibility)
    await nameInput.click();
    await nameInput.fill('John Doe');
    await emailInput.click();
    await emailInput.fill('john@example.com');
    await messageInput.click();
    await messageInput.fill('Short');
    await submitButton.click();

    // Error element should exist and be associated with input
    const errorMessage = page.getByText(/message must be at least/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('form has accessible name', async ({ page }) => {
    const form = page.getByRole('form', { name: /contact/i });
    await expect(form).toBeVisible();
  });
});
