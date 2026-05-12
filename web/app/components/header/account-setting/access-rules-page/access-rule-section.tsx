'use client'

import type { AccessPolicyWithBindings } from '@/models/access-control'
import { Button } from '@langgenius/dify-ui/button'
import { cn } from '@langgenius/dify-ui/cn'
import { memo } from 'react'
import AccessRuleRow from './access-rule-row'

type AccessRuleSectionProps = {
  title: string
  rules: AccessPolicyWithBindings[]
  isLoadingRules: boolean
  createButtonLabel: string
  onCreate?: () => void
  onEditRule?: (rule: AccessPolicyWithBindings) => void
  onAddRole?: (rule: AccessPolicyWithBindings) => void
  className?: string
}

const AccessRuleSection = ({
  title,
  rules,
  isLoadingRules,
  createButtonLabel,
  onCreate,
  onEditRule,
  onAddRole,
  className,
}: AccessRuleSectionProps) => {
  return (
    <section className={cn('flex flex-col', className)}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="pr-3 system-xs-medium-uppercase tracking-wide text-text-tertiary">
          {title}
        </h3>
        <Button
          variant="secondary"
          size="medium"
          onClick={onCreate}
          disabled={isLoadingRules}
        >
          {createButtonLabel}
        </Button>
      </div>
      <div className="overflow-hidden">
        {rules.map((rule, index) => (
          <AccessRuleRow
            key={rule.policy.id}
            rule={rule}
            className={cn(index > 0 && 'border-t border-divider-subtle')}
            onEdit={onEditRule}
            onAddRole={onAddRole}
          />
        ))}
      </div>
    </section>
  )
}

export default memo(AccessRuleSection)
