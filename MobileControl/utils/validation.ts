import {
  parsePhoneNumber,
  isValidPhoneNumber,
  AsYouType,
  getExampleNumber,
  isSupportedCountry,
  validatePhoneNumberLength,
  CountryCode,
} from 'libphonenumber-js';
import examples from 'libphonenumber-js/examples.mobile.json';
import { Country } from './countries';

export interface ValidationResult {
  isValid: boolean;
  formattedNational: string;
  formattedInternational: string;
  e164: string;
  errorMessage: string | null;
}

export const validatePhone = (
  localNumber: string,
  dialCode: string,
  iso2: string,
  countryName?: string
): ValidationResult => {
  const digits = localNumber.replace(/\D/g, '');

  if (!digits) {
    return {
      isValid: false,
      formattedNational: '',
      formattedInternational: '',
      e164: '',
      errorMessage: 'Phone number is required',
    };
  }

  const fullNumber = dialCode + digits;

  try {
    const lengthResult = validatePhoneNumberLength(fullNumber, iso2 as CountryCode);
    if (lengthResult === 'TOO_SHORT') {
      return {
        isValid: false,
        formattedNational: digits,
        formattedInternational: fullNumber,
        e164: fullNumber,
        errorMessage: 'Phone number is too short',
      };
    }
    if (lengthResult === 'TOO_LONG') {
      return {
        isValid: false,
        formattedNational: digits,
        formattedInternational: fullNumber,
        e164: fullNumber,
        errorMessage: 'Phone number is too long',
      };
    }

    const isValid = isValidPhoneNumber(fullNumber, iso2 as CountryCode);
    const parsed = parsePhoneNumber(fullNumber, iso2 as CountryCode);
    const label = countryName ?? iso2;

    return {
      isValid,
      formattedNational: parsed?.formatNational() ?? digits,
      formattedInternational: parsed?.formatInternational() ?? fullNumber,
      e164: parsed?.format('E.164') ?? fullNumber,
      errorMessage: isValid ? null : `Invalid ${label} phone number`,
    };
  } catch {
    return {
      isValid: false,
      formattedNational: digits,
      formattedInternational: fullNumber,
      e164: fullNumber,
      errorMessage: 'Invalid phone number',
    };
  }
};

export const getPlaceholderForCountry = (iso2: string): string => {
  try {
    if (!isSupportedCountry(iso2 as CountryCode)) return 'Enter phone number';
    const example = getExampleNumber(iso2 as CountryCode, examples as never);
    return example?.formatNational() ?? 'Enter phone number';
  } catch {
    return 'Enter phone number';
  }
};

export const formatAsYouType = (input: string, iso2: string): string => {
  try {
    const digits = input.replace(/\D/g, '');
    const formatter = new AsYouType(iso2 as CountryCode);
    return formatter.input(digits);
  } catch {
    return input;
  }
};

export const parseInitialValue = (
  value: string,
  countryList: Country[]
): { country: Country; localNumber: string } => {
  const defaultCountry = countryList[0];
  if (!value || value.trim() === '') {
    return { country: defaultCountry, localNumber: '' };
  }
  try {
    const parsed = parsePhoneNumber(value);
    if (parsed) {
      const match = countryList.find((c) => c.iso2 === parsed.country);
      return {
        country: match ?? defaultCountry,
        localNumber: parsed.formatNational(),
      };
    }
  } catch {
    // fall through
  }
  return { country: defaultCountry, localNumber: '' };
};
