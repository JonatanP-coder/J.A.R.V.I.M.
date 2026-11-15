import type { AccessPreferences } from '../academy/model';
import { activeLanguage, bilingual, locale, type BilingualText } from '../i18n/integratedCopy';
let preferences: AccessPreferences;
let muted = false;
let allowRemoteVoice = false;
let audio: AudioContext | undefined;
export function configureAccessibility(next: AccessPreferences, isMuted = false, remoteVoiceAllowed = false) { preferences = next; muted = isMuted; allowRemoteVoice = remoteVoiceAllowed; if ((!next.narration || muted) && 'speechSynthesis' in window) window.speechSynthesis.cancel(); }
export function announce(message: string | BilingualText, severity: 'info' | 'warning' | 'success' = 'info', force = false) {
  const translations = bilingual(message);
  const text = translations[activeLanguage()];
  window.dispatchEvent(new CustomEvent('jamt:message', { detail: { text, translations, severity, time: new Date().toISOString() } }));
  if ((preferences?.narration || force) && !muted && 'speechSynthesis' in window) {
    const localVoices = window.speechSynthesis.getVoices().filter(voice => voice.localService);
    if (!allowRemoteVoice && !localVoices.length) return; // Native screen-reader live regions still receive the text.
    window.speechSynthesis.cancel(); const speech = new SpeechSynthesisUtterance(text); speech.lang = locale(activeLanguage()); speech.rate = 1;
    if (!allowRemoteVoice) speech.voice = localVoices.find(voice => voice.lang.startsWith(speech.lang.slice(0, 2))) || localVoices[0];
    window.speechSynthesis.speak(speech);
  }
}
export function spatialTone(category = 'capsule', proximity?: number) {
  if (muted) return;
  try {
    audio ||= new AudioContext(); if (audio.state === 'suspended') void audio.resume();
    const oscillator = audio.createOscillator(), gain = audio.createGain(), panner = audio.createPanner();
    panner.panningModel = 'HRTF';
    const positions: Record<string, [number, number, number]> = { capsule: [0, 1, -1], solar: [-1, 0, -1], oxygen: [1, 0, -1], engine: [0, -1, -1], shield: [0, 0, -1] };
    const [x, y, z] = positions[category] || [0, 0, -1]; panner.positionX.value = x; panner.positionY.value = y; panner.positionZ.value = z;
    oscillator.frequency.value = proximity === undefined ? 640 : 400 + (1 - proximity) * 1100;
    gain.gain.setValueAtTime(0.08, audio.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.17);
    oscillator.connect(gain).connect(panner).connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + 0.18);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); panner.disconnect(); };
  } catch { /* Text and native keyboard controls remain available. */ }
}
export function startVoiceCommand(onCommand: (text: string) => void, onStop: () => void): (() => void) | null {
  if (!allowRemoteVoice) { announce('Para proteger los perfiles menores, los comandos de micrófono remotos están desactivados. Usa el teclado o los botones.', 'warning'); onStop(); return null; }
  const Constructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Constructor) { announce('Este navegador no admite comandos de voz. Usa los botones o el teclado.', 'warning'); return null; }
  const recognition = new Constructor(); recognition.lang = locale(activeLanguage()); recognition.continuous = false; recognition.interimResults = false;
  recognition.onresult = (event: any) => onCommand(event.results[0][0].transcript.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  recognition.onerror = () => { announce('No se pudo escuchar el comando. Revisa el permiso del micrófono o usa el teclado.', 'warning'); onStop(); };
  recognition.onend = onStop;
  try { recognition.start(); return () => recognition.abort(); } catch { announce('El micrófono no está disponible.', 'warning'); onStop(); return null; }
}
export function optionCommand(text: string): 0 | 1 | null {
  if (/\b(two|dos|2)\b/i.test(text)) return 1;
  if (/\b(one|uno|1)\b/i.test(text)) return 0;
  return null;
}
