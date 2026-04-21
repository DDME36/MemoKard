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
  link.download = `${deck.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_deck.json`;
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
