/**
 * Deck Import/Export Utilities
 * Allows users to share flashcard decks as JSON files
 */

import type { Deck } from '../store/store';

export interface ExportedDeck {
  version: string;
  exportedAt: string;
  deck: {
    name: string;
    color: string;
    description?: string;
  };
  cards: Array<{
    question: string;
    answer: string;
  }>;
}

/**
 * Export a deck to JSON file
 */
export const exportDeck = (deck: Deck, cards: Array<{ question: string; answer: string }>) => {
  const exportData: ExportedDeck = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    deck: {
      name: deck.name,
      color: deck.color,
      description: `Exported from MemoKard`
    },
    cards: cards.map(card => ({
      question: card.question,
      answer: card.answer
    }))
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${deck.name.replace(/[\\/:*?"<>|]/g, '_')}_deck.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Import a deck from JSON file
 */
export const importDeck = (file: File): Promise<ExportedDeck> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as ExportedDeck;
        
        // Validate structure
        if (!data.deck || !data.cards || !Array.isArray(data.cards)) {
          throw new Error('Invalid deck file format');
        }
        
        if (data.cards.length === 0) {
          throw new Error('Deck contains no cards');
        }
        
        // Validate each card
        for (const card of data.cards) {
          if (!card.question || !card.answer) {
            throw new Error('Invalid card format: missing question or answer');
          }
        }
        
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Import a deck from raw text (JSON, CSV, TSV)
 */
export const importDeckFromText = (text: string, defaultName = 'Imported Deck', defaultColor = 'violet'): ExportedDeck => {
  let t = text.trim();
  
  // 1. Try parsing as JSON first (Handle markdown code blocks)
  try {
    // Strip markdown code blocks if present
    if (t.includes('```json')) {
      const match = t.match(/```json\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        t = match[1].trim();
      }
    } else if (t.includes('```')) {
      const match = t.match(/```\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        t = match[1].trim();
      }
    } else if (!t.startsWith('{') && t.includes('{') && t.includes('}')) {
      // Try to extract JSON object if there's text around it
      const firstBrace = t.indexOf('{');
      const lastBrace = t.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        t = t.substring(firstBrace, lastBrace + 1).trim();
      }
    }

    if (t.startsWith('{')) {
      try {
        // Fix single backslashes (e.g. \frac, \sum) from LLM output before parsing
        // Negative lookbehind (?<!\\) ensures we don't match already escaped backslashes.
        // Negative lookahead (?!["\\/]) ensures we don't touch valid quote/slash escapes.
        const fixedJson = t.replace(/(?<!\\)\\(?!["\\/])/g, '\\\\');
        const data = JSON.parse(fixedJson);
        if (validateDeckData(data)) {
          return data;
        } else if (data && data.deck && Array.isArray(data.cards)) {
          // Lenient validation: as long as it has deck and cards array
          return {
            ...data,
            deck: {
              name: data.deck.name || defaultName,
              color: data.deck.color || defaultColor,
              description: data.deck.description
            }
          };
        }
      } catch (err) {
        // Ignore JSON error, fallback to text parsing
      }
    }
  } catch (e) {
    // Ignore JSON error, fallback to text parsing
  }

  // 2. Parse as Text (TSV, CSV, Pipe)
  const cards: Array<{question: string, answer: string}> = [];
  const lines = t.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // TSV (Excel/Sheets copy-paste)
    if (trimmed.includes('\t')) {
      const parts = trimmed.split('\t');
      if (parts.length >= 2) {
        cards.push({ question: parts[0].trim(), answer: parts.slice(1).join('\t').trim() });
        continue;
      }
    }
    
    // Pipe separated
    if (trimmed.includes('|')) {
      const parts = trimmed.split('|');
      if (parts.length >= 2) {
        cards.push({ question: parts[0].trim(), answer: parts.slice(1).join('|').trim() });
        continue;
      }
    }

    // CSV (basic)
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',');
      if (parts.length >= 2) {
        cards.push({ question: parts[0].trim(), answer: parts.slice(1).join(',').trim() });
        continue;
      }
    }
  }

  if (cards.length === 0) {
    throw new Error('ไม่พบข้อมูลการ์ด กรุณาคั่นคำถามและคำตอบด้วย Tab, | (Pipe) หรือ , (Comma)');
  }

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    deck: {
      name: defaultName,
      color: defaultColor,
      description: 'Imported from text/table'
    },
    cards
  };
};

/**
 * Validate imported deck data
 */
export const validateDeckData = (data: any): data is ExportedDeck => {
  return (
    data &&
    typeof data === 'object' &&
    data.deck &&
    typeof data.deck.name === 'string' &&
    typeof data.deck.color === 'string' &&
    Array.isArray(data.cards) &&
    data.cards.every((card: any) => 
      card &&
      typeof card.question === 'string' &&
      typeof card.answer === 'string'
    )
  );
};
