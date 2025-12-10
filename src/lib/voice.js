/**
 * Lexi.ai Voice Service
 * Handles Text-to-Speech and Speech-to-Text
 */

export const VoiceService = {
    recognition: null,
    isListening: false,

    init() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
        } else {
            console.warn('Web Speech API not supported in this browser.');
        }
    },

    /**
     * Start listening for speech
     * @param {function} onResult - Callback with the transcript
     * @param {function} onError - Callback with error
     */
    startListening(onResult, onError) {
        // Always re-initialize to avoid stale state or 'no-speech' loops
        if (this.recognition) {
            this.recognition.abort();
        }

        if (!('webkitSpeechRecognition' in window)) {
            onError('Speech recognition not supported');
            return;
        }

        this.recognition = new webkitSpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true; // Enable interim results for faster feedback
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
        };

        this.recognition.onend = () => {
            this.isListening = false;
        };

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }

            // If we have a final result, send it
            if (finalTranscript) {
                onResult(finalTranscript, true);
            } else {
                // Send interim result
                const interim = event.results[0][0].transcript;
                onResult(interim, false);
            }
        };

        this.recognition.onerror = (event) => {
            this.isListening = false;
            // Ignore 'no-speech' if it just timed out without input, but still pass it if needed
            onError(event.error);
        };

        try {
            this.recognition.start();
        } catch (e) {
            onError('start-failed');
        }
    },

    /**
     * Stop listening
     */
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    },

    /**
     * Speak text
     * @param {string} text 
     */
    speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    }
};
