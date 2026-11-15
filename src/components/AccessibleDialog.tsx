import { useIntegratedText } from '../i18n/useIntegratedText';
import React, { useEffect, useRef } from 'react';
import { LanguageToggle } from './LanguageToggle';
export function AccessibleDialog({ title, onClose, children, mandatory = false, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; mandatory?: boolean; wide?: boolean }) {
  const tx = useIntegratedText();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement; const dialog = ref.current!;
    dialog.showModal();
    const siblings = Array.from(document.getElementById('root')!.children).filter(el => !el.contains(dialog)) as HTMLElement[];
    const prior = siblings.map(el => el.inert); siblings.forEach(el => { el.inert = true; });
    return () => { dialog.close(); siblings.forEach((el, i) => { el.inert = prior[i]; }); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={`academy-dialog ${wide ? 'wide' : ''}`} aria-labelledby="academy-dialog-title" onKeyDownCapture={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (!mandatory) onClose(); } }} onCancel={e => { e.preventDefault(); if (!mandatory) onClose(); }}>
    <header className="academy-dialog-header"><div><span className="eyebrow">{tx('JUNIOR ASTRONAUT · SISTEMA DE APRENDIZAJE')}</span><h2 id="academy-dialog-title">{title}</h2></div><div className="dialog-header-actions"><LanguageToggle compact />{!mandatory && <button type="button" className="icon-button" aria-label={tx("Cerrar panel")} onClick={onClose}>✕</button>}</div></header>
    <div className="academy-dialog-body">{children}</div>
  </dialog>;
}
