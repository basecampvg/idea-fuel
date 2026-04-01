// Customer Interview shared types

// =============================================================================
// Enums / Union Types
// =============================================================================

export type QuestionType = 'FREE_TEXT' | 'SCALE' | 'MULTIPLE_CHOICE' | 'YES_NO';

export type CustomerInterviewGating = 'PUBLIC' | 'PASSWORD' | 'NDA';

export type CustomerInterviewStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

// =============================================================================
// Question & Answer Types
// =============================================================================

export interface InterviewQuestion {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  options?: string[]; // Only for MULTIPLE_CHOICE
}

export interface InterviewAnswer {
  questionId: string;
  value: string | number | boolean;
}

// =============================================================================
// Core Entities
// =============================================================================

export interface CustomerInterview {
  id: string;
  uuid: string;
  projectId: string;
  userId: string;
  title: string;
  description: string | null;
  questions: InterviewQuestion[];
  gating: CustomerInterviewGating;
  passwordHash: string | null;
  status: CustomerInterviewStatus;
  responseCount: number;
  synthesisResult: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterviewResponse {
  id: string;
  customerInterviewId: string;
  respondentEmail: string | null;
  answers: InterviewAnswer[];
  completionSeconds: number | null;
  ndaSignatureId: string | null;
  createdAt: Date;
}

export interface NdaSignature {
  id: string;
  customerInterviewId: string;
  signerEmail: string;
  signerName: string;
  ipAddress: string | null;
  userAgent: string | null;
  signedAt: Date;
}
