import { useIntegratedText } from '../i18n/useIntegratedText';
import React, { useEffect, useState } from 'react';
import { useAcademy } from '../context/AcademyContext';
import { CodenameControl, CodenamePicker } from './CodenameControl';

export function SecureAccountPanel() {
  const tx = useIntegratedText();
  const { cadet, profile, account, authenticate, logout, setPublicRanking } = useAcademy();
  const [action, setAction] = useState<'register' | 'login'>('register');
  const [password, setPassword] = useState('');
  const [loginCodename, setLoginCodename] = useState(cadet.codename as string);
  const [publish, setPublish] = useState(account?.publicLeaderboard || false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  useEffect(() => { setPublish(account?.publicLeaderboard || false); }, [account?.publicLeaderboard]);

  if (profile?.audience !== 'adult') return <section className="lesson-card"><h3>{tx("Tu identidad, solo en este dispositivo")}</h3><CodenameControl /><p>{tx("Tu progreso, nivel e insignias se guardan aquí. No enviamos tu UUID ni tus entrenamientos al ranking global.")}</p><p className="muted">{tx("Puedes consultar el ranking con nombres seguros. Tu fila personal se destaca solo en tu pantalla, sin publicarse.")}</p></section>;

  if (account) return <section className="lesson-card"><span className="eyebrow">{tx("SESIÓN ACTIVA")}</span><CodenameControl />
    <p>{tx("Expediente sincronizado.")} {publish ? tx("El ranking muestra únicamente tu nombre en clave y logros.") : tx("Tu cuenta no aparece en el ranking público.")}</p>
    <label className="quiz-option"><input type="checkbox" checked={publish} disabled={busy} onChange={async event => {
      const next = event.target.checked; setPublish(next); setBusy(true); setFeedback('');
      try { await setPublicRanking(next); } catch (error) { setPublish(account.publicLeaderboard); setFeedback((error as Error).message); } finally { setBusy(false); }
    }} />{tx("Publicar mi nombre en clave y logros (solo adultos)")}</label>
    <button className="secondary-button" disabled={busy} onClick={async () => {
      setBusy(true); try { await logout(); setFeedback(tx("Sesión cerrada. Tu expediente local se conserva.")); } catch (error) { setFeedback((error as Error).message); } finally { setBusy(false); }
    }}>{tx("Cerrar sesión en este dispositivo")}</button>
    {feedback && <p role="status" className="feedback-box">{tx(feedback)}</p>}
  </section>;

  return <form className="lesson-card" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setFeedback('');
    try { await authenticate(action, password, publish, action === 'login' ? loginCodename : undefined); setPassword(''); setFeedback(tx("Sesión iniciada.")); }
    catch (error) { setFeedback((error as Error).message); } finally { setBusy(false); }
  }}><h3>{tx("Sincronización opcional para adultos")}</h3><p>{tx("Tu identidad local no necesita cuenta. Al conectarte se carga el expediente del servidor; los puntos locales no se importan al ranking.")}</p>
    <div className="panel-tabs"><button type="button" aria-pressed={action === 'register'} onClick={() => { setAction('register'); setPassword(''); }}>{tx("Crear cuenta")}</button><button type="button" aria-pressed={action === 'login'} onClick={() => { setAction('login'); setPassword(''); }}>{tx("Iniciar sesión")}</button></div>
    {action === 'register' ? <CodenameControl /> : <CodenamePicker value={loginCodename} onChange={setLoginCodename} />}
    <label className="field">{tx("Contraseña (mínimo 10 caracteres)")}<input type="password" required minLength={10} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} autoComplete={action === 'login' ? 'current-password' : 'new-password'} /></label>
    {action === 'register' && <label className="quiz-option"><input type="checkbox" checked={publish} onChange={event => setPublish(event.target.checked)} />{tx("Soy mayor de 18 años y acepto publicar mi nombre en clave y logros.")}</label>}
    <p className="muted">{tx("No solicitamos nombre real, correo ni fecha de nacimiento. Guarda tu nombre en clave y contraseña para entrar desde otro dispositivo. El nombre visible nunca sirve como contraseña.")}</p>
    <button className="primary-button" disabled={busy}>{busy ? tx("Conectando…") : action === 'register' ? tx("Crear cuenta y guardar expediente") : tx("Entrar a mi cuenta")}</button>
    {feedback && <p role="status" className="feedback-box">{tx(feedback)}</p>}
  </form>;
}
