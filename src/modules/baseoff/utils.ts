// Utility functions for BaseOff Module
import { format, subDays, startOfMonth, endOfMonth, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BaseOffFilters } from './types';

export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return '---';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return `${cleaned.slice(0, 3)}.***.***.${cleaned.slice(9, 11)}`;
}

export function formatCPFFull(cpf: string | null | undefined): string {
  if (!cpf) return '---';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '---';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'R$ ---';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '---';
  try {
    const parsed = parseISO(date);
    if (!isValid(parsed)) return '---';
    return format(parsed, 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '---';
  }
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '---';
  try {
    const parsed = parseISO(date);
    if (!isValid(parsed)) return '---';
    return format(parsed, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return '---';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function getDateRange(filters: BaseOffFilters): { start: Date | null; end: Date | null } {
  const today = new Date();
  
  // If specific month is selected
  if (filters.month && filters.month !== 'all') {
    const [year, month] = filters.month.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    return {
      start: startOfMonth(monthStart),
      end: endOfMonth(monthStart),
    };
  }
  
  // Quick period filters
  switch (filters.period) {
    case 'today':
      return { start: today, end: today };
    case 'yesterday':
      return { start: subDays(today, 1), end: subDays(today, 1) };
    case '7days':
      return { start: subDays(today, 7), end: today };
    case '30days':
      return { start: subDays(today, 30), end: today };
    case '90days':
      return { start: subDays(today, 90), end: today };
    default:
      return { start: null, end: null };
  }
}

export function generateMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const value = format(date, 'yyyy-MM');
    const label = format(date, 'MMMM yyyy', { locale: ptBR });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  
  return options;
}

export function getWhatsAppLink(phone: string | null | undefined): string {
  if (!phone) return '#';
  const cleaned = phone.replace(/\D/g, '');
  const withCountry = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
  return `https://wa.me/${withCountry}`;
}

export function calculateProgress(processed: number | null, total: number | null): number {
  if (!total || total === 0) return 0;
  return Math.min(100, Math.round(((processed || 0) / total) * 100));
}
