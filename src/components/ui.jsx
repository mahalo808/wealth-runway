import React from "react";

export function NumberField({ label, value, onChange, prefix, suffix, step = 1, min }) {
  return (
    <label className="field">
      {label && <span className="field__label">{label}</span>}
      <div className="field__input">
        {prefix && <span className="field__affix">{prefix}</span>}
        <input
          type="number"
          value={value}
          min={min}
          step={step}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          onFocus={(e) => e.target.select()}
        />
        {suffix && <span className="field__affix">{suffix}</span>}
      </div>
    </label>
  );
}

export function TextField({ label, value, onChange, placeholder }) {
  return (
    <label className="field">
      {label && <span className="field__label">{label}</span>}
      <div className="field__input">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </label>
  );
}

export function SelectField({ label, value, onChange, options }) {
  return (
    <label className="field">
      {label && <span className="field__label">{label}</span>}
      <div className="field__input">
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

export function Stat({ label, value, hint, accent }) {
  return (
    <div className={`stat ${accent ? "stat--accent" : ""}`}>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
      {hint && <span className="stat__hint">{hint}</span>}
    </div>
  );
}

export function Section({ title, subtitle, right, children }) {
  return (
    <section className="panel section">
      {(title || right) && (
        <div className="section__head">
          <div>
            {title && <h2 className="section__title">{title}</h2>}
            {subtitle && <p className="section__sub">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Button({ children, onClick, variant = "default", type = "button", disabled }) {
  return (
    <button type={type} className={`btn btn--${variant}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function IconButton({ onClick, label, children }) {
  return (
    <button type="button" className="icon-btn" onClick={onClick} aria-label={label} title={label}>
      {children || "×"}
    </button>
  );
}
