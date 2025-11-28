
export interface SavedIncident {
  id: string;
  timestamp: number; // Date.now()
  durationSeconds: number;
  blob: Blob;
  analysis?: IncidentAnalysis;
}

export interface IncidentAnalysis {
  summary: string;
  sentiment: string;
  threatLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  keyEvents: string[];
  recommendations: string[];
  currentSituation: string; // "What they are doing"
  predictedNextMoves: string[]; // "What their next move is"
}

export interface AudioChunk {
  data: Blob;
  timestamp: number;
}
