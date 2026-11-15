import { adaptiveText } from '../academy/adaptive';
import { useI18n } from '../i18n/I18nContext';
import { useIntegratedText } from '../i18n/useIntegratedText';
import React, { useState } from 'react';
import { AUDIENCES, Audience, Knowledge, LearnerProfile, validProfile } from '../academy/model';
import { useAcademy } from '../context/AcademyContext';
import { AccessibleDialog } from './AccessibleDialog';
import { announce } from '../services/accessibility';
import { CodenameControl } from './CodenameControl';
export function LearnerProfileSelector({ onClose, mandatory = false }: { onClose: () => void; mandatory?: boolean }) {
  const { lang } = useI18n();
  const tx = useIntegratedText();
  const { cadet, profile, setProfile, access, setAccess } = useAcademy();
  const [audience, setAudience] = useState<Audience>(profile?.audience || 'junior');
  const [knowledge, setKnowledge] = useState<Knowledge>(profile?.knowledge || 'beginner');
  const [mode, setMode] = useState<LearnerProfile['mode']>(profile?.mode || 'learn');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <AccessibleDialog title={tx("Tu forma de explorar")} onClose={onClose} mandatory={mandatory} wide>
    <p className="panel-intro">{tx("La misma nave, la misma física. Elige cómo quieres aprender. Puedes cambiarlo después sin perder tu expediente.")}</p>
    <form onSubmit={async event => {
      event.preventDefault(); const next = { alias: cadet.codename, audience, knowledge, mode };
      if (!validProfile(next)) { setError(tx("Sortea un nombre en clave válido.")); return; }
      setBusy(true); setError('');
      try { await setProfile(next); announce({ es: 'Perfil guardado. Bienvenido al hangar, ' + cadet.codename, en: 'Profile saved. Welcome to the hangar, ' + cadet.codename }, 'success'); onClose(); }
      catch (error) { setError((error as Error).message); }
      finally { setBusy(false); }
    }}>
      <CodenameControl />
      <fieldset><legend>{tx("Perfil educativo · franja de edad")}</legend><div className="profile-grid">{Object.entries(AUDIENCES).map(([id, item], i) => <label className={`profile-card ${audience === id ? 'selected' : ''}`} key={id}><input type="radio" name="audience" value={id} checked={audience === id} onChange={() => setAudience(id as Audience)} /><span className="profile-number">0{i + 1}</span><strong>{tx(item.title)}</strong><span className="age-pill">{tx(item.age)}</span><span>{tx(item.description)}</span></label>)}</div></fieldset>
      <div className="two-columns"><label className="field">{tx("Conocimiento previo")}<select value={knowledge} onChange={e => setKnowledge(e.target.value as Knowledge)}><option value="beginner">{tx("Principiante · desde cero")}</option><option value="intermediate">{tx("Intermedio · conozco lo básico")}</option><option value="expert">{tx("Avanzado · quiero profundizar")}</option></select></label><label className="field">{tx("Experiencia")}<select value={mode} onChange={e => setMode(e.target.value as LearnerProfile['mode'])}><option value="learn">{tx("Aprender · guía antes de construir")}</option><option value="challenge">{tx("Desafío · decisiones e imprevistos")}</option></select></label></div>
      <div className="learning-strip" aria-live="polite"><strong>{tx("Ejemplo de una alerta de energía")}</strong><p>{adaptiveText('power.deficit', { audience, knowledge }, lang)}</p></div>
      <fieldset><legend>{tx("Accesibilidad desde el inicio")}</legend><div className="check-row"><label><input type="checkbox" checked={access.narration} onChange={e => setAccess({ ...access, narration: e.target.checked })} /> {tx("Hangar sonoro / narración")}</label><label><input type="checkbox" checked={access.captions} onChange={e => setAccess({ ...access, captions: e.target.checked })} /> {tx("Subtítulos")}</label><label><input type="checkbox" checked={access.reducedMotion} onChange={e => setAccess({ ...access, reducedMotion: e.target.checked })} /> {tx("Movimiento reducido")}</label></div></fieldset>
      <button className="primary-button" type="submit" disabled={busy}>{busy ? tx("Guardando…") : mandatory ? tx("Crear perfil y entrar al hangar") : tx("Guardar preferencias")} <span aria-hidden="true">↗</span></button>
      {error && <p role="alert">{tx(error)}</p>}
    </form>
  </AccessibleDialog>;
}
