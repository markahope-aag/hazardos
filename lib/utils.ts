import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a dollar amount as currency
 * @param amount - Amount in dollars
 * @param showDecimals - Whether to show decimal places (default: true)
 */
export function formatCurrency(amount: number | null | undefined, showDecimals = true): string {
  if (amount == null) return showDecimals ? '$0.00' : '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
}

/**
 * Format cents (e.g., from Stripe) as currency
 * @param cents - Amount in cents (e.g., 1000 = $10.00)
 * @param showDecimals - Whether to show decimal places (default: false)
 */
export function formatCurrencyFromCents(cents: number | null | undefined, showDecimals = false): string {
  if (cents == null) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(cents / 100);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Format date in long format (e.g., "January 15, 2024")
 */
export function formatDateLong(date: string | Date | null | undefined): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}