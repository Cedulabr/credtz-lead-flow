/**
 * Phone validation utilities for Brazilian phone numbers
 */

// Common invalid/fake phone patterns
const INVALID_PATTERNS = [
  /^(\d)\1+$/, // All same digits (e.g., 99999999999)
  /^123456789/,
  /^987654321/,
  /^000000/,
  /^111111/,
];

// Known invalid DDDs
const INVALID_DDDS = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '20', '23', '25', '26', '29', '30', '36', '39', '40', '50', '52', '56', '57', '58', '59', '60', '70', '72', '76', '78', '80', '90'];

// Valid Brazilian DDDs
const VALID_DDDS = [
  '11', '12', '13', '14', '15', '16', '17', '18', '19', // São Paulo
  '21', '22', '24', // Rio de Janeiro
  '27', '28', // Espírito Santo
  '31', '32', '33', '34', '35', '37', '38', // Minas Gerais
  '41', '42', '43', '44', '45', '46', // Paraná
  '47', '48', '49', // Santa Catarina
  '51', '53', '54', '55', // Rio Grande do Sul
  '61', // Distrito Federal
  '62', '64', // Goiás
  '63', // Tocantins
  '65', '66', // Mato Grosso
  '67', // Mato Grosso do Sul
  '68', // Acre
  '69', // Rondônia
  '71', '73', '74', '75', '77', // Bahia
  '79', // Sergipe
  '81', '87', // Pernambuco
  '82', // Alagoas
  '83', // Paraíba
  '84', // Rio Grande do Norte
  '85', '88', // Ceará
  '86', '89', // Piauí
  '91', '93', '94', // Pará
  '92', '97', // Amazonas
  '95', // Roraima
  '96', // Amapá
  '98', '99', // Maranhão
];

export interface PhoneValidationResult {
  isValid: boolean;
  tipo: 'celular' | 'fixo' | 'invalido';
  ddd: string | null;
  numero: string;
  formatted: string;
  errors: string[];
}

/**
 * Clean phone number (remove all non-digits)
 */
export function cleanPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Validate Brazilian phone number
 */
export function validatePhone(phone: string | null | undefined): PhoneValidationResult {
  const cleaned = cleanPhone(phone);
  const errors: string[] = [];
  
  // Default result
  const result: PhoneValidationResult = {
    isValid: false,
    tipo: 'invalido',
    ddd: null,
    numero: cleaned,
    formatted: phone || '',
    errors: [],
  };

  // Check empty
  if (!cleaned) {
    errors.push('Número vazio');
    return { ...result, errors };
  }

  // Check length (must be 10 or 11 digits)
  if (cleaned.length < 10 || cleaned.length > 11) {
    errors.push('Número deve ter 10 ou 11 dígitos');
    return { ...result, errors };
  }

  // Extract DDD
  const ddd = cleaned.substring(0, 2);
  const numero = cleaned.substring(2);
  
  // Validate DDD
  if (!VALID_DDDS.includes(ddd)) {
    errors.push(`DDD inválido: ${ddd}`);
    return { ...result, ddd, errors };
  }

  // Check for invalid patterns
  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(cleaned)) {
      errors.push('Número parece ser inválido');
      return { ...result, ddd, errors };
    }
  }

  // Determine phone type
  // Mobile: 11 digits total, starts with 9 after DDD
  // Landline: 10 digits total, starts with 2-5 after DDD
  let tipo: 'celular' | 'fixo' = 'fixo';
  
  if (cleaned.length === 11) {
    if (numero.startsWith('9')) {
      tipo = 'celular';
    } else {
      errors.push('Celular deve começar com 9');
      return { ...result, ddd, errors };
    }
  } else if (cleaned.length === 10) {
    if (['2', '3', '4', '5'].includes(numero[0])) {
      tipo = 'fixo';
    } else {
      errors.push('Número fixo deve começar com 2, 3, 4 ou 5');
      return { ...result, ddd, errors };
    }
  }

  // Format phone
  const formatted = tipo === 'celular'
    ? `(${ddd}) ${numero.substring(0, 5)}-${numero.substring(5)}`
    : `(${ddd}) ${numero.substring(0, 4)}-${numero.substring(4)}`;

  return {
    isValid: true,
    tipo,
    ddd,
    numero: cleaned,
    formatted,
    errors: [],
  };
}

/**
 * Check if phone is a mobile number
 */
export function isMobilePhone(phone: string | null | undefined): boolean {
  const result = validatePhone(phone);
  return result.isValid && result.tipo === 'celular';
}

/**
 * Format phone for display
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  const result = validatePhone(phone);
  return result.isValid ? result.formatted : (phone || '');
}

/**
 * Get WhatsApp link for phone
 */
export function getWhatsAppLinkForPhone(phone: string | null | undefined): string | null {
  const result = validatePhone(phone);
  if (!result.isValid || result.tipo !== 'celular') {
    return null;
  }
  return `https://wa.me/55${result.numero}`;
}
