export interface Card3DConfig {
  title: string;
  subtitle: string;
  username: string;
  occupation: string;
  personaTrait: string;
  surfaceTrait?: string;
  innerDesire?: string;
  
  // 4 Core Dimensions
  dominanceIndex: number;
  submissionIndex: number;
  restraintIndex: number;
  sensoryThreshold: number;
  
  // Custom Dynamic Dimensions (Adaptive to Question Bank)
  customDimensions?: { key: string; name: string; value: number }[];
  
  // Behavior / Openness
  opennessPercent: number;
  opennessTrait: string;
  
  // Serial / ID
  dossierId: string;
  
  // Front Artwork
  imageUrl: string;
  imageScale: number;
  imageX: number;
  imageY: number;
  imageFilter: string; // 'none' | 'grayscale' | 'sepia' | 'vintage' | 'noir' | 'vibrant'

  // Back Artwork (Shadow Side)
  backImageUrl?: string;
  backImageScale?: number;
  backImageX?: number;
  backImageY?: number;
  backImageFilter?: string;
  
  // Effects & State
  holographic: boolean;
  isFlipped: boolean;
  contentMode: 'dimensions' | 'desire'; // Display 4-dim mini badges vs shadow desire quote
  
  // Stamp / Wax Seal
  stampType: 'wax' | 'ink-circle' | 'ink-rect';
  stampTextTop: string;
  stampTextBottom: string;
  stampTextCenter: string; // LLM dynamic assessment words
  stampColor: string;
  stampClarity?: 'high' | 'medium' | 'low';
  stampX: number;
  stampY: number;
  stampRotation: number;
  stampScale: number;
  
  // Theme styling
  accentColor: string;
}
