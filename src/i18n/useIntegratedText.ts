import { useCallback } from 'react';
import { useI18n } from './I18nContext';
import { translate } from './integratedCopy';
export function useIntegratedText() {
  const { lang } = useI18n();
  return useCallback((text: string) => translate(text, lang), [lang]);
}
