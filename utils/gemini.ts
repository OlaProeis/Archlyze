
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, DiagramType, AppSettings, CodeIssue, CodeComponent, ProjectFile } from "../types";

const getEnvApiKey = (): string | undefined => {
  try {
    return typeof process !== 'undefined' && process.env?.API_KEY ? process.env.API_KEY : undefined;
  } catch {
    return undefined;
  }
};

const getAiClient = (apiKey?: string) => {
  const key = apiKey || getEnvApiKey();
  if (!key) {
    throw new Error("API Key is missing. Please click the Settings icon and enter your Google Gemini API Key.");
  }
  return new GoogleGenAI({ apiKey: key });
};

// Robust JSON extraction — handles code fences, extra text around JSON, and common issues
const extractJson = (text: string): string => {
  if (!text) return "";
  let clean = text.trim();

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  clean = clean.trim();

  // If it already looks like valid JSON, return it
  if ((clean.startsWith('{') && clean.endsWith('}')) || (clean.startsWith('[') && clean.endsWith(']'))) {
    return clean;
  }

  // Try to find the outermost JSON object in the text
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return clean.substring(firstBrace, lastBrace + 1);
  }

  // Fallback: return cleaned text and let JSON.parse report the real error
  return clean;
};

// Calculate timeout based on code size — thinking models need time for their reasoning phase
const getAnalysisTimeout = (codeLength: number): number => {
  const lineCount = codeLength;
  if (lineCount < 100) return 60000;     // 60s for small files
  if (lineCount < 500) return 120000;    // 120s for medium files
  return 180000;                          // 180s for large files
};

// Helper to wrap promises with a timeout
const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

export async function analyzeRustCode(code: string, settings: AppSettings): Promise<AnalysisResult> {
  const ai = getAiClient(settings.apiKey);
  
  // Enforce maxLines setting — truncate if code exceeds the configured limit
  const maxLines = settings.maxLines || 10000;
  const codeLines = code.split('\n');
  const truncated = codeLines.length > maxLines;
  const effectiveCode = truncated ? codeLines.slice(0, maxLines).join('\n') : code;
  
  const prompt = `You are an expert code analysis tool. Perform a thorough static analysis of the following source code.

Your task:
1. Detect the programming language.
2. Write a detailed summary of what this code does, its architecture, and quality assessment.
3. Extract ALL major components: every function, class, struct, module, method, interface, hook, event handler, etc. For each, provide the exact start and end line numbers, a description, its internal dependencies, and any issues found within it.
4. Identify ALL issues across the entire codebase: security vulnerabilities, performance problems, anti-patterns, code style issues, potential bugs, and missing best practices. Categorize each as INFO, WARNING, or ERROR with specific line numbers and actionable suggestions.
5. List all external dependencies/libraries imported and describe what each is used for.

Be thorough — extract every component and flag every issue you can find, no matter how minor.
${truncated ? `\nNote: This code was truncated from ${codeLines.length} to ${maxLines} lines due to size limits.\n` : ''}
Code:
${effectiveCode}
`;

  const modelName = settings.model || "gemini-2.5-flash";

  const timeoutMs = getAnalysisTimeout(codeLines.length);

  // ── Response Schema with required fields and descriptions ──
  const issueSchema = {
    type: Type.OBJECT,
    description: 'A code issue found during analysis.',
    properties: {
      line: { type: Type.INTEGER, description: 'The 1-based line number where the issue occurs.' },
      severity: { type: Type.STRING, enum: ['INFO', 'WARNING', 'ERROR'], description: 'Issue severity level.' },
      message: { type: Type.STRING, description: 'Clear description of the issue.' },
      suggestion: { type: Type.STRING, description: 'Actionable suggestion to fix the issue.' }
    },
    required: ['line', 'severity', 'message', 'suggestion']
  };

  const componentSchema = {
    type: Type.OBJECT,
    description: 'A code component (function, class, struct, etc.) extracted from the source.',
    properties: {
      id: { type: Type.STRING, description: 'Unique identifier for this component, e.g. comp-0, comp-1.' },
      type: { 
        type: Type.STRING, 
        enum: ['Function', 'Class', 'Struct', 'Trait', 'Interface', 'Module', 'Method', 'Component', 'Prop', 'State', 'Hook', 'EventHandler'],
        description: 'The kind of code component.'
      },
      name: { type: Type.STRING, description: 'The name of the component as it appears in source.' },
      startLine: { type: Type.INTEGER, description: 'The 1-based line number where this component starts.' },
      endLine: { type: Type.INTEGER, description: 'The 1-based line number where this component ends.' },
      description: { type: Type.STRING, description: 'What this component does.' },
      dependencies: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Names of other components or functions this component calls or depends on.' },
      issues: { type: Type.ARRAY, items: issueSchema, description: 'Issues found within this component.' }
    },
    required: ['id', 'type', 'name', 'startLine', 'endLine', 'description', 'dependencies', 'issues']
  };

  const dependencySchema = {
    type: Type.OBJECT,
    description: 'An external library or dependency used by the code.',
    properties: {
      name: { type: Type.STRING, description: 'Package/library name.' },
      description: { type: Type.STRING, description: 'What this dependency is used for in this code.' },
      version: { type: Type.STRING, description: 'Version if detectable, otherwise empty string.' }
    },
    required: ['name', 'description']
  };

  const analysisSchema = {
    type: Type.OBJECT,
    description: 'Complete static analysis result for the provided source code.',
    properties: {
      language: { type: Type.STRING, description: 'The detected programming language.' },
      summary: { type: Type.STRING, description: 'A detailed summary of the code: purpose, architecture, and overall quality.' },
      components: { type: Type.ARRAY, items: componentSchema, description: 'All extracted code components.' },
      overallIssues: { type: Type.ARRAY, items: issueSchema, description: 'Issues that apply to the codebase as a whole, not tied to a specific component.' },
      dependencies: { type: Type.ARRAY, items: dependencySchema, description: 'External libraries and imports used.' }
    },
    required: ['language', 'summary', 'components', 'overallIssues', 'dependencies']
  };

  try {
    const response = await withTimeout<GenerateContentResponse>(
      ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: analysisSchema
        }
      }),
      timeoutMs, 
      `Analysis timed out after ${Math.round(timeoutMs / 1000)}s. Try a smaller file or a faster model (Flash-Lite).`
    );

    // Extract text from response — try .text getter first, fall back to digging into candidates
    let text = '';
    try {
      text = response.text || '';
    } catch {
      // Some model responses may not support .text getter directly
      const parts = response.candidates?.[0]?.content?.parts || [];
      text = parts.map((p: any) => p.text || '').join('');
    }

    if (!text) throw new Error("Received empty response from AI. The model may not support structured output with this configuration.");

    console.log(`[Archlyze] Raw response length: ${text.length} chars`);

    const cleanedText = extractJson(text);
    
    try {
      const result = JSON.parse(cleanedText) as AnalysisResult;
      // Ensure arrays exist and assign IDs if missing
      result.components = result.components || [];
      result.overallIssues = result.overallIssues || [];
      result.dependencies = result.dependencies || [];
      result.components.forEach((c, i) => { if(!c.id) c.id = `comp-${i}`; });
      return result;
    } catch (parseErr) {
      // Log enough context to debug but not the entire response
      console.error("[Archlyze] JSON Parse Error. First 800 chars of cleaned text:", cleanedText.substring(0, 800));
      console.error("[Archlyze] Last 200 chars:", cleanedText.substring(cleanedText.length - 200));
      console.error("[Archlyze] Parse error:", parseErr);
      throw new Error(`Failed to parse AI response. The model returned invalid JSON. Check browser console (F12) for details.`);
    }

  } catch (error: any) {
    console.error("[Archlyze] Analysis Error:", error);
    throw error;
  }
}

export async function generateArchitectureDiagram(code: string, analysisSummary: string, type: DiagramType, settings: AppSettings): Promise<string> {
  const ai = getAiClient(settings.apiKey);

  const diagramPrompt = `
    Create a professional software architecture diagram for the following code context.
    
    Type: ${type} (Flowchart, UML, or Data Flow).
    
    Code Context:
    ${analysisSummary}
    
    Key Structures from Code:
    ${code.substring(0, 1500)}... (truncated)

    Visual Style Requirements:
    - Professional developer documentation aesthetic.
    - Clean lines, minimalist.
    - Color Scheme: Rust Orange (#CE422B) for primary nodes/actions, Dark Gray (#2A2C31) for containers/modules.
    - White or very light gray background.
    - High contrast, legible structure.
    - Do not include any text in the response, just the image.
  `;

  try {
    const response = await withTimeout<GenerateContentResponse>(
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: diagramPrompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: '16:9'
          }
        }
      }),
      45000,
      "Image generation timed out."
    );

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image generated.");
  } catch (error: any) {
    console.error("[Archlyze] Diagram generation error:", error);
    const status = error?.status;
    const msg = (error?.message ?? String(error)).trim();
    const isZeroQuota = /limit:\s*0.*flash.*image|generate_content_free_tier.*limit:\s*0/i.test(msg);
    const isRateLimit = status === 429 || /RESOURCE_EXHAUSTED|429|rate limit|quota/i.test(msg);
    const isPermission = status === 403 || /permission|forbidden|not enabled|not available|disabled/i.test(msg);

    let userMessage: string;
    if (isZeroQuota) {
      userMessage =
        "Image generation has no quota on your current plan (limit: 0). The diagram feature uses the image model; the \"Rate limits by model\" table in AI Studio shows text-only models. To use diagrams, enable billing in Google AI Studio or check for a separate image-generation quota in your project.";
    } else {
      userMessage = msg || "Image generation failed.";
      if (isPermission) {
        userMessage += " Image generation may not be enabled for your API key or region. Check Google AI Studio → Rate limits / supported models.";
      } else if (isRateLimit) {
        userMessage += " Try again later or check your tier in AI Studio.";
      }
    }
    throw new Error(userMessage);
  }
}

export async function generateFix(code: string, issue: CodeIssue, settings: AppSettings): Promise<string> {
  const ai = getAiClient(settings.apiKey);
  const prompt = `
    You are a senior software engineer. Fix the following issue in the provided code.
    
    Issue to Fix: "${issue.message}" at line ${issue.line}.
    Suggestion: "${issue.suggestion}".

    Original Code:
    ${code}

    Instructions:
    1. Return ONLY the corrected code snippet.
    2. Do NOT return the entire file unless necessary.
    3. Include brief comments.
    4. Do not wrap in markdown code blocks, return raw text.
  `;

  const response = await withTimeout<GenerateContentResponse>(
    ai.models.generateContent({
      model: settings.model || "gemini-2.5-flash",
      contents: prompt
    }),
    30000,
    "Fix generation timed out."
  );

  let text = response.text || "// No fix generated";
  return extractJson(text);
}

export async function generateUnitTests(code: string, component: CodeComponent, settings: AppSettings): Promise<string> {
  const ai = getAiClient(settings.apiKey);
  const prompt = `
    You are a senior software engineer. Write comprehensive unit tests for the following component.

    Component: ${component.type} named "${component.name}".
    Context:
    ${code}

    Instructions:
    1. Provide standard unit tests using the testing framework idiomatic to the language.
    2. Cover happy paths and edge cases.
    3. Do not wrap in markdown code blocks, return raw text.
  `;

  const response = await withTimeout<GenerateContentResponse>(
    ai.models.generateContent({
      model: settings.model || "gemini-2.5-flash",
      contents: prompt
    }),
    45000,
    "Test generation timed out."
  );

  let text = response.text || "// No tests generated";
  return extractJson(text);
}
