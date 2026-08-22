interface Props { size?: 'sm' | 'md' | 'lg'; className?: string }

const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }

export function Spinner({ size = 'md', className = '' }: Props) {
  return (
    <div
      className={`${sizes[size]} animate-spin rounded-full border-2 border-gray-200 border-t-blue-600 ${className}`}
    />
  )
}
