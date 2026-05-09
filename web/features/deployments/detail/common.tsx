'use client'

import type { ReactNode } from 'react'

type SectionProps = {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}

export function Section({ title, description, action, children }: SectionProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-components-panel-border bg-components-panel-bg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="system-sm-semibold text-text-primary">{title}</div>
          {description && (
            <p className="mt-1 max-w-xl system-xs-regular text-text-tertiary">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
