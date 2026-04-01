import { APP_LOGO_URL, APP_NAME, APP_SHORT_NAME } from '@/lib/branding'

interface AppBrandProps {
  compact?: boolean
  dark?: boolean
}

export function AppBrand({ compact = false, dark = false }: AppBrandProps) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={APP_LOGO_URL}
        alt={APP_NAME}
        className={compact ? 'h-10 w-10 rounded-xl object-cover' : 'h-12 w-12 rounded-xl object-cover'}
      />
      <div>
        <p className={`font-bold leading-tight ${compact ? 'text-sm' : 'text-xl'} ${dark ? 'text-white' : 'text-gray-900'}`}>
          {APP_SHORT_NAME}
        </p>
        <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
          Management System
        </p>
      </div>
    </div>
  )
}
