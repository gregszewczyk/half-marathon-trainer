import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        primary: 'bg-primary-500/20 text-primary-400 border border-primary-500/30',
        secondary: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
        success: 'bg-green-500/20 text-green-400 border border-green-500/30',
        warning: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
        error: 'bg-red-500/20 text-red-400 border border-red-500/30',
        info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
        outline: 'border border-gray-600 text-gray-300',
        // Training specific variants
        easy: 'bg-training-easy/20 text-training-easy border border-training-easy/30',
        tempo: 'bg-training-tempo/20 text-training-tempo border border-training-tempo/30',
        intervals: 'bg-training-intervals/20 text-training-intervals border border-training-intervals/30',
        long: 'bg-training-long/20 text-training-long border border-training-long/30',
        gym: 'bg-training-gym-push/20 text-training-gym-push border border-training-gym-push/30',
        rest: 'bg-training-rest/20 text-training-rest border border-training-rest/30',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        default: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }