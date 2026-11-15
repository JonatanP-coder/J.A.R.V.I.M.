import { useIntegratedText } from '../i18n/useIntegratedText';
import React, { useState } from 'react';
import { SPACE_ADJECTIVES, ASTRONOMICAL_NOUNS, isCodename } from '../academy/codenames';
import { useAcademy } from '../context/AcademyContext';
import { announce } from '../services/accessibility';

export function CodenameControl() {
  const tx = useIntegratedText();
  const { cadet, randomizeCodename } = useAcademy();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <div className="codename-control">
    <span className="eyebrow">{tx("TU NOMBRE EN CLAVE")}</span>
    <output aria-label={tx("Nombre en clave")} data-codename className="codename-output">{cadet.codename}</output>
    <button type="button" className="secondary-button" disabled={busy} onClick={async () => {
      setBusy(true); setError('');
      try { const next = await randomizeCodename(); announce({ es: 'Tu nuevo nombre en clave es ' + next + '. Tu progreso se conserva.', en: 'Your new codename is ' + next + '. Your progress is preserved.' }, 'success'); }
      catch (error) { setError((error as Error).message); }
      finally { setBusy(false); }
    }}>{busy ? tx("Sorteando…") : tx("🎲 Sortear nuevo nombre en clave")}</button>
    <p className="muted">{tx("Tu identidad espacial se genera automáticamente. No escribas ni compartas datos personales. Cambiar el nombre conserva tus logros.")}</p>
    {error && <p role="alert">{tx(error)}</p>}
  </div>;
}

/** Account sign-in also uses only allowlisted controls, never a free-text name. */
export function CodenamePicker({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const tx = useIntegratedText();
  const prefix = isCodename(value) ? value.slice(0, value.lastIndexOf('_')) : '';
  const adjective = SPACE_ADJECTIVES.find(word => prefix.startsWith(word)) || SPACE_ADJECTIVES[0];
  const noun = ASTRONOMICAL_NOUNS.find(word => adjective + word === prefix) || ASTRONOMICAL_NOUNS[0];
  const number = isCodename(value) ? value.slice(-3) : '100';
  return <fieldset className="codename-picker"><legend>{tx("Selecciona el nombre en clave de tu cuenta")}</legend>
    <div className="two-columns">
      <label className="field">{tx("Adjetivo")}<select value={adjective} onChange={event => onChange(`${event.target.value}${noun}_${number}`)}>{SPACE_ADJECTIVES.map(word => <option key={word} value={word}>{tx(word)}</option>)}</select></label>
      <label className="field">{tx("Objeto espacial")}<select value={noun} onChange={event => onChange(`${adjective}${event.target.value}_${number}`)}>{ASTRONOMICAL_NOUNS.map(word => <option key={word} value={word}>{tx(word)}</option>)}</select></label>
    </div>
    <div className="codename-digits">{[0, 1, 2].map(index => <label className="field" key={index}>{tx("Dígito")} {index + 1}<select value={number[index]} onChange={event => { const digits = number.split(''); digits[index] = event.target.value; onChange(`${adjective}${noun}_${digits.join('')}`); }}>{Array.from({ length: index === 0 ? 9 : 10 }, (_, digit) => String(digit + (index === 0 ? 1 : 0))).map(digit => <option key={digit}>{digit}</option>)}</select></label>)}</div>
    <output aria-label={tx("Nombre en clave seleccionado")} className="codename-output small">{adjective}{noun}_{number}</output>
  </fieldset>;
}
