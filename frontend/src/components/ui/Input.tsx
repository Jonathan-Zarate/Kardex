import { useState, type InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  showPasswordToggle?: boolean
}

export function Input({ label, error, id, className = '', showPasswordToggle = false, type, ...rest }: Props) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const canTogglePassword = showPasswordToggle && type === 'password'

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={canTogglePassword && passwordVisible ? 'text' : type}
          {...rest}
          className={`block w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
            error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
          } disabled:bg-gray-100 disabled:cursor-not-allowed ${canTogglePassword ? 'pr-10' : ''} ${className}`}
        />
        {canTogglePassword && (
          <button
            type="button"
            onClick={() => setPasswordVisible((visible) => !visible)}
            aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={passwordVisible}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-gray-500 transition hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          >
            <span className="material-icons text-xl" aria-hidden="true">
              {passwordVisible ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
