import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { countries, Country } from '../utils/countries';
import {
  validatePhone,
  getPlaceholderForCountry,
  formatAsYouType,
  parseInitialValue,
  ValidationResult,
} from '../utils/validation';
import './MobileInput.css';

const CountryFlag: React.FC<{ iso2: string; name: string; className?: string }> = ({ iso2, name, className }) => (
  <img
    src={`https://flagcdn.com/w40/${iso2.toLowerCase()}.png`}
    srcSet={`https://flagcdn.com/w80/${iso2.toLowerCase()}.png 2x`}
    width={22}
    height={16}
    alt={name}
    className={className}
    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
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

  const [selectedCountry, setSelectedCountry]     = React.useState<Country>(parsed.country);
  const [localNumber, setLocalNumber]             = React.useState<string>(parsed.localNumber);
  const [isTouched, setIsTouched]                 = React.useState<boolean>(false);
  const [validationResult, setValidationResult]   = React.useState<ValidationResult | null>(null);
  const [isDropdownOpen, setIsDropdownOpen]       = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery]             = React.useState<string>('');
  const [panelStyle, setPanelStyle]               = React.useState<React.CSSProperties>({});

  const triggerRef      = React.useRef<HTMLButtonElement>(null); // trigger button
  const panelRef        = React.useRef<HTMLDivElement>(null);    // portal panel
  const searchRef       = React.useRef<HTMLInputElement>(null);
  const selectedItemRef = React.useRef<HTMLLIElement>(null);

  // ── Compute fixed position for the portal panel ──────────────────────────
  const computePanelStyle = React.useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPanelStyle({
      position: 'fixed',
      top:  r.bottom + 4,
      left: r.left,
      width: 280,
      zIndex: 99999,
    });
  }, []);

  // Re-compute on open; track scroll/resize while open
  React.useEffect(() => {
    if (!isDropdownOpen) return;
    computePanelStyle();
    window.addEventListener('scroll', computePanelStyle, true);
    window.addEventListener('resize', computePanelStyle);
    return () => {
      window.removeEventListener('scroll', computePanelStyle, true);
      window.removeEventListener('resize', computePanelStyle);
    };
  }, [isDropdownOpen, computePanelStyle]);

  // ── Outside-click: close if click lands outside trigger AND panel ─────────
  React.useEffect(() => {
    if (!isDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      const inTrigger = triggerRef.current?.contains(e.target as Node);
      const inPanel   = panelRef.current?.contains(e.target as Node);
      if (!inTrigger && !inPanel) {
        setIsDropdownOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isDropdownOpen]);

  // ── Auto-scroll selected item into view + focus search ───────────────────
  React.useEffect(() => {
    if (!isDropdownOpen) return;
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

  const filteredCountries: Country[] = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return countries;
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q)
    ) || [];
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

  const handleToggleDropdown = React.useCallback(() => {
    if (disabled) return;
    setIsDropdownOpen((prev) => {
      if (prev) setSearchQuery('');
      return !prev;
    });
  }, [disabled]);

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

  // Portal panel — rendered into document.body so it floats above PCF host
  const dropdownPanel = isDropdownOpen
    ? ReactDOM.createPortal(
        <div ref={panelRef} className="country-dropdown" style={panelStyle} role="dialog">
          <input
            ref={searchRef}
            type="text"
            className="country-search"
            placeholder="Search country..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            // prevent blur on phone input while typing in search
            onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
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
                    // onMouseDown + preventDefault fixes blur-before-select race:
                    // prevents the phone input from firing blur before selection commits
                    onMouseDown={(e: React.MouseEvent) => {
                      e.preventDefault();
                      handleCountrySelect(country);
                    }}
                  >
                    <CountryFlag iso2={country.iso2} name={country.name} className="country-flag" />
                    <span className="country-dial-code">{country.dialCode}</span>
                    <span className="country-name">{country.name}</span>
                  </li>
                );
              })
            )}
          </ul>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="mobile-input-wrapper">
      <div className={containerClass}>

        {/* ── Country selector trigger ── */}
        <div className="country-selector">
          <button
            ref={triggerRef}
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

      {/* Portal panel lives in document.body — does NOT affect PCF host layout */}
      {dropdownPanel}

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
