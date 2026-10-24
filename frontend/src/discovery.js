export function normalizeBreed(item, groupLookup = {}) {
  const a = item?.attributes || {};
  const groupId = item?.relationships?.group?.data?.id;
  return {
    id: String(item?.id || ''),
    name: a.name || 'Unnamed breed',
    description: a.description || 'Every dog has a unique story.',
    group: groupLookup[groupId] || 'Other breeds',
    life: a.life || null,
    weight: a.male_weight || a.female_weight || null,
    origin: a.origin?.country || a.origin?.region || 'Unknown',
    hypoallergenic: a.hypoallergenic === true,
    traits: a.traits || {},
    image: a.images?.[0]?.large || a.images?.[0]?.medium || a.images?.[0]?.url || '',
    imageThumb: a.images?.[0]?.medium || a.images?.[0]?.thumb || a.images?.[0]?.url || '',
    imageCredit: a.images?.[0]?.attribution || null,
    sources: a.sources || []
  };
}

export function rangeLabel(range, suffix = '') {
  if (!range || !Number.isFinite(range.min)) return 'Not listed';
  if (!Number.isFinite(range.max) || range.max === range.min) return String(range.min) + suffix;
  return range.min + '–' + range.max + suffix;
}

export function filterBreeds(breeds, { query = '', group = 'All breeds', onlyHypo = false, sort = 'name' } = {}) {
  const q = query.trim().toLocaleLowerCase();
  const result = breeds.filter((b) => {
    const matchesQuery = !q || [b.name, b.group, b.origin, b.description].some((v) => String(v || '').toLocaleLowerCase().includes(q));
    return matchesQuery && (group === 'All breeds' || b.group === group) && (!onlyHypo || b.hypoallergenic);
  });
  return result.sort((a, b) => {
    if (sort === 'life') return (b.life?.max || 0) - (a.life?.max || 0) || a.name.localeCompare(b.name);
    if (sort === 'weight') return (a.weight?.min || 9999) - (b.weight?.min || 9999) || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });
}

const scoreTrait = (value, target) => Number.isFinite(value) ? Math.max(0, 1 - Math.abs(value - target) / 5) : null;

export function matchBreed(breed, preferences = {}) {
  const traits = breed.traits || {};
  const targets = [
    [traits.energy, preferences.activity === 'high' ? 5 : preferences.activity === 'medium' ? 3 : 1],
    [traits.apartment_friendly, preferences.space === 'apartment' ? 5 : 3],
    [traits.trainability, preferences.experience === 'first' ? 5 : 3],
    [traits.good_with_children, preferences.family === 'yes' ? 5 : 3]
  ];
  const values = targets.map(([value, target]) => scoreTrait(value, target)).filter((x) => x !== null);
  return { ...breed, matchScore: values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) : null, traitsAvailable: values.length };
}

export function rankMatches(breeds, preferences) {
  return breeds.map((b) => matchBreed(b, preferences))
    .filter((b) => b.traitsAvailable > 0)
    .sort((a, b) => (b.matchScore - a.matchScore) || (b.traitsAvailable - a.traitsAvailable) || a.name.localeCompare(b.name));
}

export function toggleId(ids, id, limit = Infinity) {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(-limit);
}

export function readSavedIds(storage) {
  try {
    const value = JSON.parse(storage.getItem('pawly-favourites') || '[]');
    return Array.isArray(value) ? value.filter((x) => typeof x === 'string') : [];
  } catch { return []; }
}
