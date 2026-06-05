import {
  parsePhoneNumber,
  isValidPhoneNumber,
  AsYouType,
  getExampleNumber,
  isSupportedCountry,
  CountryCode,
} from 'libphonenumber-js';
import examples from 'libphonenumber-js/examples.mobile.json';

export interface ValidationResult {
  isValid: boolean;
  formattedNumber: string;
  internationalFormat: string;
  e164Format: string;
  errorMessage: string | null;
}

export const validatePhone = (
  localNumber: string,
  dialCode: string,
  iso2: string
): ValidationResult => {
  const fullNumber = dialCode + localNumber;

  try {
    const isValid = isValidPhoneNumber(fullNumber, iso2 as CountryCode);
    const parsed = parsePhoneNumber(fullNumber, iso2 as CountryCode);

    return {
      isValid,
      formattedNumber: parsed?.formatNational() ?? localNumber,
      internationalFormat: parsed?.formatInternational() ?? fullNumber,
      e164Format: parsed?.format('E.164') ?? fullNumber,
      errorMessage: isValid
        ? null
        : `Invalid ${parsed?.country ?? iso2} phone number`,
    };
  } catch {
    return {
      isValid: false,
      formattedNumber: localNumber,
      internationalFormat: fullNumber,
      e164Format: fullNumber,
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
    const formatter = new AsYouType(iso2 as CountryCode);
    return formatter.input(input);
  } catch {
    return input;
  }
};
