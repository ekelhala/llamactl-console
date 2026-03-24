import { IconLoader2 } from '@tabler/icons-react'

import { cn } from '@/lib/utils'

type SpinnerProps = React.ComponentProps<'svg'> & {
  size?: 'sm' | 'md' | 'lg'
}

const spinnerSizeClass: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
}

function Spinner({ className, size = 'md', ...props }: SpinnerProps) {
  return (
    <IconLoader2
      data-slot="spinner"
      className={cn('animate-spin text-muted-foreground', spinnerSizeClass[size], className)}
      {...props}
    />
  )
}

export { Spinner }
