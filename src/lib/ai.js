// OpenRouter API configuration
const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-safeguard-20b';

// Get API key from storage
async function getApiKey() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['openrouter_api_key'], (result) => {
            resolve(result.openrouter_api_key || '');
        });
    });
}

export const AIService = {
    /**
     * Evaluate a user's sentence for a specific word
     * @param {string} targetWord - The word being practiced
     * @param {string} definition - The definition of the word
     * @param {string} userSentence - The sentence written by the user
     */
    async evaluateSentence(targetWord, definition, userSentence) {
        const systemPrompt = `You are a strict, expert English language tutor who helps learners master vocabulary.

SCORING CRITERIA (be strict):
- 5/5: Perfect usage - word used correctly, grammar flawless, context natural and sophisticated
- 4/5: Good usage - word used correctly with minor stylistic issues
- 3/5: Acceptable but awkward - word technically correct but feels forced or unnatural
- 2/5: Incorrect usage - word doesn't fit the context or meaning is wrong
- 1/5: Completely wrong - word misused or sentence makes no sense

IMPORTANT RULES FOR YOUR RESPONSE:
1. In "reasoning": Explain WHY the usage is correct or incorrect based on your comprehensive knowledge of the word's meanings. Consider ALL common definitions and contexts of the word, not just one narrow meaning.
2. In "feedback": Give a short, encouraging summary.
3. In "suggestions": Provide 2 example sentences that MUST use the target word correctly. Show the PROPER way to use this specific word. Do NOT replace the word with synonyms.

Return ONLY valid JSON (no markdown, no extra text).`;

        const userPrompt = `TARGET WORD: "${targetWord}"
USER'S SENTENCE: "${userSentence}"

Evaluate whether the user used the target word correctly and naturally. Use your comprehensive knowledge of the word's meanings - consider ALL common definitions, parts of speech, and contexts in which this word is typically used.

Return JSON:
{
  "score": <integer 1-5>,
  "reasoning": "<detailed explanation of why the score was given, explaining the word's actual meaning and how it was used in the sentence>",
  "feedback": "<short encouraging summary>",
  "suggestions": ["<sentence using ${targetWord} correctly>", "<another sentence using ${targetWord} correctly>"]
}`;

        try {
            const apiKey = await getApiKey();
            if (!apiKey) {
                throw new Error('OpenRouter API key not configured. Please add it in Settings.');
            }

            const response = await fetch(OPENROUTER_API, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://lexi.ai',
                    'X-Title': 'Lexi.ai'
                },
                body: JSON.stringify({
                    model: DEFAULT_MODEL,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    response_format: { type: 'json_object' }
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OpenRouter API error: ${error}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            // Parse the JSON response
            const result = JSON.parse(content);

            return {
                score: result.score || 3,
                reasoning: result.reasoning || '',
                feedback: result.feedback || '',
                suggestions: result.suggestions || []
            };
        } catch (error) {
            console.error('AI evaluation error:', error);
            throw new Error(`Failed to evaluate: ${error.message}`);
        }
    },

    /**
     * Get a definition for a word using AI
     * @param {string} word - The word to define
     */
    async getDefinition(word) {
        const systemPrompt = `You are a helpful English dictionary. Provide clear, concise definitions for words.`;

        const userPrompt = `Provide a comprehensive but concise definition for the word: "${word}"

Include the part of speech in parentheses at the start (e.g., "(noun)", "(adjective)", "(verb)"), followed by the definition.

Return ONLY valid JSON (no markdown, no extra text) in this format:
{
  "definition": "(part of speech) clear definition here"
}`;

        try {
            const apiKey = await getApiKey();
            if (!apiKey) {
                throw new Error('OpenRouter API key not configured. Please add it in Settings.');
            }

            const response = await fetch(OPENROUTER_API, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://lexi.ai',
                    'X-Title': 'Lexi.ai'
                },
                body: JSON.stringify({
                    model: DEFAULT_MODEL,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    response_format: { type: 'json_object' }
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OpenRouter API error: ${error}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;
            const result = JSON.parse(content);

            return result.definition || '';
        } catch (error) {
            console.error('AI definition error:', error);
            throw new Error(`Failed to get definition: ${error.message}`);
        }
    }
};
