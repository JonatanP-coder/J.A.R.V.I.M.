import { useIntegratedText } from '../i18n/useIntegratedText';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_ACCESS, EMPTY_PROGRESS, award, trainingDate, validProfile, type AccessPreferences, type LearnerProfile, type Progress } from '../academy/model';
import { generateCodename, isAnonymousId, isCodename, type Codename } from '../academy/codenames';
import { AREAS } from '../academy/curriculum';
import { academyRequest, readStored, STORAGE_KEY, writeStored } from '../services/storage';
import { loadSecureCadetProfile, saveSecureCadetProfile, validProgress, withCadetProgress, type SecureCadetProfile } from '../services/cadetProfile';

interface Account { alias: string; id: string; publicLeaderboard: boolean }
interface AcademyValue {
  cadet: SecureCadetProfile;
  profile: LearnerProfile | null;
  setProfile: (profile: LearnerProfile) => Promise<void>;
  randomizeCodename: () => Promise<Codename>;
  access: AccessPreferences;
  setAccess: (access: AccessPreferences) => void;
  progress: Progress;
  account: Account | null;
  storageOK: boolean;
  authenticate: (action: 'register' | 'login', password: string, publish: boolean, codename?: string) => Promise<void>;
  logout: () => Promise<void>;
  setPublicRanking: (publish: boolean) => Promise<void>;
  submitLesson: (area: string, answer: number) => Promise<boolean>;
  recordReview: (mission: string, components: Record<string, { id: string }>, score: number, approved: boolean) => Promise<void>;
  recordMission: (mission: string, score: number) => void;
}
const Context = createContext<AcademyValue | null>(null);
const SYNC_KEY = 'jamt:cadet:sync-enabled';
function keepLocalFlights(remote: Progress, local: Progress): Progress {
  const keys = new Set(remote.entries.map(entry => entry.key));
  return { entries: [...remote.entries, ...local.entries.filter(entry => entry.key.startsWith('mission:') && !keys.has(entry.key)).map(entry => ({ ...entry, xp: 0 }))], completedMissions: { ...local.completedMissions, ...remote.completedMissions } };
}

export function AcademyProvider({ children }: { children: React.ReactNode }) {
  const tx = useIntegratedText();
  const [cadet, setCadet] = useState(loadSecureCadetProfile);
  const profile: LearnerProfile | null = cadet.learner ? { alias: cadet.codename, ...cadet.learner } : null;
  const progress = cadet.progress;
  const [access, setAccess] = useState<AccessPreferences>(() => ({ ...DEFAULT_ACCESS, ...readStored(STORAGE_KEY + ':access', {}, value => !!value && Object.values(value).every(v => typeof v === 'boolean')) }));
  const [account, setAccount] = useState<Account | null>(null);
  const [storageOK, setStorageOK] = useState(true);

  useEffect(() => {
    setStorageOK(saveSecureCadetProfile(cadet) && writeStored(STORAGE_KEY + ':access', access));
  }, [cadet, access]);

  const acceptSession = (data: any) => {
    if (!validProfile(data.profile) || !validProgress(data.progress) || !data.account || !isCodename(data.account.alias)) throw new Error(tx("Expediente del servidor no válido."));
    const keepFlights = readStored(STORAGE_KEY + ':owner', '') === data.account.id;
    setAccount(data.account);
    setCadet(previous => withCadetProgress({ ...previous, codename: data.account.alias,
      learner: { audience: data.profile.audience, knowledge: data.profile.knowledge, mode: data.profile.mode } },
      keepFlights ? keepLocalFlights(data.progress, previous.progress) : data.progress));
    writeStored(STORAGE_KEY + ':owner', data.account.id);
    writeStored(SYNC_KEY, true);
  };

  useEffect(() => {
    // No startup account request, cookie, local UUID or learning profile is sent for minors.
    const previouslyConnected = readStored(SYNC_KEY, false) || isAnonymousId(readStored(STORAGE_KEY + ':owner', ''));
    if (cadet.learner?.audience !== 'adult' || !previouslyConnected) return;
    let active = true;
    academyRequest('me').then(data => { if (active) acceptSession(data); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const setProfile = async (next: LearnerProfile) => {
    if (!validProfile(next) || next.alias !== cadet.codename) throw new Error(tx("El nombre en clave debe proceder del generador."));
    if (account && next.audience !== 'adult') {
      // Disconnect the existing adult session before any minor activity can sync.
      await academyRequest('suspend', {});
      setAccount(null); writeStored(SYNC_KEY, false); writeStored(STORAGE_KEY + ':owner', '');
    } else if (account) {
      const data = await academyRequest('profile', { profile: next }); setAccount(data.account);
    }
    setCadet(previous => ({ ...previous, learner: { audience: next.audience, knowledge: next.knowledge, mode: next.mode } }));
  };

  const randomizeCodename = async () => {
    const next: Codename = account ? (await academyRequest('codename', {})).account.alias : generateCodename([cadet.codename]);
    if (!isCodename(next)) throw new Error(tx("El generador devolvió un nombre no válido."));
    setCadet(previous => ({ ...previous, codename: next }));
    if (account) setAccount(previous => previous ? { ...previous, alias: next } : null);
    return next;
  };

  const authenticate = async (action: 'register' | 'login', password: string, publish: boolean, codename?: string) => {
    if (!profile || profile.audience !== 'adult') throw new Error(tx("Los perfiles menores guardan su progreso solo en este dispositivo."));
    const name = codename || profile.alias;
    if (!isCodename(name)) throw new Error(tx("Selecciona un nombre en clave del catálogo."));
    acceptSession(await academyRequest(action, { profile: { ...profile, alias: name }, password, publicLeaderboard: publish }));
  };

  const logout = async () => {
    if (account) await academyRequest('logout', {});
    setAccount(null); writeStored(SYNC_KEY, false); writeStored(STORAGE_KEY + ':owner', '');
    // A private local copy stays linked to the same UUID; signing out never erases progress.
  };
  const setPublicRanking = async (publish: boolean) => { acceptSession(await academyRequest('privacy', { publicLeaderboard: publish })); };
  const submitLesson = async (areaId: string, answer: number) => {
    const area = AREAS.find(candidate => candidate.id === areaId); if (!area) return false;
    if (account && profile?.audience === 'adult') {
      const data = await academyRequest('lesson', { areaId, answer });
      setCadet(previous => withCadetProgress(previous, keepLocalFlights(data.progress, previous.progress))); return data.correct;
    }
    const correct = answer === area.correct;
    if (correct) setCadet(previous => withCadetProgress(previous, award(previous.progress, {
      key: `lesson:${trainingDate()}:${areaId}`, date: trainingDate(), area: areaId, title: area.name, score: 100, xp: 30,
    })));
    return correct;
  };
  const recordReview = async (mission: string, components: Record<string, { id: string }>, score: number, approved: boolean) => {
    if (!approved) return;
    if (account && profile?.audience === 'adult') {
      const data = await academyRequest('review', { missionId: mission, components: Object.fromEntries(Object.entries(components).map(([key, value]) => [key, value.id])) });
      setCadet(previous => withCadetProgress(previous, keepLocalFlights(data.progress, previous.progress))); return;
    }
    setCadet(previous => withCadetProgress(previous, award(previous.progress, { key: `review:${trainingDate()}:${mission}`, date: trainingDate(), area: 'engineering', title: tx("Diseño aprobado · ") + mission, score, xp: 50 })));
  };
  const recordMission = (mission: string, score: number) => {
    setCadet(previous => withCadetProgress(previous, { ...award(previous.progress, {
      key: `mission:${trainingDate()}:${mission}`, date: trainingDate(), area: 'operations', title: tx("Tránsito completado · ") + mission, score, xp: account ? 0 : 80,
    }), completedMissions: { ...previous.progress.completedMissions, [mission]: true } }));
  };
  return <Context.Provider value={{ cadet, profile, setProfile, randomizeCodename, access, setAccess, progress, account, storageOK, authenticate, logout, setPublicRanking, submitLesson, recordReview, recordMission }}>{children}</Context.Provider>;
}
export function useAcademy() { const context = useContext(Context); if (!context) throw new Error('AcademyProvider required'); return context; }
