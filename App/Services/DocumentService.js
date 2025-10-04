const mongoose = require('mongoose');
const { Schema } = mongoose;
const fs = require('fs').promises;
const path = require('path');

// Document Schema
const documentSchema = new Schema({
  name: { type: String, required: true, trim: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  path: { type: String, required: true },
  url: { type: String },
  entityId: { type: Schema.Types.ObjectId, required: true },
  entityType: { 
    type: String, 
    enum: ['requirement', 'rfq', 'quote', 'purchaseOrder', 'compliance'], 
    required: true 
  },
  category: { 
    type: String, 
    enum: ['specification', 'contract', 'certificate', 'report', 'other'],
    default: 'other'
  },
  version: { type: Number, default: 1 },
  parentDocumentId: { type: Schema.Types.ObjectId, ref: 'Document' },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
  metadata: { type: Schema.Types.Mixed },
  tags: [{ type: String }],
  accessLevel: { 
    type: String, 
    enum: ['public', 'internal', 'confidential', 'restricted'],
    default: 'internal'
  }
}, {
  timestamps: true
});

// Create indexes
documentSchema.index({ entityId: 1, entityType: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ category: 1, isActive: 1 });
documentSchema.index({ createdAt: -1 });
documentSchema.index({ name: 'text', tags: 'text' });

const Document = mongoose.model('Document', documentSchema);

class DocumentService {
  constructor() {
    this.uploadPath = path.join(process.cwd(), 'uploads');
    this.ensureUploadDirectory();
  }

  async ensureUploadDirectory() {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
  }

  async uploadDocument(fileData, metadata) {
    try {
      const { buffer, originalName, mimeType, size } = fileData;
      const { entityId, entityType, category, uploadedBy, tags = [] } = metadata;

      // Generate unique filename
      const timestamp = Date.now();
      const extension = path.extname(originalName);
      const filename = `${timestamp}_${Math.random().toString(36).substr(2, 9)}${extension}`;
      const filePath = path.join(this.uploadPath, filename);

      // Save file to disk
      await fs.writeFile(filePath, buffer);

      // Create document record
      const document = new Document({
        name: filename,
        originalName,
        mimeType,
        size,
        path: filePath,
        url: `/uploads/${filename}`,
        entityId,
        entityType,
        category,
        uploadedBy,
        tags
      });

      await document.save();
      return document;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  async getDocuments(filter = {}, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      
      const documents = await Document.find({ ...filter, isActive: true })
        .populate('uploadedBy', 'email')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Document.countDocuments({ ...filter, isActive: true });

      return {
        documents,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      };
    } catch (error) {
      console.error('Error getting documents:', error);
      throw error;
    }
  }

  async getDocument(documentId) {
    try {
      const document = await Document.findById(documentId)
        .populate('uploadedBy', 'email')
        .populate('parentDocumentId');
      
      return document;
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  }

  async deleteDocument(documentId, userId) {
    try {
      const document = await Document.findById(documentId);
      
      if (!document) {
        throw new Error('Document not found');
      }

      // Soft delete
      document.isActive = false;
      await document.save();

      // Optionally delete physical file
      try {
        await fs.unlink(document.path);
      } catch (error) {
        console.warn('Could not delete physical file:', error.message);
      }

      return document;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  async createDocumentVersion(parentDocumentId, fileData, metadata) {
    try {
      const parentDocument = await Document.findById(parentDocumentId);
      
      if (!parentDocument) {
        throw new Error('Parent document not found');
      }

      // Get next version number
      const latestVersion = await Document.findOne({
        $or: [
          { _id: parentDocumentId },
          { parentDocumentId: parentDocumentId }
        ]
      }).sort({ version: -1 });

      const newVersion = (latestVersion?.version || 0) + 1;

      // Upload new version
      const newDocument = await this.uploadDocument(fileData, {
        ...metadata,
        entityId: parentDocument.entityId,
        entityType: parentDocument.entityType
      });

      // Update version info
      newDocument.version = newVersion;
      newDocument.parentDocumentId = parentDocumentId;
      await newDocument.save();

      return newDocument;
    } catch (error) {
      console.error('Error creating document version:', error);
      throw error;
    }
  }

  async searchDocuments(query, filter = {}) {
    try {
      const searchFilter = {
        ...filter,
        isActive: true,
        $text: { $search: query }
      };

      const documents = await Document.find(searchFilter)
        .populate('uploadedBy', 'email')
        .sort({ score: { $meta: 'textScore' } });

      return documents;
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }
}

module.exports = DocumentService;