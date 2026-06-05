import * as React from 'react';
import { parsePhoneNumber } from 'libphonenumber-js';
import { countries, Country } from '../utils/countries';
import {
  validatePhone,
  getPlaceholderForCountry,
  formatAsYouType,
  ValidationResult,
} from '../utils/validation';
import './MobileInput.css';

const DEFAULT_COUNTRY = countries[0]; // UAE

export interface MobileInputProps {
  initialValue: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
}

const MobileInput: React.FC<MobileInputProps> = ({
  initialValue,
  disabled,
  onChange,
  onValidationChange,
}) => {
  const [selectedCountry, setSelectedCountry] = React.useState<Country>(DEFAULT_COUNTRY);
  const [localNumber, setLocalNumber] = React.useState<string>('');
  const [isTouched, setIsTouched] = React.useState<boolean>(false);
  const [validationResult, setValidationResult] = React.useState<ValidationResult | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  // Parse initialValue on mount
  React.useEffect(() => {
    if (initialValue && initialValue.trim().length > 0) {
      try {
        const parsed = parsePhoneNumber(initialValue);
        if (parsed) {
          const matchedCountry = countries.find((c) => c.iso2 === parsed.country);
          if (matchedCountry) {
            setSelectedCountry(matchedCountry);
            setLocalNumber(parsed.formatNational());
            return;
          }
        }
      } catch {
        // fall through to default
      }
    }
    setSelectedCountry(DEFAULT_COUNTRY);
    setLocalNumber('');
  }, []);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (isDropdownOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isDropdownOpen]);

  const placeholder = React.useMemo(
    () => getPlaceholderForCountry(selectedCountry.iso2),
    [selectedCountry.iso2]
  );

  const filteredCountries = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.iso2.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const containerClass = React.useMemo(() => {
    const classes = ['mobile-input-container'];
    if (isTouched && validationResult) {
      classes.push(validationResult.isValid ? 'is-valid' : 'is-invalid');
    }
    return classes.join(' ');
  }, [isTouched, validationResult]);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    setSearchQuery('');

    if (isTouched && localNumber) {
      const result = validatePhone(localNumber.replace(/\D/g, ''), country.dialCode, country.iso2);
      setValidationResult(result);
      onValidationChange?.(result.isValid);
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const formatted = formatAsYouType(raw, selectedCountry.iso2);
    setLocalNumber(formatted);

    if (isTouched) {
      if (raw.length === 0) {
        setValidationResult(null);
        onValidationChange?.(false);
      } else {
        const result = validatePhone(raw, selectedCountry.dialCode, selectedCountry.iso2);
        setValidationResult(result);
        onValidationChange?.(result.isValid);
        if (result.isValid) {
          onChange(result.e164Format);
        }
      }
    }
  };

  const handleBlur = () => {
    setIsTouched(true);
    const raw = localNumber.replace(/\D/g, '');
    if (raw.length === 0) {
      setValidationResult(null);
      return;
    }
    const result = validatePhone(raw, selectedCountry.dialCode, selectedCountry.iso2);
    setValidationResult(result);
    onValidationChange?.(result.isValid);
    if (result.isValid) {
      onChange(result.e164Format);
    }
  };

  return (
    <div className="mobile-input-wrapper">
      <div className={containerClass}>
        {/* Country Code Selector */}
        <div className="country-selector" ref={dropdownRef}>
          <button
            type="button"
            className="country-selector-button"
            disabled={disabled}
            onClick={() => !disabled && setIsDropdownOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
          >
            <span className="country-flag">{selectedCountry.flag}</span>
            <span className="country-dial">{selectedCountry.dialCode}</span>
            <span className="dropdown-arrow">▼</span>
          </button>

          {isDropdownOpen && (
            <div className="country-dropdown" role="dialog">
              <input
                ref={searchRef}
                type="text"
                className="country-search"
                placeholder="Search country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <ul className="country-list" role="listbox">
                {filteredCountries.length === 0 ? (
                  <li className="country-list-empty">No results</li>
                ) : (
                  filteredCountries.map((country) => (
                    <li
                      key={country.iso2}
                      role="option"
                      aria-selected={country.iso2 === selectedCountry.iso2}
                      className={`country-list-item${country.iso2 === selectedCountry.iso2 ? ' selected' : ''}`}
                      onMouseDown={() => handleCountrySelect(country)}
                    >
                      <span className="country-flag">{country.flag}</span>
                      <span className="country-name">{country.name}</span>
                      <span className="country-code">{country.dialCode}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Phone Number Input */}
        <input
          type="tel"
          className="phone-number-input"
          value={localNumber}
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleNumberChange}
          onBlur={handleBlur}
          inputMode="tel"
        />
      </div>

      {/* Validation Error */}
      {isTouched && validationResult && !validationResult.isValid && (
        <div className="phone-error-message" role="alert">
          ⚠ {validationResult.errorMessage}
        </div>
      )}
    </div>
  );
};

export default MobileInput;
