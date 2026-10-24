import { describe, it, expect } from 'vitest';
import { normalizeBreed, rangeLabel, filterBreeds, matchBreed, rankMatches, toggleId, readSavedIds } from './discovery.js';

const groupLookup = { g1: 'Herding' };
const raw = { id: 'abc', attributes: { name: 'Border Collie', description: 'Smart dog', life: { min: 12, max: 15 }, male_weight: { min: 14, max: 20 }, origin: { country: 'Scotland' }, hypoallergenic: false, traits: { energy: 5, trainability: 5, apartment_friendly: 2, good_with_children: 5 }, images: [{ medium: 'https://images.dogapi.dog/a.webp', attribution: { author: 'Photographer', license: 'CC BY' } }] }, relationships: { group: { data: { id: 'g1' } } } };
const dogs = [normalizeBreed(raw, groupLookup), { ...normalizeBreed(raw, groupLookup), id: 'def', name: 'Poodle', group: 'Non-Sporting', hypoallergenic: true, life: { min: 12, max: 18 }, traits: { energy: 2, trainability: 5, apartment_friendly: 5, good_with_children: 5 } }];

describe('Dog API data normalisation', () => {
  it('converts JSON:API breed records to app model', () => {
    expect(dogs[0].group).toBe('Herding');
    expect(dogs[0].imageCredit.author).toBe('Photographer');
    expect(dogs[0].origin).toBe('Scotland');
  });
  it('handles missing attributes gracefully', () => {
    expect(normalizeBreed({ id: 'empty' }).description).toBeTruthy();
    expect(normalizeBreed({ id: 'empty' }).image).toBe('');
  });
  it('formats attribute ranges', () => {
    expect(rangeLabel({ min: 12, max: 15 }, ' years')).toBe('12–15 years');
    expect(rangeLabel(null)).toBe('Not listed');
  });
});
describe('Breed explorer filters', () => {
  it('filters by name', () => expect(filterBreeds(dogs, { query: 'collie' })).toHaveLength(1));
  it('filters by group', () => expect(filterBreeds(dogs, { group: 'Herding' })[0].name).toBe('Border Collie'));
  it('filters hypoallergenic breeds', () => expect(filterBreeds(dogs, { onlyHypo: true })[0].name).toBe('Poodle'));
  it('sorts by life expectancy', () => expect(filterBreeds(dogs, { sort: 'life' })[0].name).toBe('Poodle'));
  it('does not mutate source data', () => { const input = [...dogs].reverse(); filterBreeds(input, {}); expect(input[0].name).toBe('Poodle'); });
});
describe('Companion matching', () => {
  it('uses available traits rather than inventing missing values', () => {
    expect(matchBreed({ traits: {} }, {}).matchScore).toBe(null);
  });
  it('prioritises energy alignment', () => {
    expect(rankMatches(dogs, { activity: 'high', space: 'house', family: 'yes', experience: 'first' })[0].name).toBe('Border Collie');
  });
  it('keeps match scores in range', () => expect(matchBreed(dogs[0], { activity: 'low', space: 'apartment' }).matchScore).toBeGreaterThanOrEqual(0));
});
describe('Saved breed state', () => {
  it('adds and removes favourites', () => {
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b']);
  });
  it('caps comparison selection', () => expect(toggleId(['a', 'b'], 'c', 2)).toEqual(['b', 'c']));
  it('handles corrupt local storage', () => expect(readSavedIds({ getItem: () => '{bad' })).toEqual([]));
});
