/**
 * Lexi.ai Storage & SRS Library
 * Handles word storage and Spaced Repetition System (SM-2 Algorithm)
 */

const STORAGE_KEY = 'lexi_words';

// SM-2 Algorithm Constants
const MIN_EFACTOR = 1.3;
const DEFAULT_EFACTOR = 2.5;

export const StorageService = {
  /**
   * Add a new word to storage
   * @param {string} word - The word to learn
   * @param {string} definition - Definition of the word
   * @param {string} example - Example sentence
   */
  async addWord(word, definition, example) {
    const newWord = {
      id: crypto.randomUUID(),
      word,
      definition,
      example,
      createdAt: Date.now(),
      nextReview: Date.now(), // Ready for review immediately
      interval: 0,
      repetition: 0,
      efactor: DEFAULT_EFACTOR,
      history: []
    };

    const words = await this.getAllWords();
    words.push(newWord);
    await this.saveWords(words);
    return newWord;
  },

  /**
   * Get all words from storage
   */
  async getAllWords() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        resolve(result[STORAGE_KEY] || []);
      });
    });
  },

  /**
   * Save words array to storage
   */
  async saveWords(words) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: words }, resolve);
    });
  },

  /**
   * Get words that are due for review
   */
  async getDueWords() {
    const words = await this.getAllWords();
    const now = Date.now();
    return words.filter(w => w.nextReview <= now);
  },

  /**
   * Process a review for a word
   * @param {string} wordId 
   * @param {number} quality - 0-5 rating (5 = perfect, 0 = blackout)
   */
  async processReview(wordId, quality) {
    const words = await this.getAllWords();
    const wordIndex = words.findIndex(w => w.id === wordId);

    if (wordIndex === -1) return null;

    const word = words[wordIndex];

    // Calculate new SM-2 values
    let { interval, repetition, efactor } = word;

    if (quality >= 3) {
      if (repetition === 0) {
        interval = 1;
      } else if (repetition === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * efactor);
      }
      repetition += 1;
    } else {
      repetition = 0;
      interval = 1;
    }

    efactor = efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (efactor < MIN_EFACTOR) efactor = MIN_EFACTOR;

    // Update word
    word.interval = interval;
    word.repetition = repetition;
    word.efactor = efactor;
    word.nextReview = Date.now() + (interval * 24 * 60 * 60 * 1000); // interval is in days
    word.history.push({ date: Date.now(), quality });

    words[wordIndex] = word;
    await this.saveWords(words);
    return word;
  },

  /**
   * Delete a word by ID
   */
  async deleteWord(wordId) {
    const words = await this.getAllWords();
    const filtered = words.filter(w => w.id !== wordId);
    await this.saveWords(filtered);
  },

  /**
   * Clear all data (for debugging)
   */
  async clearAll() {
    return new Promise((resolve) => {
      chrome.storage.local.remove([STORAGE_KEY], resolve);
    });
  }
};
