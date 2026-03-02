const Groq = require('groq-sdk');
const { truncateText, splitIntoChunks } = require('../utils/textExtractor');

// Initialize Groq AI
// Free tier limits: 100k tokens/day, 30 req/min
// Token estimation: ~4 chars = 1 token
let groq = null;

// Models available on Groq free tier:
// - llama-3.3-70b-versatile: Best quality, but uses more tokens
// - llama-3.1-8b-instant: Faster, fewer tokens, good for simple tasks
const MODELS = {
  LARGE: 'llama-3.3-70b-versatile',  // For quizzes, complex generation
  SMALL: 'llama-3.1-8b-instant'       // For topics, summaries, suggestions
};

// Text limits (chars) - conservative to preserve daily token quota
// 15k chars ≈ 3,750 tokens input
const TEXT_LIMITS = {
  TOPICS: 15000,     // Topic extraction (one-time)
  NOTES: 12000,      // Notes generation
  SUMMARY: 10000,    // Summary generation  
  QUIZ: 15000,       // Quiz generation (needs context)
  ESSAY: 12000,      // Essay questions
  FLASHCARDS: 10000  // Flashcards
};

const initializeGroq = () => {
  if (!groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      console.warn('⚠️  GROQ_API_KEY not configured. AI features will not work.');
      return null;
    }
    groq = new Groq({ apiKey });
    console.log('✅ Groq AI initialized (free tier: 100k tokens/day)');
  }
  return groq;
};

/**
 * Safe JSON parse with fallback - handles control characters and malformed JSON
 */
function safeJSONParse(text, fallback = null) {
  if (!text || typeof text !== 'string') return fallback;
  
  try {
    // Remove markdown code blocks if present
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();
    
    // Helper: try to parse JSON
    function tryParse(str) {
      try {
        return JSON.parse(str);
      } catch (e) {
        return null;
      }
    }
    
    // Attempt 1: Direct parse
    let result = tryParse(cleaned);
    if (result) return result;
    
    // Attempt 2: The main issue - newlines inside JSON string values
    // We need to escape newlines that are INSIDE strings, not between JSON elements
    // Strategy: Find all string values and escape their newlines
    function escapeNewlinesInStrings(jsonStr) {
      let result = '';
      let inString = false;
      let escapeNext = false;
      
      for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        
        if (escapeNext) {
          result += char;
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          result += char;
          escapeNext = true;
          continue;
        }
        
        if (char === '"') {
          inString = !inString;
          result += char;
          continue;
        }
        
        // If we're inside a string and hit a newline, escape it
        if (inString && (char === '\n' || char === '\r')) {
          result += char === '\n' ? '\\n' : '\\r';
          continue;
        }
        
        // If we're inside a string and hit a tab, escape it
        if (inString && char === '\t') {
          result += '\\t';
          continue;
        }
        
        result += char;
      }
      
      return result;
    }
    
    const escapedStr = escapeNewlinesInStrings(cleaned);
    result = tryParse(escapedStr);
    if (result) return result;
    
    // Attempt 3: Fix missing closing braces/brackets
    let fixed = escapedStr;
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;
    
    for (let i = 0; i < openBraces - closeBraces; i++) fixed += '}';
    for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']';
    
    result = tryParse(fixed);
    if (result) return result;
    
    // Attempt 4: Fix trailing commas
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    result = tryParse(fixed);
    if (result) return result;
    
    // All attempts failed
    console.error('JSON parse error: All repair attempts failed');
    console.error('Response preview:', cleaned.substring(0, 300));
    return fallback;
    
  } catch (error) {
    console.error('JSON parse error:', error.message);
    if (text) {
      console.error('Response preview:', text.substring(0, 200));
    }
    return fallback;
  }
}

/**
 * Make an AI request with retry logic
 */
async function makeAIRequest(prompt, options = {}) {
  const client = initializeGroq();
  if (!client) {
    throw new Error('Groq AI not configured. Please set GROQ_API_KEY in .env');
  }
  
  const maxRetries = options.maxRetries || 3;
  const retryDelay = options.retryDelay || 1000;
  const model = options.model || MODELS.SMALL; // Default to small model to save tokens
  const maxTokens = options.maxTokens || 2048;  // Reduced from 4096
  
  // Estimate tokens for logging
  const estimatedInputTokens = Math.ceil(prompt.length / 4);
  console.log(`   🤖 AI Request: model=${model.split('-')[1]}, ~${estimatedInputTokens} input tokens`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an educational AI assistant. Always respond with valid JSON when asked for JSON output. Be concise but accurate.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
      });
      
      const usage = completion.usage;
      if (usage) {
        console.log(`   ✅ Tokens used: ${usage.prompt_tokens} in, ${usage.completion_tokens} out`);
      }
      
      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error(`AI request attempt ${attempt} failed:`, error.message);
      
      // If daily limit exceeded, don't retry
      if (error.message?.includes('tokens per day') || error.message?.includes('TPD')) {
        console.error('❌ Daily token limit reached. Try again tomorrow or upgrade Groq plan.');
        throw error;
      }
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }
}

/**
 * Refine a vague goal into a SMART goal
 */
async function refineGoal(goalTitle, subject, deadline, materialTitles = []) {
  const materialsContext = materialTitles.length > 0 
    ? `The user has uploaded these study materials: ${materialTitles.join(', ')}`
    : 'No study materials uploaded yet.';
    
  const daysUntilDeadline = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
  
  const prompt = `You are an educational assistant helping a student create a SMART learning goal.

Current goal: "${goalTitle}"
Subject: ${subject}
Days until deadline: ${daysUntilDeadline}
${materialsContext}

Please refine this goal into a SMART (Specific, Measurable, Achievable, Relevant, Time-bound) goal.

Respond ONLY with a JSON object in this exact format:
{
  "refinedGoal": "The improved SMART goal statement",
  "specifics": "What specifically needs to be learned",
  "measurables": ["How progress can be measured - list 2-3 metrics"],
  "weeklyMilestones": ["Week 1: ...", "Week 2: ..."],
  "suggestions": ["Helpful tip 1", "Helpful tip 2"]
}`;

  const response = await makeAIRequest(prompt);
  return safeJSONParse(response, {
    refinedGoal: goalTitle,
    specifics: subject,
    measurables: ['Complete all study materials', 'Pass practice quizzes'],
    weeklyMilestones: ['Review materials', 'Practice exercises'],
    suggestions: ['Study consistently', 'Take regular breaks']
  });
}

/**
 * Get real-time suggestions for vague goal input (fast, lightweight)
 */
async function getGoalSuggestions(partialGoal, subject = '') {
  if (!partialGoal || partialGoal.length < 3) {
    return { suggestions: [] };
  }
  
  const prompt = `You are an educational assistant. A student is typing a learning goal.

Partial input: "${partialGoal}"
${subject ? `Subject: ${subject}` : ''}

Based on this partial input, suggest 3-4 clear, well-defined learning goals they might be trying to create.
Make suggestions specific, actionable, and relevant to typical academic/learning scenarios.

Respond ONLY with a JSON object:
{
  "suggestions": [
    "Specific goal suggestion 1",
    "Specific goal suggestion 2", 
    "Specific goal suggestion 3"
  ],
  "isVague": true/false (whether the input seems vague and needs clarification)
}`;

  try {
    const response = await makeAIRequest(prompt);
    return safeJSONParse(response, { suggestions: [], isVague: false });
  } catch (error) {
    console.error('Goal suggestion error:', error);
    return { suggestions: [], isVague: false };
  }
}

/**
 * Extract topics from study material text
 */
async function extractTopics(text, subject, goalTitle) {
  // Truncate text aggressively to preserve daily token quota
  const truncatedText = truncateText(text, TEXT_LIMITS.TOPICS);
  
  const prompt = `You are an educational content analyzer. Analyze the following study material and extract the main topics/chapters with their sub-topics.

Subject: ${subject}
Goal: ${goalTitle}

Study Material Content:
---
${truncatedText}
---

Extract 5-15 main topics that a student should learn from this material. For each main topic, identify 2-6 key sub-topics or concepts covered under it. Order them logically (easier concepts first, building up to complex ones).

Respond ONLY with a JSON object in this exact format:
{
  "topics": [
    {
      "name": "Main Topic Name",
      "description": "Brief 1-2 sentence description",
      "order": 1,
      "estimatedHours": 2,
      "subTopics": [
        { "name": "Sub-topic 1", "description": "Brief description" },
        { "name": "Sub-topic 2", "description": "Brief description" }
      ]
    }
  ],
  "totalEstimatedHours": 20,
  "recommendedDailyStudyTime": "2 hours"
}`;

  const response = await makeAIRequest(prompt, { maxTokens: 4096 });
  const parsed = safeJSONParse(response, { topics: [] });
  
  // Ensure topics have required fields
  if (parsed.topics && parsed.topics.length > 0) {
    return parsed.topics.map((topic, index) => ({
      name: topic.name || `Topic ${index + 1}`,
      description: topic.description || '',
      subTopics: Array.isArray(topic.subTopics) 
        ? topic.subTopics.map(st => ({ name: st.name || '', description: st.description || '' }))
        : [],
      order: topic.order || index + 1,
      status: 'not-started',
      progress: 0,
      difficultyLevel: 'medium'
    }));
  }
  
  return [];
}

/**
 * Generate comprehensive notes for a topic
 */
async function generateNotes(text, topicName, subject) {
  const truncatedText = truncateText(text, TEXT_LIMITS.NOTES);
  
  const prompt = `You are an expert educational content creator. Generate comprehensive study notes for the topic "${topicName}" in the subject "${subject}".

Source Material:
${truncatedText}

Create detailed study notes covering:
- Overview and introduction
- Key concepts with explanations  
- Important definitions
- Examples where relevant
- Summary of key takeaways

IMPORTANT: Respond with ONLY a valid JSON object, no markdown, no extra text. Use this exact structure:
{"title": "Notes: ${topicName}", "content": "Your notes in markdown format here", "keyPoints": ["point 1", "point 2"], "sections": [{"heading": "Section 1", "content": "Content..."}]}`;

  const response = await makeAIRequest(prompt);
  const parsed = safeJSONParse(response, null);
  
  // If parsing failed, try to extract content from raw response
  if (!parsed) {
    console.log('   ⚠️ JSON parse failed, using raw response as content');
    return {
      title: `Notes: ${topicName}`,
      content: response || 'Notes generation failed. Please try again.',
      keyPoints: [],
      sections: []
    };
  }
  
  return parsed;
}

/**
 * Generate a summary for a topic or entire material
 */
async function generateSummary(text, topicName, subject) {
  const truncatedText = truncateText(text, TEXT_LIMITS.SUMMARY);
  
  const prompt = `You are an expert educational summarizer. Create a concise but comprehensive summary of "${topicName}" in "${subject}".

Source Material:
${truncatedText}

Create a summary that captures all essential information while being easy to review quickly.

IMPORTANT: Respond with ONLY a valid JSON object, no markdown, no extra text:
{"title": "Summary: ${topicName}", "content": "Summary in markdown format", "keyPoints": ["point 1", "point 2"], "quickReview": "2-3 sentence overview"}`;

  const response = await makeAIRequest(prompt);
  const parsed = safeJSONParse(response, null);
  
  // If parsing failed, use raw response as content
  if (!parsed) {
    console.log('   ⚠️ Summary JSON parse failed, using raw response');
    return {
      title: `Summary: ${topicName}`,
      content: response || 'Summary generation failed. Please try again.',
      keyPoints: [],
      quickReview: ''
    };
  }
  
  return parsed;
}

/**
 * Generate quiz questions (MCQ) for a topic
 */
async function generateQuiz(text, topicName, subject, difficulty = 'medium', questionCount = 10) {
  // Use larger model for quizzes (quality matters)
  const truncatedText = truncateText(text, TEXT_LIMITS.QUIZ);
  
  const difficultyGuide = {
    easy: 'basic recall and simple understanding questions',
    medium: 'application and analysis questions requiring deeper understanding',
    hard: 'synthesis and evaluation questions requiring critical thinking'
  };
  
  const prompt = `You are an expert educational assessment creator. Generate multiple choice quiz questions for the following topic.

Subject: ${subject}
Topic: ${topicName}
Difficulty: ${difficulty} (${difficultyGuide[difficulty]})
Number of questions: ${questionCount}

Source Material:
---
${truncatedText}
---

Create ${questionCount} multiple choice questions with 4 options each. Ensure:
- Questions test understanding, not just memorization
- Distractors (wrong options) are plausible but clearly wrong
- Each question has exactly one correct answer
- Include explanations for why the correct answer is right

Respond ONLY with a JSON object in this exact format:
{
  "title": "Quiz: ${topicName}",
  "description": "Test your knowledge of ${topicName}",
  "questions": [
    {
      "question": "Question text?",
      "options": [
        {"text": "Option A", "isCorrect": false},
        {"text": "Option B", "isCorrect": true},
        {"text": "Option C", "isCorrect": false},
        {"text": "Option D", "isCorrect": false}
      ],
      "explanation": "Why option B is correct...",
      "difficulty": "${difficulty}"
    }
  ]
}`;

  // Use LARGE model for quizzes - quality matters for assessment
  const response = await makeAIRequest(prompt, { model: MODELS.LARGE, maxTokens: 3000 });
  const parsed = safeJSONParse(response, { questions: [] });
  
  return {
    title: parsed.title || `Quiz: ${topicName}`,
    description: parsed.description || `Test your knowledge of ${topicName}`,
    questions: parsed.questions || [],
    difficulty,
    passingScore: 70
  };
}

/**
 * Generate essay/long-answer questions for a topic
 */
async function generateEssayQuestions(text, topicName, subject, difficulty = 'medium', questionCount = 5) {
  const truncatedText = truncateText(text, TEXT_LIMITS.ESSAY);
  
  const prompt = `You are an expert educational assessment creator. Generate essay/long-answer questions for the following topic.

Subject: ${subject}
Topic: ${topicName}
Difficulty: ${difficulty}
Number of questions: ${questionCount}

Source Material:
---
${truncatedText}
---

Create ${questionCount} thought-provoking essay questions that require detailed written responses. Include:
- Questions that test deep understanding
- Sample answer outlines
- Key points that should be addressed

Respond ONLY with a JSON object in this exact format:
{
  "title": "Essay Questions: ${topicName}",
  "description": "Practice explaining concepts in depth",
  "questions": [
    {
      "question": "Detailed question requiring explanation...",
      "sampleAnswer": "A comprehensive sample answer...",
      "keyPoints": ["Point 1 to address", "Point 2 to address"],
      "difficulty": "${difficulty}"
    }
  ]
}`;

  const response = await makeAIRequest(prompt);
  const parsed = safeJSONParse(response, { questions: [] });
  
  return {
    title: parsed.title || `Essay Questions: ${topicName}`,
    description: parsed.description || 'Practice explaining concepts in depth',
    questions: parsed.questions || []
  };
}

/**
 * Generate flashcards for quick review
 */
async function generateFlashcards(text, topicName, subject, cardCount = 20) {
  const truncatedText = truncateText(text, TEXT_LIMITS.FLASHCARDS);
  
  const prompt = `You are an expert educational content creator. Generate flashcards for effective memorization and quick review.

Subject: ${subject}
Topic: ${topicName}
Number of flashcards: ${cardCount}

Source Material:
---
${truncatedText}
---

Create ${cardCount} flashcards with:
- Front: A question, term, or concept
- Back: The answer, definition, or explanation
- Hint: An optional hint to help recall

Respond ONLY with a JSON object in this exact format:
{
  "flashcards": [
    {
      "front": "Term or question",
      "back": "Definition or answer",
      "hint": "Optional hint"
    }
  ]
}`;

  const response = await makeAIRequest(prompt);
  const parsed = safeJSONParse(response, { flashcards: [] });
  
  return parsed.flashcards.map(card => ({
    front: card.front || '',
    back: card.back || '',
    hint: card.hint || '',
    mastered: false,
    reviewCount: 0
  }));
}

/**
 * Analyze quiz performance and recommend difficulty adjustment
 */
async function analyzePerformance(quizAttempts, currentDifficulty) {
  if (!quizAttempts || quizAttempts.length < 2) {
    return {
      recommendedDifficulty: currentDifficulty,
      analysis: 'Not enough data for analysis',
      suggestions: ['Complete more quizzes to get personalized recommendations']
    };
  }
  
  const recentAttempts = quizAttempts.slice(-5);
  const scores = recentAttempts.map(a => a.percentage);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const trend = scores.length >= 2 ? scores[scores.length - 1] - scores[0] : 0;
  
  const prompt = `Analyze this student's quiz performance and recommend adjustments:

Current difficulty: ${currentDifficulty}
Recent scores: ${scores.join('%, ')}%
Average score: ${avgScore.toFixed(1)}%
Score trend: ${trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable'}

Based on this data, should the difficulty be adjusted? Provide specific recommendations.

Respond ONLY with a JSON object:
{
  "recommendedDifficulty": "easy|medium|hard",
  "shouldAdjust": true/false,
  "analysis": "Brief analysis of performance",
  "suggestions": ["Suggestion 1", "Suggestion 2"],
  "focusAreas": ["Area needing more practice"]
}`;

  const response = await makeAIRequest(prompt);
  return safeJSONParse(response, {
    recommendedDifficulty: currentDifficulty,
    shouldAdjust: false,
    analysis: 'Performance is consistent',
    suggestions: ['Keep practicing regularly'],
    focusAreas: []
  });
}

/**
 * Grade an essay answer and provide feedback
 */
async function gradeEssayAnswer(question, sampleAnswer, userAnswer, keyPoints) {
  const prompt = `You are an expert educational assessor. Grade this student's essay answer and provide constructive feedback.

Question: ${question}

Expected Key Points:
${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Sample Answer:
${sampleAnswer}

Student's Answer:
${userAnswer}

Grade the answer (0-100) and provide detailed feedback.

Respond ONLY with a JSON object:
{
  "score": 75,
  "feedback": "Overall assessment of the answer...",
  "strengths": ["What the student did well"],
  "improvements": ["What could be improved"],
  "missingPoints": ["Important points not addressed"]
}`;

  const response = await makeAIRequest(prompt);
  return safeJSONParse(response, {
    score: 50,
    feedback: 'Unable to grade automatically. Please review manually.',
    strengths: [],
    improvements: [],
    missingPoints: []
  });
}

/**
 * Get recommended next study action
 */
async function getStudyRecommendation(topics, learningProfile, daysRemaining) {
  const topicSummary = topics.map(t => 
    `${t.name}: ${t.progress}% complete, difficulty: ${t.difficultyLevel}, avg score: ${t.averageScore || 'N/A'}`
  ).join('\n');
  
  const prompt = `You are a study coach AI. Based on the student's progress, recommend what they should focus on next.

Topics Progress:
${topicSummary}

Learning Profile:
- Average Quiz Score: ${learningProfile.averageQuizScore || 0}%
- Strong Topics: ${learningProfile.strongTopics?.join(', ') || 'None identified'}
- Weak Topics: ${learningProfile.weakTopics?.join(', ') || 'None identified'}

Days until deadline: ${daysRemaining}

Provide a specific, actionable recommendation.

Respond ONLY with a JSON object:
{
  "recommendation": "Study [topic] because...",
  "priority": "high|medium|low",
  "estimatedTime": "30 minutes",
  "reason": "Why this is recommended",
  "alternativeActions": ["Alternative 1", "Alternative 2"]
}`;

  const response = await makeAIRequest(prompt);
  return safeJSONParse(response, {
    recommendation: 'Continue studying at your own pace',
    priority: 'medium',
    estimatedTime: '30 minutes',
    reason: 'Consistent progress is key',
    alternativeActions: []
  });
}

module.exports = {
  initializeGroq,
  refineGoal,
  getGoalSuggestions,
  extractTopics,
  generateNotes,
  generateSummary,
  generateQuiz,
  generateEssayQuestions,
  generateFlashcards,
  analyzePerformance,
  gradeEssayAnswer,
  getStudyRecommendation
};
