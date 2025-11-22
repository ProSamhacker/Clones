import { Timestamp } from 'firebase/firestore';

export interface GroundingSource {
  uri: string;
  title?: string;
}

export interface Message {
  id?: string;
  role: 'user' | 'model';
  content: string;
  imageUrl?: string | null; // Used for both User uploads and AI generation
  isLoading?: boolean;
  grounding?: GroundingSource[];
  createdAt?: Timestamp;
}

export interface Chat {
  id: string;
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface GeminiResponse {
  text: string;
  grounding: GroundingSource[];
}