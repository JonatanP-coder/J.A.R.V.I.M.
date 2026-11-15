import { SourceLinks } from './SourceLinks';
import React, { useId, useState } from 'react';
import { getGlossary } from '../academy/curriculum';
import { useAcademy } from '../context/AcademyContext';
import { useI18n } from '../i18n/I18nContext';

/** Inline disclosure works inside a native dialog without opening a second modal. */
export function ContextualText({ text }: { text: string }) {
  const { profile } = useAcademy();
  const { lang } = useI18n();
  const entries = getGlossary(lang, profile);
  const [selected, select] = useState<string | null>(null);
  const region = useId();
  const byTerm = new Map(entries.flatMap(entry => [entry.term, ...entry.aliases].map(term =>
    [term.toLocaleLowerCase(lang), entry] as const)));
  const terms = [...byTerm.keys()].sort((a, b) => b.length - a.length);
  // The catalog contains words and phrases, including accented initial letters.
  const expression = new RegExp('(?<![\\p{L}\\p{N}])(' + terms.join('|') + ')(?![\\p{L}\\p{N}])', 'giu');
  const parts = text.split(expression);
  const lookup = (part: string) => byTerm.get(part.toLocaleLowerCase(lang));
  const active = entries.find(entry => entry.canonicalTerm === selected && parts.some(part => lookup(part) === entry));
  return <>{parts.map((part, index) => {
    const entry = index % 2 ? lookup(part) : undefined;
    if (!entry) return part;
    const expanded = entry === active;
    return <button type="button" className="glossary-term" key={index} aria-expanded={expanded}
      aria-controls={region} onClick={() => select(expanded ? null : entry.canonicalTerm)}>{part}</button>;
  })}<span id={region} hidden={!active} className="context-definition">{active && <><strong>{active.term}</strong> · {active.definition}<SourceLinks sources={active.sources} /></>}</span></>;
}
