export function VerificationCodeField({
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
      Verification code
      <input
        className="otp-input"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
        required={required}
      />
    </label>
  )
}
