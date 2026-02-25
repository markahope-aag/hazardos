'use client';

import { useState } from 'react';
import { LogoHorizontal } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

export default function SmsConsentPage() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      toast({
        title: 'Invalid phone number',
        description: 'Please enter a valid 10-digit US phone number.',
        variant: 'destructive',
      });
      return;
    }

    if (!consent) {
      toast({
        title: 'Consent required',
        description: 'Please check the consent box to continue.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/sms/opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: `+1${digits}`,
          name: name.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Something went wrong');
      }

      setSubmitted(true);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-gray-50">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="mb-8 flex justify-center">
            <LogoHorizontal size="lg" color="color" />
          </div>

          {submitted ? (
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <CardTitle className="text-xl">You&apos;re all set!</CardTitle>
                <CardDescription className="text-base">
                  You have successfully opted in to receive text messages. You can opt out at any time by replying <strong>STOP</strong> to any message.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">SMS Communication Consent</CardTitle>
                <CardDescription>
                  Opt in to receive text message updates about your service appointments,
                  job status, and important notifications.
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                    <h3 className="mb-2 text-sm font-semibold text-orange-900">
                      What messages will you receive?
                    </h3>
                    <ul className="space-y-1 text-sm text-orange-800">
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
                        <span><strong>Appointment reminders</strong> — before scheduled service visits</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
                        <span><strong>Job status updates</strong> — when our crew is en route or work is complete</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
                        <span><strong>Estimate follow-ups</strong> — regarding your project estimates</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Smith"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile Phone Number <span className="text-red-500">*</span></Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(303) 555-0100"
                      value={phone}
                      onChange={handlePhoneChange}
                      required
                      maxLength={14}
                    />
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="consent"
                      checked={consent}
                      onCheckedChange={(checked) => setConsent(checked === true)}
                      className="mt-1"
                    />
                    <Label htmlFor="consent" className="text-sm leading-relaxed text-gray-700">
                      I agree to receive automated text messages from HazardOS and its
                      service providers at the phone number provided. I understand that
                      consent is not a condition of service. Message frequency varies.
                      Message and data rates may apply.
                    </Label>
                  </div>

                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">
                      Reply <strong>STOP</strong> at any time to unsubscribe. Reply <strong>HELP</strong> for
                      assistance. Message frequency varies based on your service schedule.
                      Standard message and data rates may apply. View our{' '}
                      <a href="/privacy" className="text-orange-600 underline hover:text-orange-700">
                        Privacy Policy
                      </a>.
                    </p>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || !consent}
                  >
                    {loading ? 'Submitting...' : 'Opt In to Text Messages'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}

          <p className="mt-6 text-center text-xs text-gray-400">
            Powered by HazardOS &middot; Environmental Remediation Management
          </p>
        </div>
      </div>
    </div>
  );
}
