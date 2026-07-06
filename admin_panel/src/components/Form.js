export default function Form(
  { fields, values, onChange, onSubmit, submitLabel },
) {
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      {fields.map((field) => (
        <label
          key={field.name}
          className={field.type === "checkbox" ? "check" : ""}
        >
          <span>{field.label}</span>
          {field.type === "checkbox"
            ? (
              <input
                checked={Boolean(values[field.name])}
                name={field.name}
                type="checkbox"
                onChange={(event) => onChange(field.name, event.target.checked)}
              />
            )
            : (
              <input
                name={field.name}
                placeholder={field.placeholder}
                type={field.type || "text"}
                value={values[field.name] ?? ""}
                onChange={(event) => onChange(field.name, event.target.value)}
              />
            )}
        </label>
      ))}
      <button className="primary" type="submit">{submitLabel}</button>
    </form>
  );
}
