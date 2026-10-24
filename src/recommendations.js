const INTEREST_KEYWORDS = {
  'Live music': ['music', 'live', 'concert', 'indie', 'gig'],
  'Art & making': ['art', 'sketch', 'craft', 'creative', 'workshop'],
  Comedy: ['comedy', 'laugh', 'stand-up'],
  'Food & coffee': ['food', 'coffee', 'chai', 'cafe', 'café'],
  'Board games': ['game', 'board'],
  'Films & culture': ['film', 'culture', 'movie', 'museum', 'screening'],
  'Walking & outdoors': ['outdoor', 'park', 'walk', 'hike', 'nature'],
  'Fitness & sports': ['run', 'fitness', 'sport', 'yoga'],
  Technology: ['tech', 'technology', 'coding', 'developer'],
  'Books & learning': ['book', 'learn', 'lecture', 'talk'],
  Photography: ['photo', 'camera', 'photography'],
  Volunteering: ['volunteer', 'community', 'service']
};

/**
 * Explainable event-interest score, not a prediction about a person's personality.
 * Returns a score from 0 to 1 based on keyword overlap.
 */
export function scoreEventForInterests(event, interests = []) {
  if (!event || !Array.isArray(interests) || interests.length === 0) return 0;
  const text = [event.title, event.category, event.description]
    .filter(Boolean).join(' ').toLowerCase();
  const matched = new Set();
  for (const interest of interests) {
    const keywords = INTEREST_KEYWORDS[interest] || [String(interest).toLowerCase()];
    if (keywords.some(keyword => text.includes(keyword))) matched.add(interest);
  }
  return matched.size / interests.length;
}

export function recommendEvents(events = [], interests = [], limit = 3) {
  if (!Array.isArray(events) || !Array.isArray(interests) || interests.length === 0) return [];
  return events
    .map((event, index) => ({ event, index, score: scoreEventForInterests(event, interests) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(0, limit))
    .map(item => item.event);
}
