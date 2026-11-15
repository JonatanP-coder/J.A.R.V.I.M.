import { SourceLinks } from './SourceLinks';
import { learningCopy } from '../i18n/learningCopy';
import { ContextualText } from './ContextualText';
import { useIntegratedText } from '../i18n/useIntegratedText';
import React, { useState } from 'react';
import { useAcademy } from '../context/AcademyContext';
import { AREAS, getTrainingAreas, lessonText } from '../academy/curriculum';
import { useI18n } from '../i18n/I18nContext';
import { locale } from '../i18n/integratedCopy';
import { AUDIENCES, badgesFor, levelFor, LEVELS, rankFor, streakFor, totalXP, trainingDate, weekDates } from '../academy/model';
import { downloadJSON } from '../services/storage';
import { buildCertificate, localizedRecordExport } from '../services/certificate';
import { announce } from '../services/accessibility';
import { AccessibleDialog } from './AccessibleDialog';
import { SecureLeaderboard } from './SecureLeaderboard';
import { SecureAccountPanel } from './SecureAccountPanel';
type Tab = 'training' | 'record' | 'leaderboard' | 'rewards' | 'account';
export function AcademyPanel({ onClose }: { onClose: () => void }) {
  const tx = useIntegratedText();
  const { lang } = useI18n();
  const areas = getTrainingAreas(lang);
  const academy = useAcademy(); const { cadet, profile, progress } = academy;
  const [tab, setTab] = useState<Tab>('training'); const [selectedDay, setSelectedDay] = useState(trainingDate());
  const [areaId, setAreaId] = useState<string>(AREAS[new Date(trainingDate() + 'T12:00:00Z').getUTCDay() % 7].id);
  const [answer, setAnswer] = useState<number | null>(null); const [feedback, setFeedback] = useState(''); const [busy, setBusy] = useState(false);
  const xp = totalXP(progress); const level = levelFor(xp); const today = trainingDate();
  const area = areas.find(a => a.id === areaId)!; const dailyEntries = progress.entries.filter(e => e.date === selectedDay);
  const complete = async () => {
    if (answer === null) return; setBusy(true);
    try { const correct = await academy.submitLesson(area.id, answer); const text = correct ? tx("¡Respuesta correcta! Entrenamiento guardado. +30 XP si es tu primera evaluación de esta área hoy.") : tx("Revisa la explicación y prueba otra vez. Equivocarse no resta puntos."); setFeedback(text); announce(text, correct ? 'success' : 'warning'); }
    catch (e) { setFeedback((e as Error).message); } finally { setBusy(false); }
  };
  const certificate = () => {
    const html = buildCertificate(cadet, lang, today);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = `${lang === 'en' ? 'certificate' : 'constancia'}-${today}.html`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const trainedAreas = new Set(progress.entries.map(e => e.area));
  return <AccessibleDialog title={tx("Academia de Astronautas")} onClose={onClose} wide>
    <div className="academy-summary"><div><span className="eyebrow">{tx("EXPEDIENTE DE")} {profile?.alias}</span><h3>{tx("Nivel")} {level} · {tx(LEVELS[level - 1])}</h3><p className="muted">{tx("Una pequeña misión cada día. Puedes descansar sin perder XP.")}</p></div><div className="xp-total"><strong>{xp.toLocaleString(locale(lang))} <small>XP</small></strong><span>{tx(rankFor(xp))} · {streakFor(progress)} {tx("días de racha")}</span></div></div>
    <nav className="panel-tabs" aria-label={tx("Secciones de la academia")}>{([['training', learningCopy[lang].classroom], ['record', tx("Expediente")], ['leaderboard', tx("Clasificación global")], ['rewards', tx("Recompensas")], ['account', tx("Mi cuenta")]] as const).map(([id, label]) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => { setTab(id); setFeedback(''); }}>{label}</button>)}</nav>
    {tab === 'training' && <>
      <div className="section-heading"><h3>{tx("Tu semana en órbita")}</h3><span className="muted">{tx("Hora de entrenamiento: Bogotá")}</span></div>
      <div className="week-calendar">{weekDates().map((day, i) => { const entries = progress.entries.filter(e => e.date === day); return <button key={day} aria-pressed={selectedDay === day} onClick={() => setSelectedDay(day)} className={day === today ? 'today' : ''}><span>{[tx("LUN"), tx("MAR"), tx("MIÉ"), tx("JUE"), tx("VIE"), tx("SÁB"), tx("DOM")][i]}</span><strong>{Number(day.slice(-2))}</strong><span>{entries.length ? `✓ ${entries.length}` : day === today ? tx("HOY") : '—'}</span></button>; })}</div>
      {selectedDay !== today ? <div className="lesson-card"><h3>{tx("Bitácora del")} {selectedDay}</h3>{dailyEntries.length ? dailyEntries.map(e => <p key={e.key}>✓ {tx(e.title)} · {e.score}/100 · {e.xp} XP</p>) : <p>{tx("No hay actividades registradas para este día. Los entrenamientos se validan el día en que los completas.")}</p>}<button className="secondary-button" onClick={() => setSelectedDay(today)}>{tx("Volver al entrenamiento de hoy")}</button></div> : <>
        <div className="area-grid">{areas.map(a => { const done = progress.entries.some(e => e.key === `lesson:${today}:${a.id}`); return <button key={a.id} className={areaId === a.id ? 'active' : ''} aria-pressed={areaId === a.id} onClick={() => { setAreaId(a.id); setAnswer(null); setFeedback(''); }}><span aria-hidden="true">{a.icon}</span><strong>{a.name}</strong><small>{done ? tx("✓ Completado hoy") : tx("3 min · +30 XP")}</small></button>; })}</div>
        <article className="lesson-card"><span className="eyebrow">{tx("BRIEFING ·")} {profile?.mode === 'challenge' ? tx("DESAFÍO") : tx("APRENDER")}</span><h3>{area.name}</h3>{profile?.mode === 'learn' ? <p><ContextualText text={lessonText(area, profile, lang)} /></p> : <details><summary>{tx("Consultar una pista")}</summary><p><ContextualText text={lessonText(area, profile!, lang)} /></p></details>}{profile && profile.knowledge !== 'beginner' && <code className="formula">{area.formula}</code>}<SourceLinks sources={area.sources} model /><fieldset><legend>{area.question}</legend>{area.options.map((option, i) => <label className="quiz-option" key={i}><input type="radio" name="quiz-answer" checked={answer === i} onChange={() => setAnswer(i)} />{option}</label>)}</fieldset><button className="primary-button" disabled={answer === null || busy} onClick={complete}>{busy ? tx("Guardando…") : tx("Comprobar y guardar entrenamiento")}</button></article>
      </>}
    </>}
    {tab === 'record' && <>
      <div className="two-columns"><section className="lesson-card"><h3>{tx("Habilidades")}</h3>{areas.map(a => { const count = progress.entries.filter(e => e.area === a.id).length; return <div className="skill-row" key={a.id}><label htmlFor={'skill-' + a.id}>{a.name} <span>{count} {tx("prácticas")}</span></label><progress id={'skill-' + a.id} max={10} value={Math.min(10, count)} /></div>; })}</section><section className="lesson-card"><h3>{tx("Tus insignias")}</h3><div className="badge-list">{badgesFor(progress).map(b => <span className="earned-badge" key={b}>✧ {tx(b)}</span>)}</div>{!xp && <p>{tx("Completa tu primer entrenamiento para conseguir una insignia.")}</p>}<h3>{tx("Próximo ascenso")}</h3><p>{level === 4 ? tx("Has llegado a Misión profesional.") : `${[200, 600, 1500][level - 1] - xp} ${tx("XP para")} ${tx(LEVELS[level])}.`}</p><button className="secondary-button" disabled={trainedAreas.size < 7 || xp < 200} onClick={certificate}>{tx("Descargar constancia virtual")}</button><p className="muted">{tx("Requiere las 7 áreas y 200 XP. Constancia del proyecto, sin acreditación oficial de NASA.")}</p></section></div>
      <div className="section-heading"><h3>{tx("Historial de evaluaciones")}</h3><button className="secondary-button" onClick={() => downloadJSON(lang === 'en' ? 'astronaut-record.json' : 'expediente-astronauta.json', localizedRecordExport(cadet, lang))}>{tx("Exportar expediente")}</button></div><div className="table-scroll"><table><thead><tr><th>{tx("Fecha")}</th><th>{tx("Actividad")}</th><th>{tx("Puntuación")}</th><th>XP</th></tr></thead><tbody>{[...progress.entries].reverse().slice(0, 50).map(e => <tr key={e.key}><td>{e.date}</td><td>{tx(e.title)}</td><td>{e.score}/100</td><td>+{e.xp}</td></tr>)}</tbody></table>{!progress.entries.length && <p className="muted">{tx("Tu historial comenzará con el primer entrenamiento.")}</p>}</div>
    </>}
    {tab === 'leaderboard' && <SecureLeaderboard onManageAccount={() => setTab('account')} />}
    {tab === 'rewards' && <><h3>{tx("El conocimiento abre la siguiente misión")}</h3><p className="panel-intro">{tx("Las insignias y ascensos se ganan aprendiendo. Nadie paga para mejorar su puntuación.")}</p><div className="reward-grid"><article className="lesson-card"><span className="age-pill">{tx("DISPONIBLE")}</span><h3>{tx("Insignias de tu tripulación")}</h3><p>{tx("Primer paso, Formación integral y Alas de exploración. Se desbloquean automáticamente en tu expediente.")}</p><button className="secondary-button" onClick={() => setTab('record')}>{tx("Ver mis insignias")}</button></article><article className="lesson-card"><span className="age-pill">{tx("PROPUESTA · SIN PATROCINADOR")}</span><h3>{tx("Premios físicos")}</h3><p>{tx("Peluches espaciales, kits educativos o visitas a centros de ciencia podrían formar parte de futuras convocatorias con reglas y patrocinadores confirmados.")}</p><p className="muted">{tx("No hay premios físicos disponibles ni visitas, empleos o acuerdos con NASA confirmados.")}</p></article><article className="lesson-card"><span className="age-pill">{tx("MODELO PROPUESTO")}</span><h3>{tx("Apoya la próxima generación")}</h3><p>{tx("Licencias para aulas, donaciones institucionales y artículos opcionales pueden financiar becas de acceso. El entrenamiento básico y la accesibilidad seguirían siendo gratuitos.")}</p><p className="muted">{tx("Pagos y suscripciones aún no habilitados. Sin compras para obtener ventaja ni sorteos de pago.")}</p></article></div></>}
    {tab === 'account' && <SecureAccountPanel />}
    {feedback && <p role="status" className="feedback-box">{tx(feedback)}</p>}
  </AccessibleDialog>;
}
