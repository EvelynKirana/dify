import type { EvaluationMetric, MetricOption, NonPipelineEvaluationResourceProps } from '../../types'
import type { NodeInfo } from '@/types/evaluation'

export type MetricSelectorProps = NonPipelineEvaluationResourceProps & {
  triggerClassName?: string
  triggerStyle?: 'button' | 'text'
}

export type MetricVisualTone = 'indigo' | 'green'

export type MetricSelectorSection = {
  metric: MetricOption
  hasNoNodeInfo: boolean
  visibleNodes: NodeInfo[]
}

export type BuiltinMetricMap = Map<string, EvaluationMetric>
