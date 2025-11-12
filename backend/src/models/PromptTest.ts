import mongoose, { Schema, Document } from 'mongoose';

// Interface for a single brand mention in a response
export interface IBrandMention {
  brandId: string;
  brandName: string;
  position: number; // Order of first appearance (1, 2, 3, etc.)
  mentionCount: number; // Total number of mentions
  sentences: {
    text: string;
    position: number; // Position in response (0-indexed)
    wordCount: number;
  }[];
  totalWordCount: number; // Total words in all sentences mentioning this brand
}

// Interface for a single LLM response
export interface ILLMResponse {
  platform: 'chatgpt' | 'perplexity' | 'claude' | 'gemini';
  rawResponse: string;
  totalSentences: number;
  totalWords: number;
  brandMentions: IBrandMention[];
  responseTime: number; // in milliseconds
  timestamp: Date;
  error?: string;
}

// Interface for the main PromptTest document
export interface IPromptTest extends Document {
  userId: string;
  promptId: string;
  promptText: string;
  topic: string;
  persona: string;
  brands: string[]; // List of brand IDs to track

  // LLM Responses
  responses: ILLMResponse[];

  // Metadata
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const BrandMentionSchema = new Schema({
  brandId: { type: String, required: true },
  brandName: { type: String, required: true },
  position: { type: Number, required: true },
  mentionCount: { type: Number, required: true },
  sentences: [{
    text: { type: String, required: true },
    position: { type: Number, required: true },
    wordCount: { type: Number, required: true }
  }],
  totalWordCount: { type: Number, required: true }
}, { _id: false });

const LLMResponseSchema = new Schema({
  platform: {
    type: String,
    required: true,
    enum: ['chatgpt', 'perplexity', 'claude', 'gemini']
  },
  rawResponse: { type: String, required: true },
  totalSentences: { type: Number, required: true },
  totalWords: { type: Number, required: true },
  brandMentions: [BrandMentionSchema],
  responseTime: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  error: { type: String }
}, { _id: false });

const PromptTestSchema = new Schema({
  userId: { type: String, required: true, index: true },
  promptId: { type: String, required: true, index: true },
  promptText: { type: String, required: true },
  topic: { type: String, required: true, index: true },
  persona: { type: String, required: true, index: true },
  brands: [{ type: String, required: true }],

  responses: [LLMResponseSchema],

  status: {
    type: String,
    required: true,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
}, {
  timestamps: true
});

// Indexes for efficient querying
PromptTestSchema.index({ userId: 1, status: 1 });
PromptTestSchema.index({ userId: 1, topic: 1 });
PromptTestSchema.index({ userId: 1, persona: 1 });
PromptTestSchema.index({ userId: 1, createdAt: -1 });

export const PromptTest = mongoose.model<IPromptTest>('PromptTest', PromptTestSchema);
