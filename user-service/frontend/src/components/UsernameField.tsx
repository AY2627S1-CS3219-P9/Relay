export function UsernameField({
  value,
  onChange,
  required = true,
}: {
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  return (
    <label>
      Username
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="username"
        required={required}
      />
      <small>3–50 alphanumeric characters.</small>
    </label>
  )
}
