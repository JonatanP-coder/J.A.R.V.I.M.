import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { AREAS, GLOSSARY, getGlossary, getTrainingAreas } from './curriculum';
import { AUDIENCES, LEVELS, type LearnerProfile } from './model';
import { getFlightEvent, componentExplanation } from './pedagogy';
import { EN_TRANSLATIONS, translate } from '../i18n/integratedCopy';
import { localizeMissionMessage } from '../i18n/missionMessages';
import { optionCommand } from '../services/accessibility';
import { buildCertificate, localizedRecordExport } from '../services/certificate';
import { createSecureCadetProfile, withCadetProgress } from '../services/cadetProfile';
import { COMPONENTS, MISSIONS, PRESET_CONFIGS } from '../data/components';
import { computeStats, evaluateEngineering, shipReport } from '../utils/engineering';

describe('Complete bilingual educational layer', () => {
  it('translates all lessons, glossary definitions and profile metadata', () => {
    for (const area of AREAS) for (const text of [area.name, area.question, ...area.options, area.simple, area.science, area.technical, area.formula]) {
      if (!/^[-+−]?\d|^TWR =|^t =/.test(text)) assert.ok(EN_TRANSLATIONS[text], text);
    }
    for (const entry of GLOSSARY) assert.ok(EN_TRANSLATIONS[entry.definition], entry.term);
    for (const profile of Object.values(AUDIENCES)) for (const text of Object.values(profile)) assert.notEqual(translate(text, 'en'), text);
    for (const text of [...LEVELS, 'Bronce', 'Plata', 'Oro', 'Platino', 'Diamante', 'Primer paso', 'Formación integral', 'Órbita constante', 'Alas de exploración', 'Especialista de misión']) assert.ok(EN_TRANSLATIONS[text], text);
    assert.equal(getGlossary('en').find(g => g.canonicalTerm === 'Masa')?.term, 'Mass');
    assert.deepEqual(getTrainingAreas('en').map(a => [a.id, a.correct]), AREAS.map(a => [a.id, a.correct]));
  });

  it('preserves every physical event impact for every language and learning profile', () => {
    for (const audience of ['junior', 'teen', 'adult'] as const) for (const knowledge of ['beginner', 'intermediate', 'expert'] as const) {
      const profile: LearnerProfile = { alias: 'EstelarCometa_104', audience, knowledge, mode: 'learn' };
      for (let index = 0; index < 5; index++) {
        const es = getFlightEvent(index, 'es', profile), en = getFlightEvent(index, 'en', profile);
        assert.notEqual(es.titulo_evento, en.titulo_evento);
        const impacts = (event: typeof es) => event.opciones.map(o => [o.impacto_energia, o.impacto_escudo, o.impacto_oxigeno]);
        assert.deepEqual(impacts(es), impacts(en));
        assert.deepEqual(impacts(en), impacts(getFlightEvent(index, 'es')));
      }
      for (const component of COMPONENTS) assert.notEqual(componentExplanation(component, profile, 'es'), componentExplanation(component, profile, 'en'));
    }
  });

  it('keeps FRR scores and numeric ship telemetry identical in both languages', () => {
    const craft = Object.fromEntries(Object.entries(PRESET_CONFIGS[0].components).map(([key, id]) => [key, COMPONENTS.find(c => c.id === id)!]));
    const stats = computeStats(craft);
    const es = evaluateEngineering(craft, MISSIONS[0], 'es'), en = evaluateEngineering(craft, MISSIONS[0], 'en');
    assert.equal(es.aprobado, en.aprobado); assert.equal(es.puntuacion_diseno, en.puntuacion_diseno);
    assert.deepEqual(shipReport(craft, stats, MISSIONS[0], 'es').match(/\d+/g), shipReport(craft, stats, MISSIONS[0], 'en').match(/\d+/g));
  });

  it('understands option one/two and uno/dos and changes existing captions', () => {
    for (const phrase of ['one', 'option one', 'opción uno', '1']) assert.equal(optionCommand(phrase), 0);
    for (const phrase of ['two', 'option two', 'opción dos', '2']) assert.equal(optionCommand(phrase), 1);
    assert.equal(optionCommand('status'), null);
    const message = { text: 'Nombre EstelarCometa_104', translations: { es: 'Hola EstelarCometa_104', en: 'Hello EstelarCometa_104' } };
    assert.equal(localizeMissionMessage(message, 'en'), 'Hello EstelarCometa_104');
    assert.equal(localizeMissionMessage(message, 'es'), 'Hola EstelarCometa_104');
    assert.equal(translate('Approved design · artemis', 'es'), 'Diseño aprobado · artemis');
  });

  it('localizes certificates and private exports without changing identity or progress', () => {
    const cadet = withCadetProgress({ ...createSecureCadetProfile(), learner: { audience: 'adult', knowledge: 'expert', mode: 'learn' } }, {
      entries: AREAS.map(area => ({ key: `lesson:2026-11-15:${area.id}`, date: '2026-11-15', area: area.id, title: area.name, score: 100, xp: 30 })), completedMissions: {},
    });
    const original = JSON.stringify(cadet);
    const html = buildCertificate(cadet, 'en', '2026-11-15');
    assert.match(html, /html lang="en"/); assert.match(html, /Virtual training certificate/); assert.match(html, /Seven training areas completed/); assert.match(html, /Print or save as PDF/);
    assert.doesNotMatch(html, /Constancia|Siete áreas|Imprimir/); assert.ok(html.includes(cadet.codename)); assert.ok(!html.includes(cadet.id));
    const exported = localizedRecordExport(cadet, 'en');
    assert.equal(exported.codename, cadet.codename); assert.equal(exported.id, cadet.id); assert.equal(exported.achievements.xp, 210);
    assert.equal(exported.achievements.rank, 'Silver'); assert.equal(exported.progress.entries[0].title, 'Space science');
    assert.equal(JSON.stringify(cadet), original);
  });

  it('serves the exact original font families locally with their licenses', () => {
    const css = readFileSync('public/fonts/fonts.css', 'utf8');
    for (const family of ['Chakra Petch', 'JetBrains Mono', 'Plus Jakarta Sans']) assert.ok(css.includes(family));
    assert.doesNotMatch(css, /https?:\/\//);
    for (const match of css.matchAll(/url\(([^)]+)\)/g)) assert.ok(existsSync('public' + match[1]));
    for (const name of ['chakrapetch', 'jetbrainsmono', 'plusjakartasans']) assert.ok(existsSync(`public/fonts/${name}-OFL.txt`));
  });
});
