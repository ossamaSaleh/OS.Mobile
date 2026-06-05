import * as React from 'react';
import { countries, Country } from '../utils/countries';
import {
  validatePhone,
  getPlaceholderForCountry,
  formatAsYouType,
  parseInitialValue,
  ValidationResult,
} from '../utils/validation';
import './MobileInput.css';

// Renders a real flag image from flagcdn.com — works cross-platform (no emoji)
const CountryFlag: React.FC<{ iso2: string; name: string; className?: string }> = ({ iso2, name, className }) => (
  <img
    src={`https://flagcdn.com/w40/${iso2.toLowerCase()}.png`}
    srcSet={`https://flagcdn.com/w80/${iso2.toLowerCase()}.png 2x`}
    width={22}
    height={16}
    alt={name}
    className={className}
    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
      // Hide broken image — do NOT fall back to emoji (renders as "AE","US" on Windows)
      e.currentTarget.style.visibility = 'hidden';
    }}
  />
);

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
  const parsed = React.useMemo(() => parseInitialValue(initialValue, countries), []);

  const [selectedCountry, setSelectedCountry] = React.useState<Country>(parsed.country);
  const [localNumber, setLocalNumber]         = React.useState<string>(parsed.localNumber);
  const [isTouched, setIsTouched]             = React.useState<boolean>(false);
  const [validationResult, setValidationResult] = React.useState<ValidationResult | null>(null);
  const [isDropdownOpen, setIsDropdownOpen]   = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery]         = React.useState<string>('');

  const dropdownRef    = React.useRef<HTMLDivElement>(null);   // wraps trigger + panel
  const searchRef      = React.useRef<HTMLInputElement>(null);
  const selectedItemRef = React.useRef<HTMLLIElement>(null);

  // ── Outside-click: only register while dropdown is open ──────────────────
  React.useEffect(() => {
    if (!isDropdownOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isDropdownOpen]);

  // ── Auto-scroll selected item into view + focus search on open ───────────
  React.useEffect(() => {
    if (!isDropdownOpen) return;
    // Use rAF so the list is in the DOM before we scroll
    const raf = requestAnimationFrame(() => {
      selectedItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      searchRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [isDropdownOpen]);

  const placeholder = React.useMemo(
    () => getPlaceholderForCountry(selectedCountry.iso2),
    [selectedCountry.iso2]
  );

  // ── Filter with empty-result safety fallback ──────────────────────────────
  const filteredCountries: Country[] = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return countries;
    return (
      countries.filter(
        (c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q)
      ) || []
    );
  }, [searchQuery]);

  const containerClass = React.useMemo(() => {
    const cls = ['mobile-input-container'];
    if (disabled) {
      cls.push('is-disabled');
    } else if (isTouched && validationResult) {
      cls.push(validationResult.isValid ? 'is-valid' : 'is-invalid');
    }
    return cls.join(' ');
  }, [disabled, isTouched, validationResult]);

  // ── Explicit toggle ───────────────────────────────────────────────────────
  const handleToggleDropdown = React.useCallback(() => {
    if (disabled) return;
    setIsDropdownOpen((prev) => !prev);
    if (isDropdownOpen) setSearchQuery('');
  }, [disabled, isDropdownOpen]);

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

    onChange(raw ? selectedCountry.dialCode + raw : '');

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

        {/* ── Country selector ── */}
        <div className="country-selector" ref={dropdownRef}>
          <button
            type="button"
            className="country-selector-button"
            disabled={disabled}
            onClick={handleToggleDropdown}
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
          >
            <CountryFlag
              iso2={selectedCountry.iso2}
              name={selectedCountry.name}
              className="country-flag"
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
                  filteredCountries.map((country: Country) => {
                    const isSelected = country.iso2 === selectedCountry.iso2;
                    return (
                      <li
                        key={country.iso2}
                        ref={isSelected ? selectedItemRef : undefined}
                        role="option"
                        aria-selected={isSelected}
                        className={`country-list-item${isSelected ? ' selected' : ''}`}
                        onMouseDown={() => handleCountrySelect(country)}
                      >
                        <CountryFlag
                          iso2={country.iso2}
                          name={country.name}
                          className="country-flag"
                        />
                        <span className="country-dial-code">{country.dialCode}</span>
                        <span className="country-name">{country.name}</span>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          )}
        </div>

        {/* ── Phone number input ── */}
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

      {isTouched && validationResult && !validationResult.isValid && (
        <div className="phone-error-message" role="alert">
          ⚠ {validationResult.errorMessage}
        </div>
      )}
      {isTouched && validationResult?.isValid && (
        <div className="phone-valid-message" role="status">✅</div>
      )}
    </div>
  );
};

export default MobileInput;
