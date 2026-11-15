import { useIntegratedText } from '../i18n/useIntegratedText';
import React, { useEffect, useState } from 'react';
import { useAcademy } from '../context/AcademyContext';
import { badgesFor, levelFor, rankFor, totalXP } from '../academy/model';
import { isCodename } from '../academy/codenames';
import type { LeaderboardResponse, PublicLeaderboardEntry } from '../types/leaderboard';
import { academyRequest } from '../services/storage';

function isEntry(value: PublicLeaderboardEntry) {
  return !!value && isCodename(value.codename) && Number.isInteger(value.position) && value.position > 0 && Number.isInteger(value.level) && value.level >= 1 && value.level <= 4 && ['Bronce', 'Plata', 'Oro', 'Platino', 'Diamante'].includes(value.rank) && (value.badge === null || typeof value.badge === 'string');
}
export function SecureLeaderboard({ onManageAccount }: { onManageAccount: () => void }) {
  const tx = useIntegratedText();
  const { cadet, progress, account } = useAcademy();
  const [board, setBoard] = useState<LeaderboardResponse>({ entries: [], self: null });
  const [message, setMessage] = useState(tx("Conectando con la clasificación global…"));
  useEffect(() => {
    let active = true;
    academyRequest('leaderboard', undefined, account ? 'same-origin' : 'omit').then((data: LeaderboardResponse) => {
      if (!Array.isArray(data.entries) || !data.entries.every(isEntry) || (data.self && !isEntry(data.self))) throw new Error(tx("Clasificación no válida."));
      if (!active) return; setBoard(data);
      setMessage(data.entries.length ? tx("Clasificación de participantes reales con publicación voluntaria.") : tx("Todavía no hay participantes públicos. Tu progreso local continúa disponible."));
    }).catch(() => { if (active) { setBoard({ entries: [], self: null }); setMessage(tx("Clasificación global sin conexión. Puedes consultar tus logros locales.")); } });
    return () => { active = false; };
  }, [account?.id, account?.alias, account?.publicLeaderboard]);
  const xp = totalXP(progress);
  const ownPublic = account && board.self?.codename === account.alias ? board.self : null;
  const ownInTable = !!ownPublic && board.entries.some(entry => entry.codename === ownPublic.codename);
  const own = ownPublic || { position: null, codename: cadet.codename, level: levelFor(xp), rank: rankFor(xp), badge: badgesFor(progress).at(-1) || null };
  const renderRow = (entry: Omit<PublicLeaderboardEntry, 'position'> & { position: number | null }, isOwn: boolean) => <tr key={(isOwn ? 'own:' : 'public:') + entry.codename} className={isOwn ? 'leaderboard-own-row' : undefined} aria-current={isOwn ? 'true' : undefined}>
    <td>{entry.position ?? '—'}</td><td><strong>{entry.codename}</strong>{isOwn && <span className="own-position-label">{tx("Tu posición")}</span>}{isOwn && entry.position === null && <small className="private-position">{tx("Solo en este dispositivo · sin posición global")}</small>}</td>
    <td>{tx("Nivel")} {entry.level} · {tx(entry.rank)}{entry.badge && <small className="private-position">✧ {tx(entry.badge)}</small>}</td>
  </tr>;
  return <><h3>{tx("Una comunidad, cinco ligas")}</h3><div className="league-row">{['Bronce', 'Plata', 'Oro', 'Platino', 'Diamante'].map(rank => <span key={rank} className={rankFor(xp) === rank ? 'current' : ''}>{tx(rank)}</span>)}</div>
    <p className="muted" role="status">{tx(message)}</p>
    <div className="table-scroll"><table aria-label={tx("Clasificación con nombres en clave")}><thead><tr><th>{tx("Posición")}</th><th>{tx("Nombre en clave")}</th><th>{tx("Nivel y rango")}</th></tr></thead><tbody>{board.entries.map(entry => renderRow(entry, !!ownPublic && entry.codename === ownPublic.codename))}{!ownInTable && renderRow(own, true)}</tbody></table></div>
    <p className="muted">{tx("El identificador privado, la edad y los datos de acceso nunca aparecen en el ranking. Las filas locales solo se muestran en tu dispositivo.")}</p>
    <button className="secondary-button" onClick={onManageAccount}>{tx("Gestionar cuenta y privacidad")}</button>
  </>;
}
