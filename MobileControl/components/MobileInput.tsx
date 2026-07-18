import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { countries, Country } from '../utils/countries';
import {
  validatePhone,
  formatAsYouType,
  parseInitialValue,
  ValidationResult,
} from '../utils/validation';

// Debounce helper — returns a cancel function
function debounce<T extends (...args: Parameters<T>) => void>(fn: T, ms: number) {
  let id: ReturnType<typeof setTimeout>;
  const debounced = (...args: Parameters<T>) => { clearTimeout(id); id = setTimeout(() => fn(...args), ms); };
  debounced.cancel = () => clearTimeout(id);
  return debounced;
}
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
  onValidationChange?: (isValid: boolean, errorMessage: string | null) => void;
}

const MobileInput: React.FC<MobileInputProps> = ({
  initialValue,
  disabled,
  onChange,
  onValidationChange,
}) => {
  const parsedInit = React.useMemo(() => parseInitialValue(initialValue, countries), []);

  const [selectedCountry, setSelectedCountry]   = React.useState<Country>(parsedInit.country);
  const [localNumber, setLocalNumber]           = React.useState<string>(parsedInit.localNumber);
  const [isTouched, setIsTouched]               = React.useState<boolean>(false);
  const [validationResult, setValidationResult] = React.useState<ValidationResult | null>(null);
  const [isDropdownOpen, setIsDropdownOpen]     = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery]           = React.useState<string>('');
  const [panelStyle, setPanelStyle]             = React.useState<React.CSSProperties>({});

  const triggerRef        = React.useRef<HTMLButtonElement>(null);
  const panelRef          = React.useRef<HTMLDivElement>(null);
  const searchRef         = React.useRef<HTMLInputElement>(null);
  const selectedItemRef   = React.useRef<HTMLLIElement>(null);
  const lastExternalValue = React.useRef<string>(initialValue);

  // Debounced validator — only runs 350ms after the user pauses typing.
  // Defined as a stable ref so it isn't recreated on every render.
  const debouncedValidate = React.useRef(
    debounce((raw: string, dialCode: string, iso2: string, countryName: string,
              setResult: (r: ValidationResult | null) => void,
              notify: (v: boolean, m: string | null) => void) => {
      if (!raw) { setResult(null); notify(false, null); return; }
      const result = validatePhone(raw, dialCode, iso2, countryName);
      setResult(result);
      notify(result.isValid, result.errorMessage);
    }, 350)
  ).current;

  // ── Sync state when PCF updateView delivers a new external value ──────────
  // (e.g. data loaded via migration, form prefill, or record refresh)
  React.useEffect(() => {
    // Ignore echoes of values we already processed
    if (initialValue === lastExternalValue.current) return;
    lastExternalValue.current = initialValue;

    if (!initialValue) {
      setSelectedCountry(countries[0]);
      setLocalNumber('');
      setValidationResult(null);
      onValidationChange?.(false, null);
      return;
    }

    const reparsed = parseInitialValue(initialValue, countries);
    // parseInitialValue returns localNumber='' when the value can't be fully
    // parsed (e.g. a partial number echoed back while user is still typing).
    // Only sync state for complete, parseable numbers.
    if (!reparsed.localNumber) return;

    setSelectedCountry(reparsed.country);
    setLocalNumber(reparsed.localNumber);

    const result = validatePhone(
      reparsed.localNumber.replace(/\D/g, ''),
      reparsed.country.dialCode,
      reparsed.country.iso2,
      reparsed.country.name
    );
    setValidationResult(result);
    onValidationChange?.(result.isValid, result.errorMessage);
  }, [initialValue]);

  // ── Portal position ───────────────────────────────────────────────────────
  const computePanelStyle = React.useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPanelStyle({ position: 'fixed', top: r.bottom + 4, left: r.left, width: 280, zIndex: 99999 });
  }, []);

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

  // ── Outside-click ─────────────────────────────────────────────────────────
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

  // Cancel pending debounced validation on unmount
  React.useEffect(() => () => debouncedValidate.cancel(), []);

  // ── Auto-scroll + focus search on open ───────────────────────────────────
  React.useEffect(() => {
    if (!isDropdownOpen) return;
    const raf = requestAnimationFrame(() => {
      selectedItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      searchRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [isDropdownOpen]);

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
    debouncedValidate.cancel();
    const raw = localNumber.replace(/\D/g, '');
    if (isTouched && raw) {
      const result = validatePhone(raw, country.dialCode, country.iso2, country.name);
      setValidationResult(result);
      onValidationChange?.(result.isValid, result.errorMessage);
      onChange(result.e164 || country.dialCode + raw);
    }
  };

  // ── FAST path: zero libphonenumber-js work on every keystroke ─────────────
  // We store raw digits immediately (instant re-render) and fire E.164 output.
  // Formatting runs only on blur; validation is debounced so it doesn't compete
  // with rapid input.
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setLocalNumber(raw);                                    // raw digits, no formatting
    onChange(raw ? selectedCountry.dialCode + raw : '');   // E.164 output immediately

    if (isTouched) {
      // Debounce: wait for pause in typing before running libphonenumber-js
      debouncedValidate(
        raw,
        selectedCountry.dialCode,
        selectedCountry.iso2,
        selectedCountry.name,
        setValidationResult,
        (v, m) => onValidationChange?.(v, m)
      );
    }
  };

  // ── Strip formatting on focus so editing is clean ─────────────────────────
  const handleFocus = () => {
    const raw = localNumber.replace(/\D/g, '');
    if (raw !== localNumber) setLocalNumber(raw);
  };

  // ── SLOW path: format display + full validation on blur ───────────────────
  const handleBlur = () => {
    debouncedValidate.cancel();
    setIsTouched(true);
    const raw = localNumber.replace(/\D/g, '');
    if (!raw) {
      setLocalNumber('');
      setValidationResult(null);
      onValidationChange?.(false, null);
      return;
    }
    // Format the display value once, on blur — no per-keystroke overhead
    const formatted = formatAsYouType(raw, selectedCountry.iso2);
    setLocalNumber(formatted);

    const result = validatePhone(raw, selectedCountry.dialCode, selectedCountry.iso2, selectedCountry.name);
    setValidationResult(result);
    onValidationChange?.(result.isValid, result.errorMessage);
    onChange(result.e164 || selectedCountry.dialCode + raw);
  };

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
            <CountryFlag iso2={selectedCountry.iso2} name={selectedCountry.name} className="country-flag" />
            <span className="country-dial">{selectedCountry.dialCode}</span>
            <span className="dropdown-arrow">▾</span>
          </button>
        </div>

        <input
          type="tel"
          className="phone-number-input"
          value={localNumber}
          disabled={disabled}
          onChange={handleNumberChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          inputMode="tel"
        />
      </div>

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
