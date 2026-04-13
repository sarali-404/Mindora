const Goal = require('../models/Goal');
const GeneratedContent = require('../models/GeneratedContent');
const ActivityLog = require('../models/ActivityLog');
const { extractText, isSupportedFileType } = require('../utils/textExtractor');
const aiService = require('../services/aiService');
const knowledgeService = require('../services/knowledgeStateService');
const predictiveModel = require('../services/predictiveModel');
const gamificationService = require('../services/gamificationService');
const notificationService = require('../services/notificationService');
const difficultyAnalyzer = require('../services/difficultyAnalyzer');
const path = require('path');
const fs = require('fs');

// Constants
const MAX_MATERIALS = 5;
const MAX_FILE_SIZE_MB = 10;
const MAX_PAGES = 50;

// ==================== AI SUGGESTIONS ====================

/**
 * Get real-time AI suggestions for goal title
 */
exports.getGoalSuggestions = async (req, res) => {
  try {
    const { partialGoal, subject } = req.query;

    if (!partialGoal || partialGoal.length < 3) {
      return res.json({
        success: true,
        data: { suggestions: [], isVague: false }
      });
    }

    const result = await aiService.getGoalSuggestions(partialGoal, subject || '');

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Goal suggestions error:', error);
    res.json({
      success: true,
      data: { suggestions: [], isVague: false }
    });
  }
};

// ==================== GOAL CRUD ====================

/**
 * Create a new goal
 */
exports.createGoal = async (req, res) => {
  try {
    const { goalTitle, subject, targetMarks, deadline } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!goalTitle || !subject || !deadline) {
      return res.status(400).json({
        success: false,
        message: 'Please provide goal title, subject, and deadline'
      });
    }

    // Create goal
    const goal = new Goal({
      user: userId,
      title: goalTitle,
      subject,
      targetMarks,
      deadline: new Date(deadline),
      materials: [],
      aiProcessingStatus: 'pending'
    });

    await goal.save();

    // --- Fire-and-forget: Update gamification ---
    gamificationService.addXP(userId, 'goal_created', 25).then(() => {
      gamificationService.updateActivityStats(userId, { goalsCreated: 1 }).catch(e =>
        console.error('Update activity stats error:', e.message)
      );
      gamificationService.evaluateAchievements(userId).catch(e =>
        console.error('Evaluate achievements error:', e.message)
      );
    }).catch(e =>
      console.error('Add XP error:', e.message)
    );

    res.status(201).json({
      success: true,
      message: 'Goal created successfully',
      data: goal
    });
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create goal',
      error: error.message
    });
  }
};

/**
 * Create goal with materials (multipart form)
 */
exports.createGoalWithMaterials = async (req, res) => {
  try {
    const { goalTitle, subject, targetMarks, deadline } = req.body;
    const userId = req.user._id;
    const files = req.files || [];

    // Validate required fields
    if (!goalTitle || !subject || !deadline) {
      // Clean up uploaded files
      files.forEach(file => {
        fs.unlink(file.path, err => {
          if (err) console.error('Error deleting file:', err);
        });
      });
      return res.status(400).json({
        success: false,
        message: 'Please provide goal title, subject, and deadline'
      });
    }

    // Validate file count
    if (files.length > MAX_MATERIALS) {
      files.forEach(file => {
        fs.unlink(file.path, err => {
          if (err) console.error('Error deleting file:', err);
        });
      });
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_MATERIALS} materials allowed per goal`
      });
    }

    // Validate file types
    for (const file of files) {
      if (!isSupportedFileType(file.mimetype)) {
        files.forEach(f => {
          fs.unlink(f.path, err => {
            if (err) console.error('Error deleting file:', err);
          });
        });
        return res.status(400).json({
          success: false,
          message: `Unsupported file type: ${file.originalname}. Supported: PDF, DOCX, TXT`
        });
      }
    }

    // Create materials array
    const materials = files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      extractionStatus: 'pending'
    }));

    // Create goal
    const goal = new Goal({
      user: userId,
      title: goalTitle,
      subject,
      targetMarks,
      deadline: new Date(deadline),
      materials,
      aiProcessingStatus: materials.length > 0 ? 'extracting' : 'pending'
    });

    await goal.save();

    // Start background processing if materials exist
    if (materials.length > 0) {
      processGoalMaterials(goal._id).catch(err => {
        console.error('Background processing error:', err);
      });
    }

    res.status(201).json({
      success: true,
      message: 'Goal created successfully. Materials are being processed.',
      data: goal
    });
  } catch (error) {
    console.error('Create goal with materials error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create goal',
      error: error.message
    });
  }
};

/**
 * Get all goals for the current user
 */
exports.getMyGoals = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, sort = '-createdAt' } = req.query;

    const query = { user: userId };
    if (status) {
      query.status = status;
    }

    const goals = await Goal.find(query)
      .sort(sort)
      .select('-materials.extractedText'); // Don't send huge text in list

    res.json({
      success: true,
      data: goals
    });
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch goals',
      error: error.message
    });
  }
};

/**
 * Get a single goal by ID
 */
exports.getGoal = async (req, res) => {
  try {
    const { goalId } = req.params;
    const userId = req.user._id;

    const goal = await Goal.findOne({ _id: goalId, user: userId });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Get generated content for this goal
    const content = await GeneratedContent.find({ goal: goalId, status: 'active' })
      .select('-quizContent.questions.explanation') // Hide explanations initially
      .sort({ contentType: 1, topic: 1 });

    res.json({
      success: true,
      data: {
        goal,
        content
      }
    });
  } catch (error) {
    console.error('Get goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch goal',
      error: error.message
    });
  }
};

/**
 * Update a goal
 */
exports.updateGoal = async (req, res) => {
  try {
    const { goalId } = req.params;
    const userId = req.user._id;
    const updates = req.body;

    // Fields that can be updated
    const allowedUpdates = ['title', 'subject', 'targetMarks', 'deadline', 'status'];
    const filteredUpdates = {};

    for (const field of allowedUpdates) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    const goal = await Goal.findOneAndUpdate(
      { _id: goalId, user: userId },
      filteredUpdates,
      { new: true, runValidators: true }
    );

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // --- Fire-and-forget: Update gamification if goal is completed ---
    if (filteredUpdates.status === 'completed') {
      gamificationService.addXP(userId, 'goal_completed', 100).then(() => {
        gamificationService.updateActivityStats(userId, { goalsCompleted: 1 }).catch(e =>
          console.error('Update activity stats error:', e.message)
        );
        gamificationService.evaluateAchievements(userId).catch(e =>
          console.error('Evaluate achievements error:', e.message)
        );
      }).catch(e =>
        console.error('Add XP error:', e.message)
      );
    }

    res.json({
      success: true,
      message: 'Goal updated successfully',
      data: goal
    });
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update goal',
      error: error.message
    });
  }
};

/**
 * Delete a goal
 */
exports.deleteGoal = async (req, res) => {
  try {
    const { goalId } = req.params;
    const userId = req.user._id;

    const goal = await Goal.findOne({ _id: goalId, user: userId });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Delete associated files
    for (const material of goal.materials) {
      if (material.path && fs.existsSync(material.path)) {
        fs.unlink(material.path, err => {
          if (err) console.error('Error deleting file:', err);
        });
      }
    }

    // Delete generated content
    await GeneratedContent.deleteMany({ goal: goalId });

    // Delete the goal
    await Goal.deleteOne({ _id: goalId });

    res.json({
      success: true,
      message: 'Goal deleted successfully'
    });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete goal',
      error: error.message
    });
  }
};

// ==================== MATERIAL PROCESSING ====================

/**
 * Background function to process goal materials
 */
async function processGoalMaterials(goalId) {
  try {
    const goal = await Goal.findById(goalId);
    if (!goal) {
      console.log('❌ Goal not found for processing:', goalId);
      return;
    }

    console.log(`\n📚 Processing materials for goal: "${goal.title}"`);
    console.log(`   Materials count: ${goal.materials.length}`);

    let allExtractedText = '';

    // Extract text from each material
    for (const material of goal.materials) {
      try {
        console.log(`   📄 Extracting: ${material.originalName}`);
        material.extractionStatus = 'processing';
        await goal.save();

        const result = await extractText(material.path, material.mimeType, {
          maxPages: MAX_PAGES,
          maxSizeMB: MAX_FILE_SIZE_MB
        });

        material.extractedText = result.text;
        material.pageCount = result.pageCount;
        material.extractionStatus = 'completed';

        console.log(`   ✅ Extracted ${result.text.length} chars from ${material.originalName}`);
        allExtractedText += `\n\n=== ${material.originalName} ===\n\n${result.text}`;
      } catch (error) {
        console.error(`   ❌ Error extracting ${material.originalName}:`, error.message);
        material.extractionStatus = 'failed';
        material.extractionError = error.message;
      }
    }

    await goal.save();
    console.log(`   📝 Total extracted text: ${allExtractedText.length} chars`);

    // If we have extracted text, proceed with AI analysis
    if (allExtractedText.trim()) {
      goal.aiProcessingStatus = 'analyzing';
      await goal.save();
      console.log('\n🤖 Starting AI analysis...');

      // Refine the goal
      try {
        console.log('   🎯 Refining goal...');
        const refined = await aiService.refineGoal(
          goal.title,
          goal.subject,
          goal.deadline,
          goal.materials.map(m => m.originalName)
        );
        goal.refinedTitle = refined.refinedGoal;
        console.log(`   ✅ Refined: "${refined.refinedGoal}"`);
      } catch (error) {
        console.error('   ❌ Goal refinement error:', error.message);
      }

      // Extract topics
      try {
        console.log('   📋 Extracting topics...');
        const topics = await aiService.extractTopics(
          allExtractedText,
          goal.subject,
          goal.title
        );
        goal.topics = topics;
        console.log(`   ✅ Extracted ${topics.length} topics`);
      } catch (error) {
        console.error('   ❌ Topic extraction error:', error.message);
      }

      await goal.save();

      // Generate initial content
      goal.aiProcessingStatus = 'generating';
      await goal.save();
      console.log('\n📝 Generating initial content...');

      await generateInitialContent(goal, allExtractedText);

      goal.aiProcessingStatus = 'completed';
      await goal.save();
      console.log('\n✅ AI processing completed for goal:', goal.title);
    } else {
      console.log('   ⚠️ No text extracted from materials');
      goal.aiProcessingStatus = 'failed';
      goal.aiProcessingError = 'No text could be extracted from materials';
      await goal.save();
    }

  } catch (error) {
    console.error('❌ Process materials error:', error);
    try {
      await Goal.findByIdAndUpdate(goalId, {
        aiProcessingStatus: 'failed',
        aiProcessingError: error.message
      });
    } catch (e) {
      console.error('Error updating goal status:', e);
    }
  }
}

// Delay between AI requests to avoid rate limits (Groq: 30 req/min = 2s minimum)
const AI_REQUEST_DELAY = 2500; // 2.5 seconds for safety margin
const INITIAL_TOPICS_COUNT = 2; // Only generate content for first 2 topics initially
const INITIAL_ESSAY_TOPICS = 1; // Only generate essays for first 1 topic initially

/**
 * Helper to wait with logging
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate initial notes and quizzes for the goal
 * Only generates for first 2 topics - users can generate more on-demand
 */
async function generateInitialContent(goal, extractedText) {
  try {
    // Track processed topics
    goal.contentGeneration = goal.contentGeneration || {};
    goal.contentGeneration.topicsWithContent = [];

    // Generate summary for the entire material
    console.log('   📋 Generating summary...');
    try {
      const summaryResult = await aiService.generateSummary(
        extractedText,
        goal.title,
        goal.subject
      );

      // summaryResult is an object: { title, content, keyPoints, quickReview }
      if (summaryResult && summaryResult.content) {
        await GeneratedContent.create({
          goal: goal._id,
          contentType: 'summary',
          textContent: {
            title: summaryResult.title || `Summary: ${goal.title}`,
            content: summaryResult.content,
            keyPoints: summaryResult.keyPoints || [],
            sections: []
          }
        });
        console.log('   ✅ Summary generated');
        goal.contentGeneration.summariesGenerated = true;
      } else {
        console.log('   ⚠️ Summary was empty, skipping');
      }
    } catch (error) {
      console.error('   ❌ Summary generation error:', error.message);
    }

    await delay(AI_REQUEST_DELAY);

    // Generate content for first 2 topics (notes + quiz + summary) and essays for first 1 topic
    const topicsToProcess = goal.topics.slice(0, INITIAL_TOPICS_COUNT);
    console.log(`   📚 Generating content for first ${topicsToProcess.length} of ${goal.topics.length} topics...`);
    console.log('   ℹ️  Users can generate content for remaining topics on-demand');

    for (let i = 0; i < topicsToProcess.length; i++) {
      const topic = topicsToProcess[i];
      console.log(`\n   📖 [${i + 1}/${topicsToProcess.length}] Topic: "${topic.name}"`);

      let topicHasContent = false;

      // Generate notes
      try {
        const notesResult = await aiService.generateNotes(
          extractedText,
          topic.name,
          goal.subject
        );

        // notesResult is an object: { title, content, keyPoints, sections }
        if (notesResult && notesResult.content) {
          await GeneratedContent.create({
            goal: goal._id,
            topic: topic.name,
            contentType: 'notes',
            textContent: {
              title: notesResult.title || `Notes: ${topic.name}`,
              content: notesResult.content,
              keyPoints: notesResult.keyPoints || [],
              sections: notesResult.sections || []
            }
          });
          console.log(`      ✅ Notes generated`);
          topicHasContent = true;
        } else {
          console.log(`      ⚠️ Notes were empty, skipping`);
        }
      } catch (error) {
        console.error(`      ❌ Notes error:`, error.message);
        // If rate limited, wait longer and continue
        if (error.status === 429 || error.message?.includes('rate')) {
          console.log('      ⏳ Rate limited, waiting 60s...');
          await delay(60000);
        }
      }

      await delay(AI_REQUEST_DELAY);

      // Generate quiz
      try {
        const quiz = await aiService.generateQuiz(
          extractedText,
          topic.name,
          goal.subject,
          'medium',
          10
        );

        if (quiz && quiz.questions && quiz.questions.length > 0) {
          await GeneratedContent.create({
            goal: goal._id,
            topic: topic.name,
            contentType: 'quiz',
            quizContent: quiz
          });
          console.log(`      ✅ Quiz generated (${quiz.questions.length} questions)`);
          topicHasContent = true;
        } else {
          console.log(`      ⚠️ Quiz was empty, skipping`);
        }
      } catch (error) {
        console.error(`      ❌ Quiz error:`, error.message);
        if (error.status === 429 || error.message?.includes('rate')) {
          console.log('      ⏳ Rate limited, waiting 60s...');
          await delay(60000);
        }
      }

      await delay(AI_REQUEST_DELAY);

      // Generate per-topic summary
      try {
        const topicSummaryResult = await aiService.generateSummary(
          extractedText,
          topic.name,
          goal.subject
        );

        if (topicSummaryResult && topicSummaryResult.content) {
          await GeneratedContent.create({
            goal: goal._id,
            topic: topic.name,
            contentType: 'summary',
            textContent: {
              title: topicSummaryResult.title || `Summary: ${topic.name}`,
              content: topicSummaryResult.content,
              keyPoints: topicSummaryResult.keyPoints || [],
              sections: []
            }
          });
          console.log(`      ✅ Topic summary generated`);
          topicHasContent = true;
        } else {
          console.log(`      ⚠️ Topic summary was empty, skipping`);
        }
      } catch (error) {
        console.error(`      ❌ Topic summary error:`, error.message);
        if (error.status === 429 || error.message?.includes('rate')) {
          console.log('      ⏳ Rate limited, waiting 60s...');
          await delay(60000);
        }
      }

      await delay(AI_REQUEST_DELAY);

      // Generate essay questions (only for first topic)
      if (i < INITIAL_ESSAY_TOPICS) {
        try {
          const essayResult = await aiService.generateEssayQuestions(
            extractedText,
            topic.name,
            goal.subject,
            'medium',
            5
          );

          if (essayResult && essayResult.questions && essayResult.questions.length > 0) {
            await GeneratedContent.create({
              goal: goal._id,
              topic: topic.name,
              contentType: 'essay',
              essayContent: essayResult
            });
            console.log(`      ✅ Essay questions generated (${essayResult.questions.length} questions)`);
            topicHasContent = true;
          } else {
            console.log(`      ⚠️ Essay questions were empty, skipping`);
          }
        } catch (error) {
          console.error(`      ❌ Essay error:`, error.message);
          if (error.status === 429 || error.message?.includes('rate')) {
            console.log('      ⏳ Rate limited, waiting 60s...');
            await delay(60000);
          }
        }

        await delay(AI_REQUEST_DELAY);
      }

      // Track which topics have content
      if (topicHasContent) {
        goal.contentGeneration.topicsWithContent.push(topic.name);
      }

      // Delay before next topic (if not the last one)
      if (i < topicsToProcess.length - 1) {
        await delay(AI_REQUEST_DELAY);
      }
    }

    goal.contentGeneration.notesGenerated = true;
    goal.contentGeneration.quizzesGenerated = true;
    goal.contentGeneration.summariesGenerated = true;
    goal.contentGeneration.essaysGenerated = true;
    goal.contentGeneration.initialTopicsProcessed = topicsToProcess.length;
    goal.contentGeneration.totalTopics = goal.topics.length;
    await goal.save();

    console.log(`\n   ✅ Initial content generation complete`);
    console.log(`      Topics with content: ${goal.contentGeneration.topicsWithContent.length}/${goal.topics.length}`);
    console.log(`      Remaining topics available for on-demand generation: ${goal.topics.length - topicsToProcess.length}`);
  } catch (error) {
    console.error('❌ Generate initial content error:', error.message);
    throw error;
  }
}

// ==================== CONTENT GENERATION ====================

/**
 * Generate notes for a specific topic
 */
exports.generateTopicNotes = async (req, res) => {
  try {
    const { goalId } = req.params;
    const { topicName } = req.body;
    const userId = req.user._id;

    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Check if notes already exist
    const existing = await GeneratedContent.findOne({
      goal: goalId,
      topic: topicName,
      contentType: 'notes',
      status: 'active'
    });

    if (existing) {
      return res.json({
        success: true,
        message: 'Notes already exist for this topic',
        data: existing
      });
    }

    // Get extracted text
    const extractedText = goal.materials
      .filter(m => m.extractedText)
      .map(m => m.extractedText)
      .join('\n\n');

    if (!extractedText) {
      return res.status(400).json({
        success: false,
        message: 'No extracted text available for content generation'
      });
    }

    // Fetch knowledge context for adaptive content generation
    let knowledgeContext = '';
    try {
      knowledgeContext = await knowledgeService.getKnowledgeContext(goalId, topicName);
    } catch (e) { /* non-critical */ }

    const notesResult = await aiService.generateNotes(
      extractedText,
      topicName,
      goal.subject,
      knowledgeContext
    );

    // notesResult is an object: { title, content, keyPoints, sections }
    if (!notesResult || !notesResult.content) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate notes content'
      });
    }

    const content = await GeneratedContent.create({
      goal: goalId,
      topic: topicName,
      contentType: 'notes',
      textContent: {
        title: notesResult.title || `Notes: ${topicName}`,
        content: notesResult.content,
        keyPoints: notesResult.keyPoints || [],
        sections: notesResult.sections || []
      }
    });

    res.json({
      success: true,
      message: 'Notes generated successfully',
      data: content
    });
  } catch (error) {
    console.error('Generate notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate notes',
      error: error.message
    });
  }
};

/**
 * Generate summary for a specific topic
 */
exports.generateTopicSummary = async (req, res) => {
  try {
    const { goalId } = req.params;
    const { topicName } = req.body;
    const userId = req.user._id;

    if (!topicName) {
      return res.status(400).json({ success: false, message: 'Topic name is required' });
    }

    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    // Check if summary already exists for this topic
    const existing = await GeneratedContent.findOne({
      goal: goalId,
      topic: topicName,
      contentType: 'summary',
      status: 'active'
    });

    if (existing) {
      return res.json({ success: true, message: 'Summary already exists', data: existing });
    }

    const extractedText = goal.materials
      .filter(m => m.extractedText)
      .map(m => m.extractedText)
      .join('\n\n');

    if (!extractedText) {
      return res.status(400).json({ success: false, message: 'No extracted text available' });
    }

    // Fetch knowledge context for adaptive content generation
    let knowledgeContext = '';
    try {
      knowledgeContext = await knowledgeService.getKnowledgeContext(goalId, topicName);
    } catch (e) { /* non-critical */ }

    const summaryResult = await aiService.generateSummary(extractedText, topicName, goal.subject, knowledgeContext);

    if (!summaryResult || !summaryResult.content) {
      return res.status(500).json({ success: false, message: 'Failed to generate summary content' });
    }

    const content = await GeneratedContent.create({
      goal: goalId,
      topic: topicName,
      contentType: 'summary',
      textContent: {
        title: summaryResult.title || `Summary: ${topicName}`,
        content: summaryResult.content,
        keyPoints: summaryResult.keyPoints || [],
        sections: []
      }
    });

    res.json({ success: true, message: 'Summary generated successfully', data: content });
  } catch (error) {
    console.error('Generate summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate summary', error: error.message });
  }
};

/**
 * Generate quiz for a specific topic
 */
exports.generateTopicQuiz = async (req, res) => {
  try {
    const { goalId } = req.params;
    const { topicName, difficulty = 'medium', questionCount = 10 } = req.body;
    const userId = req.user._id;

    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Get extracted text
    const extractedText = goal.materials
      .filter(m => m.extractedText)
      .map(m => m.extractedText)
      .join('\n\n');

    if (!extractedText) {
      return res.status(400).json({
        success: false,
        message: 'No extracted text available for content generation'
      });
    }

    // Fetch knowledge context for adaptive quiz generation
    let knowledgeContext = '';
    try {
      knowledgeContext = await knowledgeService.getKnowledgeContext(goalId, topicName);
    } catch (e) { /* non-critical */ }

    // Auto-select difficulty from topic's knowledge-driven difficulty level
    const topic = goal.topics.find(t => t.name === topicName);
    const adaptiveDifficulty = topic?.difficultyLevel || difficulty;

    const quiz = await aiService.generateQuiz(
      extractedText,
      topicName,
      goal.subject,
      adaptiveDifficulty,
      Math.min(questionCount, 20),
      knowledgeContext
    );

    const content = await GeneratedContent.create({
      goal: goalId,
      topic: topicName,
      contentType: 'quiz',
      quizContent: quiz,
      currentDifficulty: difficulty
    });

    res.json({
      success: true,
      message: 'Quiz generated successfully',
      data: content
    });
  } catch (error) {
    console.error('Generate quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate quiz',
      error: error.message
    });
  }
};

/**
 * Generate essay questions for a topic
 */
exports.generateTopicEssay = async (req, res) => {
  try {
    const { goalId } = req.params;
    const { topicName, difficulty = 'medium', questionCount = 5 } = req.body;
    const userId = req.user._id;

    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    const extractedText = goal.materials
      .filter(m => m.extractedText)
      .map(m => m.extractedText)
      .join('\n\n');

    if (!extractedText) {
      return res.status(400).json({
        success: false,
        message: 'No extracted text available for content generation'
      });
    }

    // Fetch knowledge context for adaptive essay generation
    let knowledgeContext = '';
    try {
      knowledgeContext = await knowledgeService.getKnowledgeContext(goalId, topicName);
    } catch (e) { /* non-critical */ }

    const essay = await aiService.generateEssayQuestions(
      extractedText,
      topicName,
      goal.subject,
      difficulty,
      Math.min(questionCount, 10),
      knowledgeContext
    );

    const content = await GeneratedContent.create({
      goal: goalId,
      topic: topicName,
      contentType: 'essay',
      essayContent: essay
    });

    res.json({
      success: true,
      message: 'Essay questions generated successfully',
      data: content
    });
  } catch (error) {
    console.error('Generate essay error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate essay questions',
      error: error.message
    });
  }
};

/**
 * Generate ALL content for a specific topic (notes, quiz, essay)
 * This is the on-demand endpoint for topics beyond the initial 2
 */
exports.generateTopicContent = async (req, res) => {
  try {
    const { goalId } = req.params;
    const { topicName, includeEssay = false } = req.body;
    const userId = req.user._id;

    if (!topicName) {
      return res.status(400).json({
        success: false,
        message: 'Topic name is required'
      });
    }

    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Check if topic exists in goal
    const topicExists = goal.topics.some(t => t.name === topicName);
    if (!topicExists) {
      return res.status(400).json({
        success: false,
        message: 'Topic not found in this goal'
      });
    }

    const extractedText = goal.materials
      .filter(m => m.extractedText)
      .map(m => m.extractedText)
      .join('\n\n');

    if (!extractedText) {
      return res.status(400).json({
        success: false,
        message: 'No extracted text available for content generation'
      });
    }

    const results = {
      notes: null,
      quiz: null,
      essay: null
    };
    const errors = [];

    // Check existing content
    const existingContent = await GeneratedContent.find({
      goal: goalId,
      topic: topicName,
      status: 'active'
    });

    const hasNotes = existingContent.some(c => c.contentType === 'notes');
    const hasQuiz = existingContent.some(c => c.contentType === 'quiz');
    const hasEssay = existingContent.some(c => c.contentType === 'essay');

    console.log(`\n📚 Generating content for topic: "${topicName}"`);
    console.log(`   Existing: notes=${hasNotes}, quiz=${hasQuiz}, essay=${hasEssay}`);

    // Fetch knowledge context for adaptive content generation
    let knowledgeContext = '';
    try {
      knowledgeContext = await knowledgeService.getKnowledgeContext(goalId, topicName);
      console.log('   🧠 Knowledge context loaded for adaptive generation');
    } catch (e) { /* non-critical */ }

    // Generate notes if not exists
    if (!hasNotes) {
      try {
        console.log('   📝 Generating notes...');
        const notesResult = await aiService.generateNotes(extractedText, topicName, goal.subject, knowledgeContext);

        // notesResult is an object: { title, content, keyPoints, sections }
        if (notesResult && notesResult.content) {
          results.notes = await GeneratedContent.create({
            goal: goalId,
            topic: topicName,
            contentType: 'notes',
            textContent: {
              title: notesResult.title || `Notes: ${topicName}`,
              content: notesResult.content,
              keyPoints: notesResult.keyPoints || [],
              sections: notesResult.sections || []
            }
          });
          console.log('   ✅ Notes generated');
        }
        await delay(AI_REQUEST_DELAY);
      } catch (error) {
        console.error('   ❌ Notes error:', error.message);
        errors.push({ type: 'notes', error: error.message });
        if (error.status === 429) await delay(60000);
      }
    } else {
      results.notes = existingContent.find(c => c.contentType === 'notes');
      console.log('   ℹ️ Notes already exist');
    }

    // Generate quiz if not exists
    if (!hasQuiz) {
      try {
        console.log('   📝 Generating quiz...');
        const quiz = await aiService.generateQuiz(extractedText, topicName, goal.subject, 'medium', 10, knowledgeContext);

        if (quiz && quiz.questions && quiz.questions.length > 0) {
          results.quiz = await GeneratedContent.create({
            goal: goalId,
            topic: topicName,
            contentType: 'quiz',
            quizContent: quiz
          });
          console.log(`   ✅ Quiz generated (${quiz.questions.length} questions)`);
        }
        await delay(AI_REQUEST_DELAY);
      } catch (error) {
        console.error('   ❌ Quiz error:', error.message);
        errors.push({ type: 'quiz', error: error.message });
        if (error.status === 429) await delay(60000);
      }
    } else {
      results.quiz = existingContent.find(c => c.contentType === 'quiz');
      console.log('   ℹ️ Quiz already exists');
    }

    // Generate essay if requested and not exists
    if (includeEssay && !hasEssay) {
      try {
        console.log('   📝 Generating essay questions...');
        const essay = await aiService.generateEssayQuestions(extractedText, topicName, goal.subject, 'medium', 5, knowledgeContext);

        if (essay && essay.questions && essay.questions.length > 0) {
          results.essay = await GeneratedContent.create({
            goal: goalId,
            topic: topicName,
            contentType: 'essay',
            essayContent: essay
          });
          console.log(`   ✅ Essay questions generated (${essay.questions.length} questions)`);
        }
      } catch (error) {
        console.error('   ❌ Essay error:', error.message);
        errors.push({ type: 'essay', error: error.message });
      }
    } else if (hasEssay) {
      results.essay = existingContent.find(c => c.contentType === 'essay');
    }

    // Update goal's content tracking
    if (!goal.contentGeneration) goal.contentGeneration = {};
    if (!goal.contentGeneration.topicsWithContent) goal.contentGeneration.topicsWithContent = [];

    if (!goal.contentGeneration.topicsWithContent.includes(topicName)) {
      goal.contentGeneration.topicsWithContent.push(topicName);
      await goal.save();
    }

    console.log(`   ✅ Content generation complete for "${topicName}"`);

    res.json({
      success: true,
      message: `Content generated for topic: ${topicName}`,
      data: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Generate topic content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate topic content',
      error: error.message
    });
  }
};

// ==================== ADAPTIVE REGENERATION (ML) ====================

/**
 * Regenerate content at the user's current knowledge level
 * Archives old content and generates fresh content with knowledge context
 */
exports.regenerateContent = async (req, res) => {
  try {
    const { goalId } = req.params;
    const { topicName, contentType } = req.body;
    const userId = req.user._id;

    if (!topicName || !contentType) {
      return res.status(400).json({
        success: false,
        message: 'topicName and contentType are required'
      });
    }

    const allowedTypes = ['notes', 'quiz', 'essay', 'summary'];
    if (!allowedTypes.includes(contentType)) {
      return res.status(400).json({
        success: false,
        message: `contentType must be one of: ${allowedTypes.join(', ')}`
      });
    }

    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    const extractedText = goal.materials
      .filter(m => m.extractedText)
      .map(m => m.extractedText)
      .join('\n\n');

    if (!extractedText) {
      return res.status(400).json({ success: false, message: 'No extracted text available' });
    }

    // Archive existing content for this topic + type
    await GeneratedContent.updateMany(
      { goal: goalId, topic: topicName, contentType, status: 'active' },
      { $set: { status: 'archived' } }
    );

    // Fetch knowledge context
    let knowledgeContext = '';
    try {
      knowledgeContext = await knowledgeService.getKnowledgeContext(goalId, topicName);
    } catch (e) { /* non-critical */ }

    // Get adaptive difficulty from topic
    const topic = goal.topics.find(t => t.name === topicName);
    const adaptiveDifficulty = topic?.difficultyLevel || 'medium';

    let result;
    switch (contentType) {
      case 'notes': {
        const notesResult = await aiService.generateNotes(extractedText, topicName, goal.subject, knowledgeContext);
        if (notesResult?.content) {
          result = await GeneratedContent.create({
            goal: goalId, topic: topicName, contentType: 'notes',
            textContent: { title: notesResult.title, content: notesResult.content, keyPoints: notesResult.keyPoints || [], sections: notesResult.sections || [] }
          });
        }
        break;
      }
      case 'quiz': {
        const quiz = await aiService.generateQuiz(extractedText, topicName, goal.subject, adaptiveDifficulty, 10, knowledgeContext);
        if (quiz?.questions?.length > 0) {
          result = await GeneratedContent.create({
            goal: goalId, topic: topicName, contentType: 'quiz',
            quizContent: quiz, currentDifficulty: adaptiveDifficulty
          });
        }
        break;
      }
      case 'essay': {
        const essay = await aiService.generateEssayQuestions(extractedText, topicName, goal.subject, adaptiveDifficulty, 5, knowledgeContext);
        if (essay?.questions?.length > 0) {
          result = await GeneratedContent.create({
            goal: goalId, topic: topicName, contentType: 'essay',
            essayContent: essay
          });
        }
        break;
      }
      case 'summary': {
        const summaryResult = await aiService.generateSummary(extractedText, topicName, goal.subject, knowledgeContext);
        if (summaryResult?.content) {
          result = await GeneratedContent.create({
            goal: goalId, topic: topicName, contentType: 'summary',
            textContent: { title: summaryResult.title, content: summaryResult.content, keyPoints: summaryResult.keyPoints || [], sections: [] }
          });
        }
        break;
      }
    }

    if (!result) {
      return res.status(500).json({ success: false, message: 'Failed to regenerate content' });
    }

    res.json({
      success: true,
      message: `${contentType} regenerated at your current knowledge level`,
      data: result
    });
  } catch (error) {
    console.error('Regenerate content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate content',
      error: error.message
    });
  }
};

// ==================== QUIZ & PROGRESS ====================

/**
 * Submit quiz attempt
 */
exports.submitQuizAttempt = async (req, res) => {
  try {
    const { contentId } = req.params;
    const { answers, timeTaken } = req.body;
    const userId = req.user._id;

    const content = await GeneratedContent.findById(contentId);
    if (!content || content.contentType !== 'quiz') {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Verify goal ownership
    const goal = await Goal.findOne({ _id: content.goal, user: userId });
    if (!goal) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Grade the quiz
    const questions = content.quizContent.questions;
    let correctCount = 0;
    const gradedAnswers = answers.map(answer => {
      const question = questions.find(q => q._id.toString() === answer.questionId);
      if (!question) return { ...answer, isCorrect: false };

      const correctOption = question.options.findIndex(o => o.isCorrect);
      const isCorrect = answer.selectedOption === correctOption;
      if (isCorrect) correctCount++;

      return {
        questionId: answer.questionId,
        selectedOption: answer.selectedOption,
        isCorrect,
        timeTaken: answer.timeTaken
      };
    });

    const percentage = Math.round((correctCount / questions.length) * 100);

    const attemptData = {
      answers: gradedAnswers,
      score: correctCount,
      totalQuestions: questions.length,
      percentage,
      timeTaken
    };

    await content.recordQuizAttempt(attemptData);

    // Update topic progress in goal
    const topic = goal.topics.find(t => t.name === content.topic);
    if (topic) {
      topic.quizAttempts++;
      topic.lastQuizScore = percentage;
      topic.averageScore = topic.averageScore
        ? Math.round((topic.averageScore + percentage) / 2)
        : percentage;

      // Update progress based on quiz performance
      if (percentage >= 70) {
        topic.progress = Math.min(100, topic.progress + 10);
      }

      await goal.updateProgress();
    }

    // Calculate XP earned
    const xpEarned = Math.round(percentage / 10) * 5; // 5 XP per 10% score
    goal.xpEarned += xpEarned;
    await goal.save();

    // --- Log activity for ML knowledge state ---
    try {
      await ActivityLog.create({
        user: userId,
        goal: content.goal,
        topicName: content.topic,
        activityType: 'quiz_attempt',
        data: {
          score: percentage,
          totalQuestions: questions.length,
          correctCount,
          timeTaken,
          difficulty: content.currentDifficulty || 'medium',
          questionResults: gradedAnswers.map(a => {
            const q = questions.find(q => q._id.toString() === a.questionId);
            return {
              questionId: a.questionId,
              isCorrect: a.isCorrect,
              timeTaken: a.timeTaken,
              difficulty: q?.difficulty || content.currentDifficulty || 'medium'
            };
          })
        }
      });
    } catch (logErr) {
      console.error('ActivityLog (quiz) error:', logErr.message);
    }

    // Fire-and-forget: update knowledge state
    knowledgeService.updateGoalLearningProfile(content.goal).catch(e =>
      console.error('Knowledge state update error:', e.message)
    );

    // Fire-and-forget: retrain predictive model
    predictiveModel.trainQuizPassModel(content.goal).catch(e =>
      console.error('Predictive model training error:', e.message)
    );

    // Get recommended next difficulty
    const recommendedDifficulty = content.getRecommendedDifficulty();

    // --- Fire-and-forget: Update gamification ---
    gamificationService.addXP(userId, 'quiz', xpEarned).then(() => {
      gamificationService.updateActivityStats(userId, { quizzesCompleted: 1, quizAvgScore: percentage }).catch(e =>
        console.error('Update activity stats error:', e.message)
      );
      gamificationService.evaluateAchievements(userId).catch(e =>
        console.error('Evaluate achievements error:', e.message)
      );
    }).catch(e =>
      console.error('Add XP error:', e.message)
    );

    res.json({
      success: true,
      message: 'Quiz submitted successfully',
      data: {
        score: correctCount,
        total: questions.length,
        percentage,
        xpEarned,
        recommendedDifficulty,
        answers: gradedAnswers.map((a, i) => ({
          ...a,
          correctOption: questions[i]?.options.findIndex(o => o.isCorrect),
          explanation: questions[i]?.explanation
        }))
      }
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit quiz',
      error: error.message
    });
  }
};

/**
 * Update topic progress
 */
exports.updateTopicProgress = async (req, res) => {
  try {
    const { goalId, topicId } = req.params;
    const { progress, status } = req.body;
    const userId = req.user._id;

    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    const topic = goal.topics.id(topicId);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found'
      });
    }

    if (progress !== undefined) {
      topic.progress = Math.min(100, Math.max(0, progress));
    }
    if (status) {
      topic.status = status;
    }

    await goal.updateProgress();

    res.json({
      success: true,
      message: 'Topic progress updated',
      data: goal
    });
  } catch (error) {
    console.error('Update topic progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update progress',
      error: error.message
    });
  }
};

// ==================== CONTENT RETRIEVAL ====================

/**
 * Get notes for a goal
 */
exports.getGoalNotes = async (req, res) => {
  try {
    const { goalId } = req.params;
    const { topic } = req.query;
    const userId = req.user._id;

    // Verify ownership
    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    const query = { goal: goalId, contentType: 'notes', status: 'active' };
    if (topic) {
      query.topic = topic;
    }

    const notes = await GeneratedContent.find(query).sort({ topic: 1 });

    res.json({
      success: true,
      data: notes
    });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notes',
      error: error.message
    });
  }
};

/**
 * Get quizzes for a goal
 */
exports.getGoalQuizzes = async (req, res) => {
  try {
    const { goalId } = req.params;
    const { topic } = req.query;
    const userId = req.user._id;

    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    const query = { goal: goalId, contentType: 'quiz', status: 'active' };
    if (topic) {
      query.topic = topic;
    }

    const quizzes = await GeneratedContent.find(query)
      .select('-quizContent.questions.explanation') // Hide explanations
      .sort({ topic: 1 });

    res.json({
      success: true,
      data: quizzes
    });
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quizzes',
      error: error.message
    });
  }
};

/**
 * Get summaries for a goal
 */
exports.getGoalSummaries = async (req, res) => {
  try {
    const { goalId } = req.params;
    const userId = req.user._id;

    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    const summaries = await GeneratedContent.find({
      goal: goalId,
      contentType: 'summary',
      status: 'active'
    }).sort({ topic: 1 });

    res.json({
      success: true,
      data: summaries
    });
  } catch (error) {
    console.error('Get summaries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch summaries',
      error: error.message
    });
  }
};

/**
 * Get essay questions for a goal
 */
exports.getGoalEssays = async (req, res) => {
  try {
    const { goalId } = req.params;
    const { topic } = req.query;
    const userId = req.user._id;

    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    const query = { goal: goalId, contentType: 'essay', status: 'active' };
    if (topic) {
      query.topic = topic;
    }

    const essays = await GeneratedContent.find(query).sort({ topic: 1 });

    res.json({
      success: true,
      data: essays
    });
  } catch (error) {
    console.error('Get essays error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch essays',
      error: error.message
    });
  }
};

/**
 * Submit an essay answer and get AI feedback
 */
exports.submitEssayAnswer = async (req, res) => {
  try {
    const { contentId } = req.params;
    const { questionId, userAnswer } = req.body;
    const userId = req.user._id;

    if (!questionId || !userAnswer || !userAnswer.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Question ID and answer are required'
      });
    }

    const content = await GeneratedContent.findById(contentId);
    if (!content || content.contentType !== 'essay') {
      return res.status(404).json({
        success: false,
        message: 'Essay content not found'
      });
    }

    // Verify goal ownership
    const goal = await Goal.findOne({ _id: content.goal, user: userId });
    if (!goal) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Find the question
    const question = content.essayContent.questions.find(
      q => q._id.toString() === questionId
    );
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if already answered
    const alreadyAnswered = content.essayAnswers.find(
      a => a.questionId?.toString() === questionId
    );
    if (alreadyAnswered) {
      return res.json({
        success: true,
        message: 'Already answered',
        data: alreadyAnswered
      });
    }

    // Grade with AI
    console.log(`📝 Grading essay answer for question: "${question.question.substring(0, 50)}..."`);
    const aiFeedback = await aiService.gradeEssayAnswer(
      question.question,
      question.sampleAnswer || '',
      userAnswer,
      question.keyPoints || []
    );

    const answerData = {
      questionId: question._id,
      userAnswer: userAnswer.trim(),
      aiFeedback: {
        score: aiFeedback.score || 0,
        feedback: aiFeedback.feedback || '',
        strengths: aiFeedback.strengths || [],
        improvements: aiFeedback.improvements || []
      }
    };

    await content.recordEssayAnswer(answerData);

    // Update topic progress
    const topic = goal.topics.find(t => t.name === content.topic);
    if (topic) {
      const score = aiFeedback.score || 0;
      if (score >= 60) {
        topic.progress = Math.min(100, topic.progress + 5);
      }
      await goal.updateProgress();
    }

    // Award XP
    const xpEarned = Math.round((aiFeedback.score || 0) / 10) * 3;
    goal.xpEarned = (goal.xpEarned || 0) + xpEarned;
    await goal.save();

    // --- Log activity for ML knowledge state ---
    try {
      await ActivityLog.create({
        user: userId,
        goal: content.goal,
        topicName: content.topic,
        activityType: 'essay_submission',
        data: {
          score: aiFeedback.score || 0,
          totalQuestions: 1,
          timeTaken: null,
          difficulty: question.difficulty || 'medium'
        }
      });
    } catch (logErr) {
      console.error('ActivityLog (essay) error:', logErr.message);
    }

    // Fire-and-forget: update knowledge state
    knowledgeService.updateGoalLearningProfile(content.goal).catch(e =>
      console.error('Knowledge state update error:', e.message)
    );

    console.log(`✅ Essay graded: ${aiFeedback.score}% | XP: +${xpEarned}`);

    // --- Fire-and-forget: Update gamification ---
    gamificationService.addXP(userId, 'essay', xpEarned).then(() => {
      gamificationService.updateActivityStats(userId, { essaysSubmitted: 1 }).catch(e =>
        console.error('Update activity stats error:', e.message)
      );
      gamificationService.evaluateAchievements(userId).catch(e =>
        console.error('Evaluate achievements error:', e.message)
      );
    }).catch(e =>
      console.error('Add XP error:', e.message)
    );

    res.json({
      success: true,
      message: 'Essay answer submitted and graded',
      data: {
        ...answerData,
        xpEarned
      }
    });
  } catch (error) {
    console.error('Submit essay error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit essay answer',
      error: error.message
    });
  }
};

/**
 * Get study recommendation
 */
exports.getStudyRecommendation = async (req, res) => {
  try {
    const { goalId } = req.params;
    const userId = req.user._id;

    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    const recommendation = await aiService.getStudyRecommendation(
      goal.topics,
      goal.learningProfile,
      goal.daysRemaining
    );

    res.json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    console.error('Get recommendation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendation',
      error: error.message
    });
  }
};

// ==================== ACTIVITY TRACKING (ML) ====================

/**
 * Track a learning activity (note view, summary view, time spent, flashcard review)
 * Used by the frontend to log engagement for the knowledge state engine.
 */
exports.trackActivity = async (req, res) => {
  try {
    const { goalId } = req.params;
    const { topicName, activityType, data } = req.body;
    const userId = req.user._id;

    if (!topicName || !activityType) {
      return res.status(400).json({
        success: false,
        message: 'topicName and activityType are required'
      });
    }

    // Validate activityType
    const allowedTypes = ['note_view', 'summary_view', 'flashcard_review', 'note_time_spent', 'summary_time_spent', 'note_completed', 'summary_completed'];
    if (!allowedTypes.includes(activityType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid activityType. Allowed: ${allowedTypes.join(', ')}`
      });
    }

    // Verify goal ownership
    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    const logEntry = await ActivityLog.create({
      user: userId,
      goal: goalId,
      topicName,
      activityType,
      data: {
        duration: data?.duration || null,
        cardsReviewed: data?.cardsReviewed || null,
        cardsMastered: data?.cardsMastered || null,
        scrollPercent: data?.scrollPercent || null
      }
    });

    res.json({
      success: true,
      message: 'Activity tracked',
      data: logEntry
    });

    // Fire-and-forget: mark content as read when completed
    if (activityType === 'note_completed' || activityType === 'summary_completed') {
      const contentType = activityType === 'note_completed' ? 'notes' : 'summary';
      GeneratedContent.findOneAndUpdate(
        { goal: goalId, topic: topicName, contentType, status: 'active', 'readBy.userId': { $ne: userId } },
        { $push: { readBy: { userId, duration: data?.duration || 0, scrollPercent: data?.scrollPercent || 0 } } }
      ).catch(e => console.error('Mark content read error:', e.message));
    }

    // Fire-and-forget: update knowledge state
    knowledgeService.updateGoalLearningProfile(goalId).catch(e =>
      console.error('Knowledge state update error:', e.message)
    );
  } catch (error) {
    console.error('Track activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track activity',
      error: error.message
    });
  }
};

// ==================== KNOWLEDGE STATE (ML) ====================

/**
 * Get the current knowledge state for a goal
 */
exports.getKnowledgeState = async (req, res) => {
  try {
    const { goalId } = req.params;
    const userId = req.user._id;

    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Calculate fresh knowledge state
    const knowledgeState = await knowledgeService.calculateGoalKnowledge(goalId);

    // Cache the result on the goal document
    goal.knowledgeState = {
      overallScore: knowledgeState.overallScore,
      overallTrend: knowledgeState.overallTrend,
      coverage: knowledgeState.coverage,
      topicScores: new Map(
        Object.entries(knowledgeState.topicScores).map(([name, data]) => [
          name,
          {
            score: data.score,
            level: data.level,
            quizAttempts: data.details.quizAttempts,
            avgQuizScore: data.details.avgQuizScore,
            trend: data.details.trend
          }
        ])
      ),
      calculatedAt: new Date()
    };
    await goal.save();

    res.json({
      success: true,
      data: knowledgeState
    });
  } catch (error) {
    console.error('Get knowledge state error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get knowledge state',
      error: error.message
    });
  }
};

// ==================== PREDICTIONS (ML) ====================

/**
 * Get ML predictions for a goal (quiz pass probability + exam readiness)
 */
exports.getPredictions = async (req, res) => {
  try {
    const { goalId } = req.params;
    const userId = req.user._id;

    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    const predictions = await predictiveModel.getPredictions(goalId);

    res.json({
      success: true,
      data: predictions
    });
  } catch (error) {
    console.error('Get predictions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get predictions',
      error: error.message
    });
  }
};

// ==================== DIFFICULTY SUGGESTIONS (ML) ====================

/**
 * Get adaptive difficulty suggestions based on recent quiz/essay performance.
 * Returns an array of per-topic suggestions (harder/easier).
 */
exports.getDifficultySuggestions = async (req, res) => {
  try {
    const { goalId } = req.params;
    const userId = req.user._id;

    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    const suggestions = await difficultyAnalyzer.analyze(goalId);

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Get difficulty suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get difficulty suggestions',
      error: error.message
    });
  }
};

// ==================== TOPIC ANALYTICS ====================

/**
 * Get detailed per-topic analytics: reading status, quiz stats, engagement.
 */
exports.getTopicAnalytics = async (req, res) => {
  try {
    const { goalId } = req.params;
    const userId = req.user._id;

    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    // Fetch all active content for this goal
    const allContent = await GeneratedContent.find({ goal: goalId, status: 'active' });

    // Fetch all activity logs for this goal
    const allLogs = await ActivityLog.find({ goal: goalId });

    const analytics = {};

    for (const topic of goal.topics) {
      const topicName = topic.name;
      const topicContent = allContent.filter(c => c.topic === topicName);
      const topicLogs = allLogs.filter(l => l.topicName === topicName);

      // Notes stats
      const notes = topicContent.filter(c => c.contentType === 'notes');
      const notesRead = notes.filter(n => n.readBy?.some(r => r.userId?.toString() === userId.toString())).length;
      const noteTimeLogs = topicLogs.filter(l => l.activityType === 'note_time_spent');
      const totalNoteTime = noteTimeLogs.reduce((sum, l) => sum + (l.data?.duration || 0), 0);

      // Summaries stats
      const summaries = topicContent.filter(c => c.contentType === 'summary');
      const summariesRead = summaries.filter(s => s.readBy?.some(r => r.userId?.toString() === userId.toString())).length;
      const summaryTimeLogs = topicLogs.filter(l => l.activityType === 'summary_time_spent');
      const totalSummaryTime = summaryTimeLogs.reduce((sum, l) => sum + (l.data?.duration || 0), 0);

      // Quiz stats
      const quizLogs = topicLogs.filter(l => l.activityType === 'quiz_attempt');
      const quizScores = quizLogs.map(l => l.data?.score || 0);
      const avgQuizScore = quizScores.length > 0
        ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
        : 0;
      const bestQuizScore = quizScores.length > 0 ? Math.max(...quizScores) : 0;

      // Quiz trend
      let quizTrend = 'stable';
      if (quizScores.length >= 3) {
        const recent = quizScores.slice(-2);
        const older = quizScores.slice(-4, -2);
        if (older.length > 0) {
          const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
          const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
          if (recentAvg > olderAvg + 5) quizTrend = 'improving';
          else if (recentAvg < olderAvg - 5) quizTrend = 'declining';
        }
      }

      // Essay stats
      const essayLogs = topicLogs.filter(l => l.activityType === 'essay_submission');
      const essayScores = essayLogs.map(l => l.data?.score || 0);
      const avgEssayScore = essayScores.length > 0
        ? Math.round(essayScores.reduce((a, b) => a + b, 0) / essayScores.length)
        : 0;

      // Last activity
      const lastLog = topicLogs.length > 0
        ? topicLogs.reduce((latest, l) => l.createdAt > latest.createdAt ? l : latest)
        : null;

      // Engagement score (composite)
      const engagementScore = Math.min(100, Math.round(
        (notesRead > 0 ? 15 : 0) +
        (summariesRead > 0 ? 10 : 0) +
        Math.min(25, (totalNoteTime + totalSummaryTime) / 60 * 2) + // up to 25 for reading time
        Math.min(30, quizLogs.length * 10) + // up to 30 for quizzes
        Math.min(20, essayLogs.length * 10)  // up to 20 for essays
      ));

      analytics[topicName] = {
        notes: { total: notes.length, read: notesRead, totalReadingTime: totalNoteTime },
        summaries: { total: summaries.length, read: summariesRead, totalReadingTime: totalSummaryTime },
        quizzes: { attempts: quizLogs.length, avgScore: avgQuizScore, bestScore: bestQuizScore, trend: quizTrend },
        essays: { submissions: essayLogs.length, avgScore: avgEssayScore },
        totalStudyTime: totalNoteTime + totalSummaryTime,
        engagementScore,
        lastActivity: lastLog?.createdAt || null,
        needsAttention: engagementScore < 20 && quizLogs.length < 2
      };
    }

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get topic analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get topic analytics',
      error: error.message
    });
  }
};
