const Material = require('../models/Material');
const Comment = require('../models/Comment');
const path = require('path');
const fs = require('fs');

// Upload a new material
exports.uploadMaterial = async (req, res) => {
  try {
    const { title, description, subject, materialType, visibility, tags } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    // Parse tags if it's a string
    let parsedTags = [];
    if (tags) {
      parsedTags = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim().toLowerCase()) : tags;
    }

    const material = new Material({
      title,
      description,
      subject,
      materialType,
      visibility: visibility || 'public',
      tags: parsedTags,
      author: req.user._id,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      }
    });

    await material.save();
    await material.populate('author', 'username email profilePicture university');

    res.status(201).json({
      success: true,
      message: 'Material uploaded successfully',
      data: material
    });
  } catch (error) {
    // Clean up uploaded file if material creation fails
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    
    console.error('Upload material error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload material',
      error: error.message
    });
  }
};

// Get all materials with search, sort, and filter
exports.getMaterials = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      subject,
      materialType,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      author
    } = req.query;

    // Build query
    const query = { status: 'active', visibility: 'public' };

    // Search in title, description, tags
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by subject
    if (subject) {
      query.subject = { $regex: subject, $options: 'i' };
    }

    // Filter by material type
    if (materialType) {
      query.materialType = materialType;
    }

    // Filter by author
    if (author) {
      query.author = author;
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [materials, total] = await Promise.all([
      Material.find(query)
        .populate('author', 'username email profilePicture university')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Material.countDocuments(query)
    ]);

    // Add user-specific data if authenticated
    if (req.user) {
      materials.forEach(material => {
        material.isLiked = material.likes?.some(id => id.toString() === req.user._id.toString()) || false;
        material.isSaved = material.saves?.some(id => id.toString() === req.user._id.toString()) || false;
      });
    }

    res.json({
      success: true,
      data: materials,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch materials',
      error: error.message
    });
  }
};

// Get single material by ID
exports.getMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id)
      .populate('author', 'username email profilePicture university');

    if (!material || material.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    // Increment view count
    material.views += 1;
    await material.save();

    // Add user-specific data
    const materialObj = material.toObject();
    if (req.user) {
      materialObj.isLiked = material.isLikedBy(req.user._id);
      materialObj.isSaved = material.isSavedBy(req.user._id);
    }

    res.json({
      success: true,
      data: materialObj
    });
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch material',
      error: error.message
    });
  }
};

// Update material
exports.updateMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    // Check ownership
    if (material.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this material'
      });
    }

    const { title, description, subject, materialType, visibility, tags } = req.body;
    
    if (title) material.title = title;
    if (description !== undefined) material.description = description;
    if (subject) material.subject = subject;
    if (materialType) material.materialType = materialType;
    if (visibility) material.visibility = visibility;
    if (tags) {
      material.tags = typeof tags === 'string' ? tags.split(',').map(t => t.trim().toLowerCase()) : tags;
    }

    await material.save();
    await material.populate('author', 'username email profilePicture university');

    res.json({
      success: true,
      message: 'Material updated successfully',
      data: material
    });
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update material',
      error: error.message
    });
  }
};

// Delete material
exports.deleteMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    // Check ownership
    if (material.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this material'
      });
    }

    // Soft delete
    material.status = 'deleted';
    await material.save();

    // Delete associated comments
    await Comment.updateMany(
      { material: material._id },
      { status: 'deleted' }
    );

    res.json({
      success: true,
      message: 'Material deleted successfully'
    });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete material',
      error: error.message
    });
  }
};

// Like/Unlike material
exports.toggleLike = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    const userId = req.user._id;
    const isLiked = material.isLikedBy(userId);

    if (isLiked) {
      material.likes = material.likes.filter(id => id.toString() !== userId.toString());
    } else {
      material.likes.push(userId);
    }

    await material.save();

    res.json({
      success: true,
      message: isLiked ? 'Material unliked' : 'Material liked',
      data: {
        isLiked: !isLiked,
        likesCount: material.likesCount
      }
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle like',
      error: error.message
    });
  }
};

// Save/Unsave material
exports.toggleSave = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    const userId = req.user._id;
    const isSaved = material.isSavedBy(userId);

    if (isSaved) {
      material.saves = material.saves.filter(id => id.toString() !== userId.toString());
    } else {
      material.saves.push(userId);
    }

    await material.save();

    res.json({
      success: true,
      message: isSaved ? 'Material unsaved' : 'Material saved',
      data: {
        isSaved: !isSaved,
        savesCount: material.savesCount
      }
    });
  } catch (error) {
    console.error('Toggle save error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle save',
      error: error.message
    });
  }
};

// Download material
exports.downloadMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    // Increment download count
    material.downloads += 1;
    await material.save();

    // Send file
    const filePath = path.resolve(material.file.path);
    res.download(filePath, material.file.originalName);
  } catch (error) {
    console.error('Download material error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download material',
      error: error.message
    });
  }
};

// Get user's materials
exports.getMyMaterials = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [materials, total] = await Promise.all([
      Material.find({ author: req.user._id, status: { $ne: 'deleted' } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Material.countDocuments({ author: req.user._id, status: { $ne: 'deleted' } })
    ]);

    res.json({
      success: true,
      data: materials,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get my materials error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your materials',
      error: error.message
    });
  }
};

// Get saved materials
exports.getSavedMaterials = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [materials, total] = await Promise.all([
      Material.find({ saves: req.user._id, status: 'active' })
        .populate('author', 'username email profilePicture university')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Material.countDocuments({ saves: req.user._id, status: 'active' })
    ]);

    res.json({
      success: true,
      data: materials,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get saved materials error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch saved materials',
      error: error.message
    });
  }
};

// ==================== COMMENTS ====================

// Get comments for a material
exports.getComments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [comments, total] = await Promise.all([
      Comment.find({ 
        material: req.params.id, 
        status: 'active',
        parentComment: null // Only top-level comments
      })
        .populate('author', 'username profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Comment.countDocuments({ 
        material: req.params.id, 
        status: 'active',
        parentComment: null 
      })
    ]);

    // Get replies for each comment
    for (let comment of comments) {
      comment.replies = await Comment.find({
        parentComment: comment._id,
        status: 'active'
      })
        .populate('author', 'username profilePicture')
        .sort({ createdAt: 1 })
        .lean();
      
      // Add isLiked for current user
      if (req.user) {
        comment.isLiked = comment.likes?.some(id => id.toString() === req.user._id.toString()) || false;
        comment.replies?.forEach(reply => {
          reply.isLiked = reply.likes?.some(id => id.toString() === req.user._id.toString()) || false;
        });
      }
    }

    res.json({
      success: true,
      data: comments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
      error: error.message
    });
  }
};

// Add comment
exports.addComment = async (req, res) => {
  try {
    const { content, parentComment } = req.body;

    // Check if material exists
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    const comment = new Comment({
      material: req.params.id,
      author: req.user._id,
      content,
      parentComment: parentComment || null
    });

    await comment.save();
    await comment.populate('author', 'username profilePicture');

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: comment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: error.message
    });
  }
};

// Update comment
exports.updateComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment || comment.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this comment'
      });
    }

    comment.content = req.body.content;
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();
    await comment.populate('author', 'username profilePicture');

    res.json({
      success: true,
      message: 'Comment updated successfully',
      data: comment
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update comment',
      error: error.message
    });
  }
};

// Delete comment
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    comment.status = 'deleted';
    await comment.save();

    // Also delete replies
    await Comment.updateMany(
      { parentComment: comment._id },
      { status: 'deleted' }
    );

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment',
      error: error.message
    });
  }
};

// Like/Unlike comment
exports.toggleCommentLike = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment || comment.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const userId = req.user._id;
    const isLiked = comment.isLikedBy(userId);

    if (isLiked) {
      comment.likes = comment.likes.filter(id => id.toString() !== userId.toString());
    } else {
      comment.likes.push(userId);
    }

    await comment.save();

    res.json({
      success: true,
      message: isLiked ? 'Comment unliked' : 'Comment liked',
      data: {
        isLiked: !isLiked,
        likesCount: comment.likesCount
      }
    });
  } catch (error) {
    console.error('Toggle comment like error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle like',
      error: error.message
    });
  }
};
