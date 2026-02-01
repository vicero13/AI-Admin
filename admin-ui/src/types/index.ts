export interface DialogMessage {
  role: 'client' | 'manager';
  text: string;
  intent?: string;
  emotion?: string;
  note?: string;
}

export interface DialogExample {
  exampleId: string;
  situation: string;
  clientType: string;
  messages: DialogMessage[];
  outcome: string;
  quality: number;
  learnings: string[];
  keyPhrases: string[];
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface Office {
  id: string;
  number: string;
  capacity: number;
  pricePerMonth: number;
  status: 'free' | 'rented' | 'maintenance';
  amenities: string[];
  floor: number;
  size: number;
  notes?: string;
  lastUpdated: number;
}
