import * as React from 'react';
import ReactCountryFlag from 'react-country-flag';
import { countries, Country } from '../utils/countries';
import {
  validatePhone,
  getPlaceholderForCountry,
  formatAsYouType,
  parseInitialValue,
  ValidationResult,
} from '../utils/validation';
import './MobileInput.css';

export interface MobileInputProps {
  initialValue: string;
  disabled: boolean;
  onChange: (e164Value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
}

const MobileInput: React.FC<MobileInputProps> = ({
  initialValue,
  disabled,
  onChange,
  onValidationChange,
}) => {
  const [selectedCountry, setSelectedCountry] = React.useState<Country>(() => {
    return parseInitialValue(initialValue, countries).country;
  });
  const [localNumber, setLocalNumber] = React.useState<string>(() => {
    return parseInitialValue(initialValue, countries).localNumber;
  });
  const [isTouched, setIsTouched] = React.useState<boolean>(false);
  const [validationResult, setValidationResult] = React.useState<ValidationResult | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

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
        c.dialCode.includes(q)
    );
  }, [searchQuery]);

  const containerClass = React.useMemo(() => {
    const classes = ['mobile-input-container'];
    if (disabled) {
      classes.push('is-disabled');
    } else if (isTouched && validationResult) {
      classes.push(validationResult.isValid ? 'is-valid' : 'is-invalid');
    }
    return classes.join(' ');
  }, [disabled, isTouched, validationResult]);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    setSearchQuery('');

    if (isTouched && localNumber) {
      const result = validatePhone(localNumber, country.dialCode, country.iso2, country.name);
      setValidationResult(result);
      onValidationChange?.(result.isValid);
      onChange(result.e164 || country.dialCode + localNumber.replace(/\D/g, ''));
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const formatted = formatAsYouType(raw, selectedCountry.iso2);
    setLocalNumber(formatted);

    const e164Candidate = selectedCountry.dialCode + raw;
    onChange(raw ? e164Candidate : '');

    if (isTouched) {
      if (!raw) {
        setValidationResult(null);
        onValidationChange?.(false);
      } else {
        const result = validatePhone(raw, selectedCountry.dialCode, selectedCountry.iso2, selectedCountry.name);
        setValidationResult(result);
        onValidationChange?.(result.isValid);
      }
    }
  };

  const handleBlur = () => {
    setIsTouched(true);
    const raw = localNumber.replace(/\D/g, '');
    if (!raw) {
      setValidationResult(null);
      onValidationChange?.(false);
      return;
    }
    const result = validatePhone(raw, selectedCountry.dialCode, selectedCountry.iso2, selectedCountry.name);
    setValidationResult(result);
    onValidationChange?.(result.isValid);
    onChange(result.e164 || selectedCountry.dialCode + raw);
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
            onClick={() => !disabled && setIsDropdownOpen((v: boolean) => !v)}
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
          >
            <ReactCountryFlag
              countryCode={selectedCountry.iso2}
              svg
              className="country-flag"
              aria-label={selectedCountry.name}
            />
            <span className="country-dial">{selectedCountry.dialCode}</span>
            <span className="dropdown-arrow">▾</span>
          </button>

          {isDropdownOpen && (
            <div className="country-dropdown" role="dialog">
              <input
                ref={searchRef}
                type="text"
                className="country-search"
                placeholder="Search country..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              />
              <ul className="country-list" role="listbox">
                {filteredCountries.length === 0 ? (
                  <li className="country-list-empty">No results</li>
                ) : (
                  filteredCountries.map((country: Country) => (
                    <li
                      key={country.iso2}
                      role="option"
                      aria-selected={country.iso2 === selectedCountry.iso2}
                      className={`country-list-item${country.iso2 === selectedCountry.iso2 ? ' selected' : ''}`}
                      onMouseDown={() => handleCountrySelect(country)}
                    >
                      <ReactCountryFlag
                        countryCode={country.iso2}
                        svg
                        className="country-flag"
                        aria-label={country.name}
                      />
                      <span className="country-dial-code">{country.dialCode}</span>
                      <span className="country-name">{country.name}</span>
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

      {/* Validation feedback */}
      {isTouched && validationResult && !validationResult.isValid && (
        <div className="phone-error-message" role="alert">
          ⚠ {validationResult.errorMessage}
        </div>
      )}
      {isTouched && validationResult && validationResult.isValid && (
        <div className="phone-valid-message" role="status">
          ✅
        </div>
      )}
    </div>
  );
};

export default MobileInput;
