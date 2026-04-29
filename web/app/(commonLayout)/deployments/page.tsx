'use client'
import { useTranslation } from 'react-i18next'
import DeploymentsMain from '@/features/deployments/list'
import useDocumentTitle from '@/hooks/use-document-title'

const DeploymentsPage = () => {
  const { t } = useTranslation('deployments')
  useDocumentTitle(t('documentTitle.list'))
  return <DeploymentsMain />
}

export default DeploymentsPage
