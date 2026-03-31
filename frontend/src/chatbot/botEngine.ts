// Joe Bot Engine — matches user input against the knowledge base.

import knowledge from './knowledgeBase';
import type { KnowledgeEntry } from './knowledgeBase';

/**
 * Normalise a string for matching: lowercase, strip punctuation, collapse spaces.
 */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Score an entry against a user query.
 * Returns a number ≥ 0. Higher = better match.
 */
function scoreEntry(query: string, entry: KnowledgeEntry): number {
  const q = normalise(query);
  const words = q.split(' ');
  let score = 0;

  for (const kw of entry.keywords) {
    const nkw = normalise(kw);

    // Exact phrase match → high score
    if (q.includes(nkw)) {
      score += 10 + nkw.length; // longer phrase match = better
    }

    // Individual keyword word overlap
    const kwWords = nkw.split(' ');
    for (const kwWord of kwWords) {
      if (kwWord.length < 2) continue;
      for (const w of words) {
        if (w === kwWord) {
          score += 5;
        } else if (w.length > 3 && kwWord.startsWith(w)) {
          // Prefix match (e.g. "track" matches "tracker")
          score += 3;
        } else if (kwWord.length > 3 && w.startsWith(kwWord)) {
          score += 3;
        }
      }
    }
  }

  // Boost if canonical question words overlap
  const qWords = normalise(entry.question).split(' ');
  for (const w of words) {
    if (w.length > 3 && qWords.includes(w)) {
      score += 2;
    }
  }

  return score;
}

export interface BotResponse {
  answer: string;
  matchedQuestion: string;
  category: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  navigateTo?: string;
}

/**
 * Get the best answer for a user query.
 */
export function getAnswer(query: string): BotResponse {
  if (!query.trim()) {
    return {
      answer: "It looks like you didn't type anything. Try asking a question like *\"How do I track a bus?\"* or click one of the suggestions below!",
      matchedQuestion: '',
      category: 'general',
      confidence: 'none',
    };
  }

  let bestScore = 0;
  let bestEntry: KnowledgeEntry | null = null;

  for (const entry of knowledge) {
    const s = scoreEntry(query, entry);
    if (s > bestScore) {
      bestScore = s;
      bestEntry = entry;
    }
  }

  if (bestEntry && bestScore >= 10) {
    return {
      answer: bestEntry.answer,
      matchedQuestion: bestEntry.question,
      category: bestEntry.category,
      confidence: bestScore >= 20 ? 'high' : 'medium',
      navigateTo: bestEntry.navigateTo,
    };
  }

  if (bestEntry && bestScore >= 5) {
    return {
      answer: bestEntry.answer + '\n\n_If this wasn\'t what you meant, try rephrasing or pick a suggestion below._',
      matchedQuestion: bestEntry.question,
      category: bestEntry.category,
      confidence: 'low',
      navigateTo: bestEntry.navigateTo,
    };
  }

  return {
    answer: "Hmm, I'm not sure about that. Here are some things I can help with:\n• Bus routes & schedules\n• Seat availability\n• Live bus tracking\n• Campus coverage\n• Contact & support info\n\nTry asking something like *\"What are the bus routes?\"* or *\"How do I check seats?\"*",
    matchedQuestion: '',
    category: 'general',
    confidence: 'none',
  };
}
