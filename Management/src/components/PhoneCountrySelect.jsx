import { getCountryCallingCode } from 'react-phone-number-input';

/**
 * Custom country `<select/>` for `react-phone-number-input`'s `<PhoneInput/>`.
 * Same behavior as the library's default country select (native `<select/>`
 * overlaid invisibly on a flag + arrow), but also shows the country's dial
 * code (e.g. "+94") next to the flag, so the number `<input/>` only needs
 * the local digits instead of the full "+94 77 123 4567" string.
 */
export default function PhoneCountrySelect({
  value,
  onChange,
  options,
  disabled,
  readOnly,
  className,
  iconComponent: Icon,
  ...rest
}) {
  const handleChange = (e) => {
    const next = e.target.value;
    onChange(next === 'ZZ' ? undefined : next);
  };

  const selectedOption = options.find((o) => !o.divider && (o.value || 'ZZ') === (value || 'ZZ'));

  return (
    <div className="PhoneInputCountry">
      <select
        {...rest}
        disabled={disabled || readOnly}
        readOnly={readOnly}
        value={value || 'ZZ'}
        onChange={handleChange}
        className={className ? `PhoneInputCountrySelect ${className}` : 'PhoneInputCountrySelect'}
      >
        {options.map(({ value: optionValue, label, divider }) => (
          <option
            key={divider ? '|' : optionValue || 'ZZ'}
            value={divider ? '|' : optionValue || 'ZZ'}
            disabled={!!divider}
          >
            {label}
          </option>
        ))}
      </select>
      {selectedOption && <Icon aria-hidden country={value} label={selectedOption.label} />}
      {value && (
        <span className="PhoneInputCountrySelectCode">+{getCountryCallingCode(value)}</span>
      )}
      <div className="PhoneInputCountrySelectArrow" />
    </div>
  );
}
