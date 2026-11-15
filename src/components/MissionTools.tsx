import { SourceLinks } from './SourceLinks';
import { learningCopy } from '../i18n/learningCopy';
import { useIntegratedText } from '../i18n/useIntegratedText';
import React, { useEffect, useRef, useState } from 'react';
import { useAcademy } from '../context/AcademyContext';
import { AUDIENCES, totalXP } from '../academy/model';
import { getGlossary } from '../academy/curriculum';
import { useI18n } from '../i18n/I18nContext';
import { locale, type BilingualText } from '../i18n/integratedCopy';
import { localizeMissionMessage } from '../i18n/missionMessages';
import { MissionProfile, MissionStats, SpacecraftComponent } from '../types/mission';
import { configureAccessibility, announce, startVoiceCommand, optionCommand } from '../services/accessibility';
import { shipReport } from '../utils/engineering';
import { readStored, writeStored } from '../services/storage';
import { AccessibleDialog } from './AccessibleDialog';
import { LearnerProfileSelector } from './LearnerProfileSelector';
import { AcademyPanel } from './AcademyPanel';
interface Message { text: string; severity: 'info' | 'warning' | 'success'; time: string; translations?: BilingualText }
export function MissionTools({ components, stats, mission, isMuted, gameState, onSelectComponent }: { components: Record<string, SpacecraftComponent>; stats: MissionStats; mission: MissionProfile; isMuted: boolean; gameState: string; onSelectComponent: (component: SpacecraftComponent) => void }) {
  const tx = useIntegratedText();
  const { lang } = useI18n();
  const { profile, access, setAccess, progress, storageOK } = useAcademy();
  const glossary = getGlossary(lang, profile);
  const messageText = (message: Message) => localizeMissionMessage(message, lang);
  const [panel, setPanel] = useState<'academy' | 'profile' | 'access' | 'glossary' | 'log' | null>(null);
  const [messages, setMessages] = useState<Message[]>(() => readStored('jamt:log', [], v => Array.isArray(v) && v.every(m => typeof m.text === 'string' && typeof m.time === 'string')));
  const [caption, setCaption] = useState<Message | null>(null); const [query, setQuery] = useState('');
  useEffect(() => {
    setQuery(previous => {
      const entry = [...getGlossary('es', profile), ...getGlossary('en', profile)].find(item => item.term.toLowerCase() === previous.toLowerCase());
      return entry ? getGlossary(lang, profile).find(item => item.canonicalTerm === entry.canonicalTerm)!.term : previous;
    });
  }, [lang]);
  const [listening, setListening] = useState(false); const stopVoice = useRef<(() => void) | null>(null);
  useEffect(() => { configureAccessibility(access, isMuted, profile?.audience === 'adult'); if (profile?.audience !== 'adult') { stopVoice.current?.(); setListening(false); } document.documentElement.dataset.contrast = String(access.contrast); document.documentElement.dataset.reducedMotion = String(access.reducedMotion); document.documentElement.dataset.largeText = String(access.largeText); }, [access, isMuted, profile?.audience]);
  useEffect(() => {
    const listener = (e: Event) => { const message = { ...(e as CustomEvent).detail, time: (e as CustomEvent).detail.time || new Date().toISOString() }; setCaption(message); setMessages(prev => { const next = [...prev, message].slice(-100); writeStored('jamt:log', next); return next; }); };
    window.addEventListener('jamt:message', listener); return () => { window.removeEventListener('jamt:message', listener); stopVoice.current?.(); };
  }, []);
  useEffect(() => { if (!caption) return; const timer = setTimeout(() => setCaption(null), Math.max(12000, caption.text.length * 80)); return () => clearTimeout(timer); }, [caption]);
  const report = () => announce({ es: shipReport(components, stats, mission, 'es'), en: shipReport(components, stats, mission, 'en') }, 'info', true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.ctrlKey || e.altKey || e.metaKey || (e.target as HTMLElement).closest('input,select,textarea,[contenteditable],dialog')) return; if (e.key.toLowerCase() === 'r' && profile && !document.querySelector('dialog[open]')) { e.preventDefault(); report(); } };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [components, stats, mission, profile]);
  useEffect(() => {
    const onTerm = (e: Event) => { setQuery(glossary.find(entry => entry.canonicalTerm === (e as CustomEvent).detail)?.term || (e as CustomEvent).detail || ''); setPanel('glossary'); };
    window.addEventListener('jamt:glossary', onTerm); return () => window.removeEventListener('jamt:glossary', onTerm);
  }, [lang]);
  const listen = () => {
    if (listening) { stopVoice.current?.(); setListening(false); return; }
    setListening(true);
    stopVoice.current = startVoiceCommand(text => {
      if (text.includes('estado') || text.includes('reporte') || text.includes('status') || text.includes('report')) report();
      else if (optionCommand(text) !== null) window.dispatchEvent(new CustomEvent('jamt:command', { detail: optionCommand(text) === 1 ? 'option2' : 'option1' }));
      else if (text.includes('continuar') || text.includes('continue') || text.includes('resume')) window.dispatchEvent(new CustomEvent('jamt:command', { detail: 'continue' }));
      else if (text.includes('pausa') || text.includes('pause')) window.dispatchEvent(new CustomEvent('jamt:command', { detail: 'pause' }));
      else if ((text.includes('instala') || text.includes('instalar') || text.includes('install')) && gameState === 'HANGAR') {
        const match = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-component-name]')).find(el => text.includes(el.dataset.componentName!.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
        if (match) match.click(); else announce(tx("Enfoca una categoría y di instalar seguido del nombre completo de la pieza, o usa Enter."), 'warning');
      } else announce(tx("Comando no reconocido. Prueba estado de la nave, pausa, continuar, opción uno u opción dos."), 'warning');
    }, () => setListening(false));
    if (!stopVoice.current) setListening(false);
  };
  return <>
    {profile && <aside className={`mission-tools ${gameState === 'TITLE' ? 'on-title' : ''}`} aria-label={tx("Academia y herramientas de accesibilidad")}><div className="tools-identity"><span className="status-dot" /><span>{profile.alias}</span><small>{totalXP(progress)} XP</small></div><button onClick={() => setPanel('academy')}>{tx("✧ Academia")} <span aria-hidden="true">↗</span></button><button onClick={() => setPanel('profile')}>{learningCopy[lang].settings} · {tx(AUDIENCES[profile.audience].title)}</button><button onClick={() => setPanel('access')}>{tx("♿ Accesibilidad")}</button><button onClick={report} aria-keyshortcuts="R">{tx("⌁ Estado de la nave")} <kbd>R</kbd></button><div className="tools-pair"><button onClick={() => { setQuery(''); setPanel('glossary'); }}>{tx("Glosario")}</button><button onClick={() => setPanel('log')}>{tx("Bitácora")}</button></div><button onClick={listen} aria-pressed={listening}>{listening ? tx("■ Detener micrófono") : tx("♩ Comando de voz")}</button></aside>}
    {!storageOK && <div role="alert" className="storage-warning">{tx("Almacenamiento del navegador no disponible. Exporta tu expediente desde la Academia antes de cerrar.")}</div>}
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{caption ? messageText(caption) : ""}</div>
    {access.captions && caption && <div className={`mission-caption ${caption.severity}`}><span className="eyebrow">{caption.severity === 'warning' ? tx("⚠ ATENCIÓN") : caption.severity === 'success' ? tx("✓ CONFIRMACIÓN") : tx("CONTROL DE MISIÓN")}</span><p>{messageText(caption)}</p><button aria-label={tx("Cerrar subtítulo")} onClick={() => setCaption(null)}>✕</button></div>}
    {panel === 'academy' && <AcademyPanel onClose={() => setPanel(null)} />}
    {panel === 'profile' && <LearnerProfileSelector onClose={() => setPanel(null)} />}
    {panel === 'access' && <AccessibleDialog title={tx("Accesibilidad a tu medida")} onClose={() => setPanel(null)}><p>{tx("Combina preferencias según lo que necesites. Todas las decisiones tienen alternativa de teclado y texto.")}</p>{([['narration', tx("Hangar sonoro / lectura al enfocar piezas")], ['captions', tx("Subtítulos y alertas visuales")], ['contrast', tx("Alto contraste")], ['largeText', tx("Texto ampliado")], ['reducedMotion', tx("Reducir animaciones y movimientos de cámara")], ['radar', tx("Radar acústico de peligros en ruta")]] as const).map(([key, label]) => <label className="quiz-option" key={key}><input type="checkbox" checked={access[key]} onChange={e => setAccess({ ...access, [key]: e.target.checked })} />{label}</label>)}<p className="muted">{tx("En el hangar: flechas izquierda/derecha cambian categoría; arriba/abajo recorren piezas; Enter instala; R lee el estado. También puedes deslizar en la bandeja. En una emergencia: 1 o 2 eligen una opción. El micrófono solo se activa al pulsar su botón; el reconocimiento puede depender de servicios del navegador.")}</p><button className="secondary-button" onClick={() => announce(tx("Prueba de voz. El espacio es para todas las personas."), 'info', true)}>{tx("Probar voz y subtítulos")}</button><button className="secondary-button" onClick={() => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }}>{tx("Detener lectura")}</button></AccessibleDialog>}
    {panel === 'glossary' && <AccessibleDialog title={tx("Glosario de misión")} onClose={() => setPanel(null)}><label className="field">{tx("Buscar un término")}<input autoFocus type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={tx("Masa, órbita, propulsión…")} /></label><dl className="glossary-list">{glossary.filter(g => [g.term, g.canonicalTerm, ...g.aliases].some(term => term.toLocaleLowerCase(locale(lang)).includes(query.toLocaleLowerCase(locale(lang))))).map(g => <div key={g.term}><dt>{g.term}<button className="icon-button" aria-label={tx("Escuchar definición de ") + g.term} onClick={() => announce({ es: getGlossary('es', profile).find(entry => entry.canonicalTerm === g.canonicalTerm)!.term + '. ' + getGlossary('es', profile).find(entry => entry.canonicalTerm === g.canonicalTerm)!.definition, en: getGlossary('en', profile).find(entry => entry.canonicalTerm === g.canonicalTerm)!.term + '. ' + getGlossary('en', profile).find(entry => entry.canonicalTerm === g.canonicalTerm)!.definition }, 'info', true)}>♩</button></dt><dd>{g.definition}<SourceLinks sources={g.sources} /></dd></div>)}</dl>{!glossary.some(g => [g.term, g.canonicalTerm, ...g.aliases].some(term => term.toLocaleLowerCase(locale(lang)).includes(query.toLocaleLowerCase(locale(lang))))) && <p>{tx("Sin coincidencias. Prueba con otro término.")}</p>}</AccessibleDialog>}
    {panel === 'log' && <AccessibleDialog title={tx("Bitácora de misión")} onClose={() => setPanel(null)}><p className="muted">{tx("Últimas 100 comunicaciones, guardadas en este dispositivo.")}</p><ol className="mission-log">{messages.map((m, i) => <li className={m.severity} key={m.time + i}><time dateTime={m.time}>{new Date(m.time).toLocaleTimeString(locale(lang), { hour: '2-digit', minute: '2-digit' })}</time><p>{messageText(m)}</p></li>)}</ol>{!messages.length && <p>{tx("Explora una pieza o solicita el estado para iniciar la bitácora.")}</p>}</AccessibleDialog>}
  </>;
}
export function GlossaryTerm({ term, children }: { term: string; children?: React.ReactNode }) {
  const tx = useIntegratedText();
  return <button type="button" className="glossary-term" onClick={() => window.dispatchEvent(new CustomEvent('jamt:glossary', { detail: term }))}>{children || tx(term)}</button>; }
