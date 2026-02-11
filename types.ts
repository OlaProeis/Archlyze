
export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  GENERATING_IMAGE = 'GENERATING_IMAGE',
  FIXING = 'FIXING',
  GENERATING_TESTS = 'GENERATING_TESTS',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export enum IssueSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR'
}

export interface CodeIssue {
  line: number;
  severity: IssueSeverity;
  message: string;
  suggestion: string;
}

export interface CodeComponent {
  id: string;
  type: 'Function' | 'Class' | 'Struct' | 'Trait' | 'Interface' | 'Module' | 'Method' | 'Component' | 'Prop' | 'State' | 'Hook' | 'EventHandler';
  name: string;
  startLine: number;
  endLine: number;
  description: string;
  issues: CodeIssue[];
  dependencies: string[]; // Names of other components called/used
}

export interface Dependency {
  name: string;
  description: string;
  version?: string;
}

export interface AnalysisResult {
  language: string;
  summary: string;
  components: CodeComponent[];
  overallIssues: CodeIssue[];
  dependencies: Dependency[];
  timestamp?: number; // For history sorting
}

export interface AppSettings {
  apiKey: string;
  model: string;
  maxLines: number;
}

export interface ProjectFile {
  path: string;
  name: string;
  content: string;
  language: string;
  // Cache results per file
  analysis?: AnalysisResult | null;
  diagramUrl?: string | null;
}

export interface AppState {
  files: ProjectFile[]; // List of loaded files
  currentFile: ProjectFile | null; // Pointer to active file
  // Global status tracking
  status: AnalysisStatus;
  error: string | null;
  activePanel: 'code' | 'analysis' | 'visual';
  selectedComponentId: string | null; // For highlighting
  isDarkMode: boolean;
  isEditing: boolean;
  showSettings: boolean;
  showHistory: boolean; // New toggle for history panel
  settings: AppSettings;
  sidebarWidth: number; // Percentage
  modalContent: {
    isOpen: boolean;
    title: string;
    code: string;
    type: 'fix' | 'test' | null;
  };
}

export enum DiagramType {
  FLOWCHART = 'flowchart',
  UML = 'uml',
  DATA_FLOW = 'data_flow'
}
