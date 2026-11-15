import type { EducationalContent } from '../types/sources';
import { useI18n } from '../i18n/I18nContext';
import { learningCopy } from '../i18n/learningCopy';

export function SourceLinks({ sources, model = false }: Pick<EducationalContent, 'sources'> & { model?: boolean }) {
  const { lang } = useI18n();
  const copy = learningCopy[lang];
  return <span className="nasa-sources">
    {model && <small>{copy.model}</small>}
    <strong>{copy.sources}</strong>
    {sources.map(source => <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer"
      title={source.organization + ' · ' + copy.checked + ' ' + source.verifiedYear}>
      {source.title} <span aria-hidden="true">↗</span>
    </a>)}
  </span>;
}
