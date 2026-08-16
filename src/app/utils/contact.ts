import { toast } from 'sonner';

function normalizePhone(phone: string): string {
  const raw = String(phone || '').trim();
  if (!raw) {
    return '+919876543210';
  }
  if (raw.startsWith('+')) {
    return raw;
  }
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  return `+${digits}`;
}

export function callContact(name: string, phone?: string): void {
  const target = normalizePhone(phone || '');
  toast.info(`Calling ${name}...`);
  window.location.href = `tel:${target}`;
}

export function messageContact(name: string, phone?: string): void {
  const target = normalizePhone(phone || '');
  toast.info(`Opening message to ${name}...`);
  window.location.href = `sms:${target}`;
}
