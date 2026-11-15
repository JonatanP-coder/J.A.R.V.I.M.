import assert from 'node:assert/strict';
import { it } from 'node:test';
import { dictionaries } from './adaptive';
import { getGlossary, getTrainingAreas } from './curriculum';
import { getFlightEvent } from './pedagogy';
import { getLocalizedComponents } from '../data/components';
import { NASA_FLIGHT_EVENTS_ES } from '../data/flightEvents';
import { nasa } from '../data/nasaSources';

it('provides nine distinct explanations per key in both languages', () => {
  assert.deepEqual(Object.keys(dictionaries.es).sort(), Object.keys(dictionaries.en).sort());
  for (const dictionary of Object.values(dictionaries)) {
    for (const [key, matrix] of Object.entries(dictionary)) {
      const variants = Object.values(matrix).flatMap(levels => Object.values(levels));
      assert.ok(variants.every(text => text.trim()), key);
      assert.equal(new Set(variants).size, 9, key);
    }
  }
});

it('retains official references when localizing content or adapting an event', () => {
  const catalog = Object.values(nasa);
  assert.equal(new Set(catalog.map(s => s.id)).size, catalog.length);
  for (const source of catalog) {
    const url = new URL(source.url);
    assert.equal(url.protocol, 'https:');
    assert.match(url.hostname, /(^|\.)nasa\.gov$/);
    assert.notEqual(url.pathname, '/');
    assert.ok(source.title && source.organization && source.verifiedYear >= 2026);
  }
  for (const lang of ['es', 'en'] as const) {
    for (const getContent of [getTrainingAreas, getGlossary, getLocalizedComponents]) {
      assert.deepEqual(getContent(lang).map(({id, sources}) => [id, sources]), getContent('es').map(({id, sources}) => [id, sources]));
      for (const { sources } of getContent(lang)) {
        assert.ok(sources.length > 0 && sources.every(source => catalog.includes(source)));
      }
    }
    for (const [i, base] of NASA_FLIGHT_EVENTS_ES.entries()) {
      const explanations = new Set<string>();
      for (const audience of ['junior', 'teen', 'adult'] as const) {
        for (const knowledge of ['beginner', 'intermediate', 'expert'] as const) {
          const event = getFlightEvent(i, lang, { audience, knowledge, alias: 'Test', mode: 'learn' });
          assert.deepEqual(event.sources, base.sources);
          explanations.add(event.descripcion);
        }
      }
      assert.equal(explanations.size, 9, base.id);
    }
  }
});
