'use client'

import { cn } from '@langgenius/dify-ui/cn'
import { useWorkspacePermissionGroups } from './hooks'
import PermissionPicker from './permission-picker'

export type PermissionFieldProps = {
  value: string[]
  onChange: (next: string[]) => void
  readonly?: boolean
}

const PermissionField = ({
  value,
  onChange,
  readonly = false,
}: PermissionFieldProps) => {
  const { permissionMap } = useWorkspacePermissionGroups()

  const handleRemove = (id: string) => {
    onChange(value.filter(p => p !== id))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="system-sm-medium text-text-secondary">Permissions</div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((key) => {
            const p = permissionMap[key]
            if (!p)
              return null
            return (
              <span
                key={key}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md bg-util-colors-indigo-indigo-50 px-1.5 py-0.5 system-xs-medium text-text-accent',
                  'border-[0.5px] border-components-panel-border',
                )}
              >
                <span>{p.name}</span>
                {!readonly && (
                  <button
                    type="button"
                    className="flex h-3.5 w-3.5 items-center justify-center rounded hover:bg-state-base-hover"
                    aria-label={`Remove ${p.name}`}
                    onClick={() => handleRemove(key)}
                  >
                    <span aria-hidden className="i-ri-close-line h-3 w-3" />
                  </button>
                )}
              </span>
            )
          })}
        </div>
      )}
      {
        value.length === 0 && (
          <div className="system-sm-regular text-text-tertiary">
            No permissions assigned yet
          </div>
        )
      }
      {!readonly && (
        <PermissionPicker value={value} onChange={onChange} />
      )}
    </div>
  )
}

export default PermissionField
