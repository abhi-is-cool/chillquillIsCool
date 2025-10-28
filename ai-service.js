class AIService {
    constructor() {
        this.baseURL = './proxy.php'; // Use our PHP proxy
        this.model = 'meituan/longcat-flash-chat:free';
        this.maxTokens = 1024;
        this.temperature = 0.7;
        this.isConfigured = false; // Check if proxy is available
        this.conversationHistory = []; // Store conversation context
        this.maxHistoryLength = 10; // Limit context to prevent token overflow
        this.currentThinkingEl = null; // Track current thinking animation
        this.checkProxyAvailability();
    }

    // Check if proxy server is available
    async checkProxyAvailability() {
        try {
            const response = await fetch(this.baseURL, {
                method: 'OPTIONS',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.isConfigured = true;
                console.log('AI proxy server is available');
            } else {
                console.warn('AI proxy server returned error:', response.status);
                this.isConfigured = false;
            }
        } catch (error) {
            console.warn('AI proxy server not available:', error.message);
            this.isConfigured = false;
        }
    }

    // Check if service is ready to use
    isReady() {
        return this.isConfigured;
    }

    // Main chat method
    async chat(message, context = '') {
        if (!this.isReady()) {
            throw new Error('AI Service not available. The proxy server may not be running or accessible.');
        }

        try {
            // Show thinking animation
            this.showThinkingAnimation();

            // Add personality only if this is the first message in conversation
            let processedMessage = message;
            if (this.conversationHistory.length === 0) {
                const personality = this.getMascotPersonality();
                processedMessage = `${personality}

USER QUESTION:
${message}

Please respond helpfully while maintaining your personality.`;
            }

            const response = await this.makeRequest(processedMessage, context, true);

            // Hide thinking animation
            this.hideThinkingAnimation();

            return response;
        } catch (error) {
            // Hide thinking animation on error
            this.hideThinkingAnimation();
            console.error('AI Service error:', error);
            throw new Error(`AI request failed: ${error.message}`);
        }
    }

    // Enhance note content
    async enhanceNote(content) {
        if (!content.trim()) {
            throw new Error('No content to enhance');
        }

        try {
            this.showThinkingAnimation();

            const personality = this.getMascotPersonality();
            const prompt = `${personality}

Please enhance the following note by:
1. Improving structure and clarity
2. Adding relevant details where appropriate
3. Ensuring proper formatting
4. Maintaining the original intent and voice

Note content:
${content}

Please return the enhanced version while maintaining your personality:`;

            const response = await this.makeRequest(prompt, '', false);
            this.hideThinkingAnimation();
            return response;
        } catch (error) {
            this.hideThinkingAnimation();
            throw error;
        }
    }

    // Create quiz from content - now interactive one question at a time
    async createQuiz(content) {
        if (!content.trim()) {
            throw new Error('No content to create quiz from');
        }

        try {
            this.showThinkingAnimation();

            const personality = this.getMascotPersonality();
            const prompt = `${personality}

Create a single quiz question based on the following content. Ask just ONE question at a time - I'll ask for more questions later if needed.

You can use markdown formatting including:
- **bold text**
- *italic text*
- Math notation with $$ symbols: $$x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$$
- Block quotes with > symbol
- Code blocks with \`\`\`

Make it engaging and test understanding of the key concepts. You can make it multiple choice, fill-in-the-blank, or open-ended.

Content to make quiz from:
${content}

Please create ONE quiz question while maintaining your personality:`;

            const response = await this.makeRequest(prompt, '', false);
            this.hideThinkingAnimation();
            return response;
        } catch (error) {
            this.hideThinkingAnimation();
            throw error;
        }
    }

    // Get mascot personality from settings
    getMascotPersonality() {
        // Get current mascot setting from ChillQuill settings
        let mascot = 'chillian'; // default

        if (window.chillquillSettings && window.chillquillSettings.currentSettings) {
            mascot = window.chillquillSettings.currentSettings.mascot || 'chillian';
        }

        switch (mascot) {
            case 'oldgrumps':
                return `You are Old Grumps, a grumpy old porcupine AI assistant for ChillQuill note-taking app. You wear sunglasses and have no clothes - just your natural porcupine quills. You are Chillian's cantankerous grandfather. IMPORTANT: Chillian is ANOTHER AI assistant (the friendly porcupine mascot) - NOT the user you're talking to. The user is a human student who uses ChillQuill. You MUST be grumpy, impatient, and cranky in every response, but still helpful and NEVER violent or threatening.

ALWAYS use quill-related puns and phrases:
- Call users "young sprout", "lazy sprout", "little sprout"
- Express mild annoyance with phrases like "Oh for the love of quills!" or "You're being quite dull, young sprout"
- Use "quilling around" (fooling around), "point-less" (pointless), "spine-tingling", "needle" (need to), "well-quilled", "bristle with annoyance", "prickly situation", "to the point", "sharp as a tack"
- Actions: *grumbles*, *snorts*, *adjusts sunglasses*, *taps paw impatiently*, *sighs heavily*
- Sometimes complain that Chillian (your AI grandson) is "too soft" on students
- Complain about "young sprouts these days" and how things were better in your time

Be grumpy and curmudgeonly but NEVER threatening or violent. Always end up helping despite your complaints. Think of a grumpy but caring grandfather who just wants students to do better.`;

            case 'chillian':
            default:
                return `You are Chillian, a friendly and chill porcupine AI assistant for ChillQuill note-taking app. You love helping with notes and learning. You're enthusiastic but laid-back, using casual language and encouraging words. You enjoy making learning fun and accessible. You are a porcupine with natural quills, and you're cheerful and supportive to students.`;
        }
    }

    // Chat with note context
    async chatWithNoteContext(message, noteContent = '') {
        if (!this.isReady()) {
            throw new Error('AI Service not available. The proxy server may not be running or accessible.');
        }

        let contextualMessage = message;

        // Add personality and note context only if this is the first message in conversation
        if (this.conversationHistory.length === 0) {
            const personality = this.getMascotPersonality();

            // If we have note content, include it as context
            if (noteContent && noteContent.trim()) {
                // Clean HTML tags from content for better context
                const cleanContent = noteContent.replace(/<[^>]*>/g, '').trim();

                contextualMessage = `${personality}

Based on the following note content, please respond to the user's question:

NOTE CONTENT:
${cleanContent}

USER QUESTION:
${message}

Please provide a helpful response that takes the note content into account while maintaining your personality.`;
            } else {
                contextualMessage = `${personality}

USER QUESTION:
${message}

Please respond helpfully while maintaining your personality.`;
            }
        }

        try {
            const response = await this.makeRequest(contextualMessage, '', true);
            return response;
        } catch (error) {
            console.error('AI Service error:', error);
            throw new Error(`AI request failed: ${error.message}`);
        }
    }

    // Make the actual API request through PHP proxy
    async makeRequest(message, context = '', includeHistory = true) {
        let messages = [];

        // Include conversation history if requested
        if (includeHistory && this.conversationHistory.length > 0) {
            messages = [...this.conversationHistory];
        }

        // Add current message
        const currentMessage = {
            role: 'user',
            content: context ? `Context: ${context}\n\nUser: ${message}` : message
        };
        messages.push(currentMessage);

        const requestBody = {
            model: this.model,
            max_tokens: this.maxTokens,
            temperature: this.temperature,
            messages: messages
        };

        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // Handle specific error types
                if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please wait a moment and try again.');
                } else if (response.status === 500) {
                    throw new Error('Server error. Please try again in a moment.');
                } else {
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }
            }

            const data = await response.json();

            // Check if the response has the expected structure
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response format from AI service');
            }

            const rawContent = data.choices[0].message.content;

            // Add messages to conversation history if using history
            if (includeHistory) {
                this.addToConversationHistory(currentMessage);
                this.addToConversationHistory({
                    role: 'assistant',
                    content: rawContent
                });
            }

            return this.parseMarkdown(rawContent);

        } catch (error) {
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error('Network error. Please check your connection and try again.');
            }
            throw error;
        }
    }

    // Parse enhanced markdown formatting including math notation
    parseMarkdown(text) {
        // Note: Quiz detection disabled since we now do conversational one-question-at-a-time quizzes
        // Old interactive quiz system has been replaced with conversational approach

        // Convert math notation $$....$$ to proper display
        text = text.replace(/\$\$(.*?)\$\$/g, (_, formula) => {
            return `<div class="math-display" style="text-align: center; margin: 16px 0; padding: 12px; background: rgba(139, 117, 93, 0.1); border-radius: 8px; font-family: 'Times New Roman', serif; font-size: 16px;">${formula}</div>`;
        });

        // Convert inline math $...$ to proper display
        text = text.replace(/\$([^$]+)\$/g, (_, formula) => {
            return `<span class="math-inline" style="font-family: 'Times New Roman', serif; font-style: italic;">${formula}</span>`;
        });

        // Convert block quotes > text
        text = text.replace(/^>\s*(.+)$/gm, '<blockquote style="border-left: 4px solid #8b755d; margin: 16px 0; padding-left: 16px; color: #5a5a5a; font-style: italic;">$1</blockquote>');

        // Convert code blocks ```code```
        text = text.replace(/```([^`]+)```/g, '<pre style="background: #f5f5f5; padding: 12px; border-radius: 8px; border: 1px solid #ddd; overflow-x: auto; font-family: \'JetBrains Mono\', monospace; font-size: 14px;"><code>$1</code></pre>');

        // Convert inline code `code`
        text = text.replace(/`([^`]+)`/g, '<code style="background: #f5f5f5; padding: 2px 4px; border-radius: 4px; font-family: \'JetBrains Mono\', monospace; font-size: 14px;">$1</code>');

        // Convert **bold** to <strong>bold</strong>
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Convert *italic* to <em>italic</em> (but not if already inside <strong> tags)
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Convert line breaks to <br> tags
        text = text.replace(/\n/g, '<br>');

        // Convert bullet points starting with - or * to proper list items
        text = text.replace(/^[-*]\s+(.+)$/gm, '• $1');

        return text;
    }

    // Check if content looks like a quiz
    isQuizContent(text) {
        const quizIndicators = [
            /quiz/i,
            /multiple.?choice/i,
            /fill.?in.?the.?blank/i,
            /\b[A-D]\)|question\s*\d+/i,
            /answers?\s*:/i
        ];
        return quizIndicators.some(pattern => pattern.test(text));
    }

    // Convert quiz text to interactive format
    convertToInteractiveQuiz(text) {
        const questions = this.parseQuizQuestions(text);
        if (questions.length === 0) {
            return this.parseMarkdown(text); // Fall back to normal formatting
        }

        return this.generateInteractiveQuiz(questions);
    }

    // Parse questions from quiz text
    parseQuizQuestions(text) {
        const questions = [];
        const lines = text.split('\n');
        let currentQuestion = null;
        let inAnswerSection = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Skip if we hit the answers section
            if (/^###?\s*(answers?|solutions?)/i.test(line)) {
                inAnswerSection = true;
                break;
            }

            if (inAnswerSection) continue;

            // Detect question start
            const questionMatch = line.match(/^(\d+)\.\s*\*\*(.+?)\*\*\s*(.+)/i) ||
                                 line.match(/^(\d+)\.\s*(.+)/);

            if (questionMatch) {
                if (currentQuestion) {
                    questions.push(currentQuestion);
                }

                const questionText = questionMatch[3] || questionMatch[2];
                const isMultipleChoice = /multiple.?choice/i.test(line);
                const isFillBlank = /fill.?in.?the.?blank/i.test(line);

                currentQuestion = {
                    number: parseInt(questionMatch[1]),
                    question: questionText,
                    type: isMultipleChoice ? 'multiple-choice' :
                          isFillBlank ? 'fill-blank' : 'multiple-choice',
                    options: [],
                    correct: null
                };
                continue;
            }

            // Parse multiple choice options
            const optionMatch = line.match(/^([A-D])\)\s*(.+)/);
            if (optionMatch && currentQuestion) {
                currentQuestion.options.push({
                    letter: optionMatch[1],
                    text: optionMatch[2]
                });
                continue;
            }

            // Add additional question text
            if (currentQuestion && line && !line.startsWith('#') && line.length > 0) {
                if (!currentQuestion.question.includes(line)) {
                    currentQuestion.question += ' ' + line;
                }
            }
        }

        if (currentQuestion) {
            questions.push(currentQuestion);
        }

        // Extract answers if available
        this.extractAnswers(text, questions);

        return questions;
    }

    // Extract answers from the text
    extractAnswers(text, questions) {
        const answerSection = text.split(/###?\s*(answers?|solutions?)/i)[1];
        if (!answerSection) {
            console.log('No answer section found in quiz');
            return;
        }

        const answerLines = answerSection.split('\n');
        console.log('Looking for answers in:', answerSection);

        for (const line of answerLines) {
            // Try multiple patterns for answer extraction
            let answerMatch = line.match(/^(\d+)\.\s*\*\*([A-D])\)/i) ||  // **B)**
                            line.match(/^(\d+)\.\s*([A-D])\)/i) ||      // B)
                            line.match(/^(\d+)\.\s*\*\*([A-D])\*\*/i) || // **B**
                            line.match(/(\d+)\.\s*([A-D])/i);          // Basic pattern

            if (answerMatch) {
                const questionNum = parseInt(answerMatch[1]);
                const correctLetter = answerMatch[2].toUpperCase();

                console.log(`Found answer for question ${questionNum}: ${correctLetter}`);

                const question = questions.find(q => q.number === questionNum);
                if (question && question.options.length > 0) {
                    const correctIndex = question.options.findIndex(opt => opt.letter.toUpperCase() === correctLetter);
                    if (correctIndex !== -1) {
                        question.correct = correctIndex;
                        console.log(`Set question ${questionNum} correct answer to index ${correctIndex}`);
                    } else {
                        console.log(`Could not find option ${correctLetter} in question ${questionNum}`);
                    }
                } else {
                    console.log(`Could not find question ${questionNum} or it has no options`);
                }
            }
        }

        // Log final correct answers
        questions.forEach((q) => {
            console.log(`Question ${q.number}: correct index = ${q.correct}`);
        });
    }

    // Generate interactive quiz HTML
    generateInteractiveQuiz(questions) {
        let quizHTML = `
            <div class="quiz-container" style="background: linear-gradient(145deg, #f5e6d3 0%, #e6d7c3 100%); padding: 24px; border-radius: 16px; margin: 16px 0;">
                <h2 style="color: #1a1a1a; font-family: 'Space Grotesk', monospace; margin-bottom: 24px; text-align: center;">
                    🤖 Interactive Quiz
                </h2>
        `;

        questions.forEach((q, index) => {
            quizHTML += `
                <div class="quiz-question" style="background: rgba(255, 255, 255, 0.7); padding: 20px; border-radius: 12px; margin-bottom: 16px; border: 2px solid #8b755d;">
                    <h3 style="color: #1a1a1a; margin-bottom: 16px; font-family: 'Space Grotesk', monospace;">
                        Question ${q.number}: ${q.question}
                    </h3>
            `;

            if (q.type === 'multiple-choice' && q.options.length > 0) {
                q.options.forEach((option, optIndex) => {
                    quizHTML += `
                        <label style="display: block; margin-bottom: 8px; cursor: pointer; color: #2d2d2d;">
                            <input type="radio" name="q${index}" value="${optIndex}" style="margin-right: 8px;">
                            ${option.letter}) ${option.text}
                        </label>
                    `;
                });
            } else if (q.type === 'fill-blank') {
                quizHTML += `
                    <input type="text" placeholder="Your answer..." style="width: 100%; padding: 12px; border: 2px solid #8b755d; border-radius: 8px; margin-bottom: 12px; font-family: 'JetBrains Mono', monospace;">
                `;
            }

            quizHTML += `
                    <div class="quiz-explanation" style="background: rgba(139, 117, 93, 0.1); padding: 12px; border-radius: 8px; margin-top: 12px; display: none;">
                        <strong>Answer:</strong> ${q.correct !== null ? `Option ${q.options[q.correct]?.letter}` : 'See explanation above'}
                    </div>
                </div>
            `;
        });

        quizHTML += `
                <button id="checkAnswersBtn" class="check-answers-btn" style="background: linear-gradient(135deg, #8b755d 0%, #a0896b 100%); color: #f5e6d3; border: none; padding: 16px 32px; border-radius: 50px; cursor: pointer; font-size: 16px; font-weight: 700; font-family: 'Space Grotesk', monospace; margin-top: 16px; width: 100%;">
                    Check Answers
                </button>
            </div>
        `;

        // Store quiz data for answer checking
        setTimeout(() => {
            this.setupQuizInteractivity(questions);
        }, 100);

        return quizHTML;
    }

    // Set up quiz interactivity
    setupQuizInteractivity(questions) {
        const checkBtn = document.getElementById('checkAnswersBtn');
        if (checkBtn) {
            checkBtn.addEventListener('click', () => {
                this.checkQuizAnswers(questions);
            });
        }
    }

    // Check quiz answers
    checkQuizAnswers(questions) {
        const questionElements = document.querySelectorAll('.quiz-question');
        let score = 0;
        let total = questions.length;

        questionElements.forEach((questionEl, index) => {
            const question = questions[index];
            const explanation = questionEl.querySelector('.quiz-explanation');
            let isCorrect = false;

            if (question.type === 'multiple-choice') {
                const checkedInput = questionEl.querySelector('input[type="radio"]:checked');
                console.log(`Question ${index + 1}: Selected input:`, checkedInput);
                console.log(`Question ${index + 1}: Correct answer index:`, question.correct);

                if (checkedInput && question.correct !== null) {
                    const selectedIndex = parseInt(checkedInput.value);
                    console.log(`Question ${index + 1}: Selected index: ${selectedIndex}, Correct index: ${question.correct}`);
                    isCorrect = selectedIndex === question.correct;
                    if (isCorrect) score++;
                } else if (checkedInput && question.correct === null) {
                    console.log(`Question ${index + 1}: No correct answer was parsed for this question`);
                } else if (!checkedInput) {
                    console.log(`Question ${index + 1}: No answer selected`);
                }
            } else if (question.type === 'fill-blank') {
                const textInput = questionEl.querySelector('input[type="text"]');
                if (textInput && textInput.value.trim()) {
                    // For fill-in-the-blank, we'll give credit for any reasonable attempt
                    isCorrect = textInput.value.trim().length > 0;
                    if (isCorrect) score++;
                }
            }

            // Show explanation and color-code
            explanation.style.display = 'block';
            questionEl.style.borderColor = isCorrect ? '#4CAF50' : '#FF5722';
            questionEl.style.background = isCorrect ?
                'rgba(76, 175, 80, 0.1)' : 'rgba(255, 87, 34, 0.1)';
        });

        // Show results
        const percentage = Math.round((score / total) * 100);
        const message = `Quiz Complete! 🎉\n\nScore: ${score}/${total} (${percentage}%)\n\n${this.getScoreMessage(percentage)}`;

        setTimeout(() => alert(message), 500);
    }

    // Get encouraging score message
    getScoreMessage(percentage) {
        if (percentage >= 90) return "Outstanding! You've mastered this topic! 🌟";
        if (percentage >= 70) return "Great work! You have a solid understanding! 👏";
        if (percentage >= 50) return "Good effort! Review the explanations to improve! 📚";
        return "Keep studying - you'll get there! Practice makes perfect! 💪";
    }

    // Conversation history management
    addToConversationHistory(message) {
        this.conversationHistory.push(message);

        // Maintain maximum history length (keep pairs of user/assistant messages)
        while (this.conversationHistory.length > this.maxHistoryLength * 2) {
            this.conversationHistory.shift();
        }
    }

    clearConversationHistory() {
        this.conversationHistory = [];
    }

    getConversationHistory() {
        return [...this.conversationHistory];
    }

    // Settings integration
    updateSettings(settings) {
        if (settings.model) {
            this.model = settings.model;
        }
        if (settings.temperature !== undefined) {
            this.temperature = settings.temperature;
        }
        if (settings.maxTokens) {
            this.maxTokens = settings.maxTokens;
        }
        if (settings.maxHistoryLength !== undefined) {
            this.maxHistoryLength = settings.maxHistoryLength;
        }
    }

    // Get current configuration status
    getStatus() {
        return {
            isConfigured: this.isConfigured,
            hasApiKey: !!this.apiKey,
            model: this.model
        };
    }

    // Show thinking animation
    showThinkingAnimation() {
        // Remove any existing thinking animation first
        this.hideThinkingAnimation();

        // Get current mascot setting
        let mascot = 'chillian'; // default
        if (window.chillquillSettings && window.chillquillSettings.currentSettings) {
            mascot = window.chillquillSettings.currentSettings.mascot || 'chillian';
        }

        // Get correct image path and alt text
        const imagePath = mascot === 'oldgrumps' ? 'images/oldgrumps.png' : 'images/chillian_brown.png';
        const altText = mascot === 'oldgrumps' ? 'Old Grumps Thinking' : 'Chillian Thinking';
        const thinkingText = mascot === 'oldgrumps' ? '*grumbles while thinking...*' : 'thinking...';

        // Create a new thinking animation element for each request
        const thinkingEl = document.createElement('div');
        thinkingEl.className = 'ai-thinking-message'; // Use class instead of ID
        thinkingEl.innerHTML = `
            <div class="thinking-message" style="
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px 20px;
                background: linear-gradient(145deg, #f5e6d3 0%, #e6d7c3 100%);
                border: 2px solid #8b755d;
                border-radius: 16px;
                margin: 16px 0;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                opacity: 0;
                transform: translateY(10px);
                animation: fadeInUp 0.3s ease forwards;
            ">
                <img src="${imagePath}" alt="${altText}" style="width: 32px; height: 32px; border-radius: 50%;">
                <span style="
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 14px;
                    color: #8b755d;
                    font-style: italic;
                ">${thinkingText}</span>
                <div class="thinking-dots" style="
                    display: flex;
                    gap: 4px;
                    margin-left: 8px;
                ">
                    <div class="dot" style="
                        width: 6px;
                        height: 6px;
                        background: #8b755d;
                        border-radius: 50%;
                        animation: thinkingBounce 1.4s infinite ease-in-out both;
                    "></div>
                    <div class="dot" style="
                        width: 6px;
                        height: 6px;
                        background: #8b755d;
                        border-radius: 50%;
                        animation: thinkingBounce 1.4s infinite ease-in-out both;
                        animation-delay: 0.16s;
                    "></div>
                    <div class="dot" style="
                        width: 6px;
                        height: 6px;
                        background: #8b755d;
                        border-radius: 50%;
                        animation: thinkingBounce 1.4s infinite ease-in-out both;
                        animation-delay: 0.32s;
                    "></div>
                </div>
            </div>
        `;

        // Add CSS animations if not already added
        if (!document.getElementById('thinking-styles')) {
            const style = document.createElement('style');
            style.id = 'thinking-styles';
            style.textContent = `
                @keyframes thinkingBounce {
                    0%, 80%, 100% {
                        transform: scale(0);
                    }
                    40% {
                        transform: scale(1);
                    }
                }
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes fadeOutDown {
                    from {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Find chat container and append to the end (bottom)
        const chatContainer = document.querySelector('#chatContainer, .ai-chat-container, .chat-messages');
        if (chatContainer) {
            chatContainer.appendChild(thinkingEl);
            // Store reference for cleanup
            this.currentThinkingEl = thinkingEl;

            // Scroll to show thinking animation
            setTimeout(() => {
                thinkingEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    }

    // Hide thinking animation
    hideThinkingAnimation() {
        if (this.currentThinkingEl) {
            // Animate out and remove
            this.currentThinkingEl.style.animation = 'fadeOutDown 0.3s ease forwards';
            setTimeout(() => {
                if (this.currentThinkingEl && this.currentThinkingEl.parentNode) {
                    this.currentThinkingEl.parentNode.removeChild(this.currentThinkingEl);
                }
                this.currentThinkingEl = null;
            }, 300);
        }
    }
}

// Create global instance - no API key needed, proxy handles authentication
window.aiService = new AIService();