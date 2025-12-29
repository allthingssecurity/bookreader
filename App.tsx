import React, { useState, useEffect, useCallback, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import { loadNorthstarLevels } from './content/northstarLevels';
import { loadManualChapters } from './content/manualChapters';
import { loadCustomChapters } from './content/customChapters';
import { loadDocxLevels } from './content/docxLevels';
import WebcamHandler from './components/WebcamHandler';
import SettingsDrawer from './components/SettingsDrawer';
import BookView from './components/BookView';
import { PdfUpload } from './components/PdfUpload';
import NotesSidebar from './components/NotesSidebar';
import { GameState, GameSettings, Point, CalibrationData, Level } from './types';
import { Settings, Play, Target, RotateCcw, MousePointer2 } from 'lucide-react';
import { soundService } from './services/soundService';

// Default values
const DEFAULT_SETTINGS: GameSettings = {
  sensitivity: 1.0,
  smoothing: 0.8, // Heavy smoothing by default for stability
  spawnRate: 1000,
  difficulty: 'easy',
  soundEnabled: true,
  useMouseFallback: false,
  mode: 'classic',
  challenge: 'standard',
  role: 'architect',
  inputMode: 'hands',
  blinkToFire: true,
  bookRequirePinch: false,
  bookFlipMode: 'hand',
};

const DEFAULT_CALIBRATION: CalibrationData = {
  minX: 0.1, // 10% margin
  maxX: 0.9,
  minY: 0.1,
  maxY: 0.9,
};

const App: React.FC = () => {
  // Game State
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const [levels, setLevels] = useState<Level[]>(loadNorthstarLevels());
  const baseLevelsRef = useRef<Level[]>([]);
  const [quizState, setQuizState] = useState<{ q: number; correct: number; selected?: number }>({ q: 0, correct: 0 });
  const [playTimer, setPlayTimer] = useState(0); // unused (no timer)
  const [progress, setProgress] = useState<{ popped: number; target: number; active: number }>({ popped: 0, target: 10, active: 0 });
  const tipIdxRef = useRef(0);

  // Settings
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [pdfLevels, setPdfLevels] = useState<Level[] | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string | null>(null);
  const [showPdfUpload, setShowPdfUpload] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [calibration, setCalibration] = useState<CalibrationData>(DEFAULT_CALIBRATION);

  // Input State
  const [pointer, setPointer] = useState<Point>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [isPinching, setIsPinching] = useState(false);
  const [isHandDetected, setIsHandDetected] = useState(false);
  const lastHandSeenRef = useRef<number>(0);
  const [showHint, setShowHint] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const firstNoteOpenedRef = useRef(false);

  // Calibration logic
  const [calibrationStep, setCalibrationStep] = useState<0 | 1 | 2>(0); // 0: None, 1: Top-Left, 2: Bottom-Right
  const [tempCalibration, setTempCalibration] = useState<{ tl?: Point, br?: Point }>({});

  // Screen dimensions & Mobile detection
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const isMobileRef = useRef(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      isMobileRef.current = mobile;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Webcam handler callback
  const handleWebcamUpdate = useCallback((p: Point, pinch: boolean) => {
    // On mobile, avoid state updates for pointer to prevent re-renders (crash fix)
    // BookView reads gestures from window global directly in its loop
    if (!isMobileRef.current) {
      setPointer(p);
    }
    // Only update pinch if changed to avoid render thrashing
    setIsPinching(prev => prev === pinch ? prev : pinch);
  }, []);

  // Update sound service
  useEffect(() => {
    soundService.setEnabled(settings.soundEnabled);
    if (settings.soundEnabled) {
      // Ensure audio context unlocks on first user gesture
      try { soundService.attachAutoUnlock(); } catch { }
    }
  }, [settings.soundEnabled]);

  // Persist settings
  useEffect(() => {
    try { localStorage.setItem('shp.settings', JSON.stringify(settings)); } catch { }
  }, [settings]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('shp.settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure we always start at Menu after mount
  useEffect(() => {
    setGameState(GameState.MENU);
  }, []);

  // Expose sensitivity to WebcamHandler via window for fast path
  useEffect(() => {
    (window as any).__APP_SENS = settings.sensitivity;
  }, [settings.sensitivity]);

  // Auto-close settings on play/quiz/summary to avoid overlay over gameplay
  useEffect(() => {
    if (gameState === GameState.PLAYING || gameState === GameState.QUIZ || gameState === GameState.SUMMARY) {
      setIsSettingsOpen(false);
    }
  }, [gameState]);

  // Quiz utilities: shuffle choices so the correct answer isn't always first
  const shuffle = <T,>(arr: T[]): T[] => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const applyQuizShuffle = (levelsIn: Level[]): Level[] => {
    // Tailor question phrasing by role, then shuffle choices
    const role = settings.role;
    const adjustQuestion = (text: string): string => {
      if (!role) return text;
      if (role === 'architect') return text.replace(/\?$/, ' (architecture)?');
      if (role === 'developer') return text.replace(/\?$/, ' (implementation)?');
      if (role === 'manager') return text.replace(/\?$/, ' (outcome/impact)?');
      return text;
    };
    return levelsIn.map((lvl) => ({
      ...lvl,
      questions: (lvl.questions || []).map((q) => {
        const choices = q.choices.slice();
        const correct = choices[q.correctIndex];
        const shuffled = shuffle(choices);
        const newIndex = Math.max(0, shuffled.findIndex(c => c === correct));
        return { ...q, question: adjustQuestion(q.question), choices: shuffled, correctIndex: newIndex };
      })
    }));
  };

  // Role tailoring: filter content/tips and (re)generate a role‑focused question set
  const roleKeywords = (role?: 'architect' | 'developer' | 'manager'): string[] => {
    switch (role) {
      case 'architect':
        return ['architecture', 'platform', 'foundation', 'governance', 'integration', 'trust', 'clean core', 'mcp', 'a2a', 'agent', 'orchestrator', 'golden path'];
      case 'developer':
        return ['sdk', 'api', 'agent', 'mcp', 'a2a', 'skills', 'innerSource', 'app.yaml', 'appfnd', 'joule studio', 'low-code', 'pro-code'];
      case 'manager':
        return ['outcome', 'value', 'roi', 'risk', 'governance', 'compliance', 'efficiency', 'productivity', 'trust', 'strategy'];
      default:
        return [];
    }
  };

  const splitLines = (text: string): string[] => {
    return text
      .split(/\n|•|\u2022|\-|\–|\.|;|\r/)
      .map(s => s.trim())
      .filter(Boolean);
  };

  const pickRoleContent = (content: string, role: 'architect' | 'developer' | 'manager' | undefined): { tips: string[]; content: string } => {
    const lines = splitLines(content);
    if (!role) return { tips: lines.slice(0, 8), content };
    const kws = roleKeywords(role);
    const scored = lines.map(l => ({ l, s: kws.reduce((acc, k) => acc + (l.toLowerCase().includes(k) ? 1 : 0), 0) }));
    const picked = scored.filter(x => x.s > 0).map(x => x.l);
    const tips = (picked.length >= 6 ? picked.slice(0, 8) : lines.slice(0, 8));
    // Rebuild a compact content paragraph from tips
    const compact = tips.join('. ') + (tips.length ? '.' : '');
    return { tips, content: compact };
  };

  const genRoleQuestions = (title: string, content: string, role: 'architect' | 'developer' | 'manager' | undefined): Level['questions'] => {
    const t = title.toLowerCase();
    const c = content.toLowerCase();
    const yes = 'True'; const no = 'False';
    const isExec = /executive/.test(t);
    const isVision = /vision/.test(t) && !/user experience/.test(t);
    const isUX = /user experience|cognitive interface|ux/.test(t);
    const isProcess = /process/.test(t);
    const isFoundation = /foundation|data & knowledge|knowledge/.test(t);
    const isPlatform = /platform|btp|application foundation|appfnd/.test(t);
    const isTrusted = /trusted|security|governance|integration/.test(t);
    const isEcosystem = /ecosystem/.test(t);
    const isResilient = /resilient|ops|operations/.test(t);
    const isFuture = /future|quantum/.test(t);

    const pick = (...banks: Level['questions'][]): Level['questions'] => {
      const list = banks.find(b => b.length) || [];
      // Ensure at least 5
      while (list.length < 5) list.push({ question: 'Enterprise AI requires governance.', choices: [yes, no], correctIndex: 0 });
      return list.slice(0, 5);
    };

    // Architect
    if (role === 'architect') {
      const exec: Level['questions'] = [
        { question: 'AI-native augments deterministic systems.', choices: [yes, no], correctIndex: 0 },
        { question: 'Cognitive Core blends System‑1/2 and meta‑learning.', choices: [yes, no], correctIndex: 0 },
        { question: 'Architecture priority is…', choices: ['Trust + governance', 'Only model size', 'No metadata', 'UI themes'], correctIndex: 0 },
        { question: 'Clean core is preserved by…', choices: ['Clear separation via MCP/A2A', 'Direct DB writes', 'Plugins everywhere', 'Manual exports'], correctIndex: 0 },
        { question: 'Outcome orientation replaces static automation.', choices: [yes, no], correctIndex: 0 },
      ];
      const vision: Level['questions'] = [
        { question: 'Layers in North Star are…', choices: ['Experience, Process, Foundation, Platform', 'UI, API, DB', 'FE/BE/ETL', 'Model/View/Controller'], correctIndex: 0 },
        { question: 'Shared context enabled by…', choices: ['MCP + A2A', 'Email', 'CSV', 'Screenshots'], correctIndex: 0 },
        { question: 'Flywheel is…', choices: ['Apps → Data → AI → Apps', 'Code → Build → Run', 'Plan → Run → Report', 'ETL → BI → GUI'], correctIndex: 0 },
        { question: 'Hallucinations are reduced by…', choices: ['Context engineering + neuro‑symbolic logic', 'Bigger fonts', 'GPU quota', 'Manual rules only'], correctIndex: 0 },
        { question: 'Joule serves as…', choices: ['Intent orchestrator', 'Build server', 'Cache', 'Queue'], correctIndex: 0 },
      ];
      const ux: Level['questions'] = [
        { question: 'UX shifts to outcomes over navigation.', choices: [yes, no], correctIndex: 0 },
        { question: 'Kernel services include…', choices: ['Voice AI', 'FTP', 'SMTP', 'RSS'], correctIndex: 0 },
        { question: 'ONE Design System + reusable components matter.', choices: [yes, no], correctIndex: 0 },
        { question: 'Human‑in‑the‑loop is standard.', choices: [yes, no], correctIndex: 0 },
        { question: 'Gen UI refers to…', choices: ['On‑demand UI generation', 'Static pages', 'SVG only', 'CSS only'], correctIndex: 0 },
      ];
      const process: Level['questions'] = [
        { question: 'Agents and deterministic apps coexist.', choices: [yes, no], correctIndex: 0 },
        { question: 'Gov. low‑code via…', choices: ['Joule Studio', 'Manual macros', 'Excel', 'PDF'], correctIndex: 0 },
        { question: 'Pro‑code agents use…', choices: ['Agent Golden Path', 'Random scripts', 'Local cron', 'No docs'], correctIndex: 0 },
        { question: 'Agents publish via…', choices: ['ORD', 'Email', 'CSV', 'FTP'], correctIndex: 0 },
        { question: 'Discoverability through…', choices: ['UMS + Knowledge Graph', 'Wiki', 'Slack', 'Jira'], correctIndex: 0 },
      ];
      const foundation: Level['questions'] = [
        { question: 'Joule Orchestrator manages…', choices: ['Agent lifecycles', 'Billing', 'CSS', 'DNS'], correctIndex: 0 },
        { question: 'Knowledge Graph grounds…', choices: ['Reasoning + semantics', 'Only caching', 'Only logs', 'Only UI'], correctIndex: 0 },
        { question: 'Agentic RAG vs naive RAG is…', choices: ['Tool‑aware, iterative, grounded', 'Random retrieval', 'Static PDF', 'Regex only'], correctIndex: 0 },
        { question: 'Safety/observability are…', choices: ['Built‑in', 'Optional', 'Legacy', 'Manual'], correctIndex: 0 },
        { question: 'Skills should be…', choices: ['Reusable', 'Per‑agent fork', 'Proprietary only', 'Hidden'], correctIndex: 0 },
      ];
      const platform: Level['questions'] = [
        { question: 'BTP provides…', choices: ['Unified substrate', 'Only ABAP', 'Only UI5', 'Only Kafka'], correctIndex: 0 },
        { question: 'Golden Path ensures…', choices: ['Enterprise qualities by default', 'UI themes only', 'Bigger logs', 'None'], correctIndex: 0 },
        { question: 'Unified provisioning hides…', choices: ['Technical complexity', 'APIs', 'Data', 'ML'], correctIndex: 0 },
        { question: 'AppFND uses…', choices: ['App.yaml declarative contract', 'XML configs', 'Manual bash', 'Email'], correctIndex: 0 },
        { question: 'Intent‑driven design codename…', choices: ['Project Nova', 'HANA', 'SRM', 'CRM'], correctIndex: 0 },
      ];
      const trusted: Level['questions'] = [
        { question: 'Integration shifts to…', choices: ['SAP‑managed automation', 'Customer wiring', 'CSV FTP', 'Email'], correctIndex: 0 },
        { question: 'Three‑Tier AI Defense includes…', choices: ['AI Identity + supervision agents', 'Disable auth', 'Open admin', 'Plain text logs'], correctIndex: 0 },
        { question: 'Governance requires…', choices: ['Central AI inventory', 'No inventory', 'Only UI', 'Only DBAs'], correctIndex: 0 },
        { question: 'No general‑purpose model provision policy.', choices: [yes, no], correctIndex: 0 },
        { question: 'Regulatory alignment includes…', choices: ['EU AI Act, ISO, NIST', 'IRC', 'FTP', 'JPEG'], correctIndex: 0 },
      ];
      const ecosystem: Level['questions'] = [
        { question: 'Discovery spans…', choices: ['APIs, data products, agents, tools', 'Only APIs', 'Only models', 'Only data'], correctIndex: 0 },
        { question: 'ORD + registries provide…', choices: ['Unified discovery', 'CSV tables', 'Email lists', 'IRC'], correctIndex: 0 },
        { question: 'LeanIX Agent Hub is…', choices: ['System registry', 'DB', 'Queue', 'IDE'], correctIndex: 0 },
        { question: 'Provenance ensures…', choices: ['Safe reuse', 'Faster CSS', 'Debug prints', 'Bigger logs'], correctIndex: 0 },
        { question: 'Ecosystem enables…', choices: ['Compound innovation', 'Single vendor lock', 'Random forks', 'Shadow IT'], correctIndex: 0 },
      ];
      const resilient: Level['questions'] = [
        { question: 'Resilience, elasticity, portability are…', choices: ['Design constraints', 'Optional', 'Deprecated', 'Only pricing'], correctIndex: 0 },
        { question: 'AIOps provides…', choices: ['Predictive remediation', 'Manual paging only', 'Less telemetry', 'More paper'], correctIndex: 0 },
        { question: 'Cloud ALM becomes…', choices: ['AI‑aware', 'PDF‑aware', 'CSS‑aware', 'SMTP‑aware'], correctIndex: 0 },
        { question: 'Public/private/sovereign are…', choices: ['Deployment strategies', 'File types', 'BI tools', 'Dev roles'], correctIndex: 0 },
        { question: 'Ops must be…', choices: ['AI‑native', 'Manual', 'Ad‑hoc', 'UI‑only'], correctIndex: 0 },
      ];
      const future: Level['questions'] = [
        { question: 'Quantum prep means…', choices: ['Early abstractions', 'Wait and see', 'Ignore research', 'JIT'], correctIndex: 0 },
        { question: 'Probabilistic reasoning…', choices: ['Aligns with AI workflows', 'Breaks ML', 'Equals SQL', 'Removes semantics'], correctIndex: 0 },
        { question: 'Goal is…', choices: ['Future‑proof, not reactive', 'UI‑first', 'Docs‑first', 'GPU‑first'], correctIndex: 0 },
        { question: 'Future pillar signals…', choices: ['Post‑classical compute prep', 'UI revamp', 'SMTP', 'Tape backups'], correctIndex: 0 },
        { question: 'Abstractions help avoid…', choices: ['Future disruption', 'Unit tests', 'Users', 'APIs'], correctIndex: 0 },
      ];
      return pick(
        isExec && exec,
        isVision && vision,
        isUX && ux,
        isProcess && process,
        isFoundation && foundation,
        isPlatform && platform,
        isTrusted && trusted,
        isEcosystem && ecosystem,
        isResilient && resilient,
        isFuture && future,
        exec
      );
    }

    // Developer
    if (role === 'developer') {
      const exec: Level['questions'] = [
        { question: 'AI‑native impacts development by…', choices: ['Embedding intelligence into flows', 'Adding scripts only', 'Bigger dashboards', 'Local macros'], correctIndex: 0 },
        { question: 'Agents cooperate via…', choices: ['MCP/A2A', 'Webhooks only', 'FTP', 'Email'], correctIndex: 0 },
        { question: 'Deterministic systems are…', choices: ['Augmented', 'Removed', 'Rewritten', 'Ignored'], correctIndex: 0 },
        { question: 'Context engineering is…', choices: ['First‑class', 'Optional', 'Legacy', 'N/A'], correctIndex: 0 },
        { question: 'Joule orchestrates…', choices: ['Agent workflows', 'Only UI', 'DB', 'Storage'], correctIndex: 0 },
      ];
      const vision: Level['questions'] = [
        { question: 'Flywheel is…', choices: ['Apps → Data → AI → Apps', 'CI → CD', 'Lint → Build', 'Plan → Build'], correctIndex: 0 },
        { question: 'Shared context via…', choices: ['MCP/A2A', 'Cookies', 'XML', 'PDF'], correctIndex: 0 },
        { question: 'Agents must avoid…', choices: ['Hallucinations via grounding', 'APIs', 'Logs', 'Tests'], correctIndex: 0 },
        { question: 'Joule is…', choices: ['Intent interpreter', 'DB engine', 'GPU scheduler', 'CLI'], correctIndex: 0 },
        { question: 'Neuro‑symbolic logic helps…', choices: ['Constrain reasoning', 'Render UI', 'Compress CSS', 'Gzip'], correctIndex: 0 },
      ];
      const ux: Level['questions'] = [
        { question: 'UX should be…', choices: ['Adaptive + context‑aware', 'Static', 'Opaque', 'Manual'], correctIndex: 0 },
        { question: 'Kernel services include…', choices: ['Voice AI', 'SMTP', 'FTP', 'NTP'], correctIndex: 0 },
        { question: 'ONE Design + reusable components enable…', choices: ['Speed and consistency', 'Less reuse', 'Forks', 'Manual CSS'], correctIndex: 0 },
        { question: 'Gen UI refers to…', choices: ['Generated interfaces', 'Static HTML', 'SVG only', 'No UI'], correctIndex: 0 },
        { question: 'Privacy controls must be…', choices: ['Built‑in', 'Ad‑hoc', 'Later', 'Out‑of‑scope'], correctIndex: 0 },
      ];
      const process: Level['questions'] = [
        { question: 'Gov. low‑code via…', choices: ['Joule Studio', 'Email', 'CSV', 'FTP'], correctIndex: 0 },
        { question: 'Pro‑code agents follow…', choices: ['Agent Golden Path', 'Ad‑hoc guides', 'Wiki only', 'Stack Overflow'], correctIndex: 0 },
        { question: 'All agents should publish via…', choices: ['ORD', 'PDF', 'CSV', 'PPT'], correctIndex: 0 },
        { question: 'Agents run on…', choices: ['Shared AI Core', 'Local laptops', 'FTP', 'SMTP'], correctIndex: 0 },
        { question: 'Clean core preserved by…', choices: ['MCP/A2A separation', 'DB triggers', 'Inline SQL', 'Shared schemas'], correctIndex: 0 },
      ];
      const foundation: Level['questions'] = [
        { question: 'Agent skills are…', choices: ['Reusable libraries', 'Static HTML', 'Binary blobs', 'Hidden'], correctIndex: 0 },
        { question: 'RAG should be…', choices: ['Agentic + grounded', 'Naive', 'Regex only', 'Cache only'], correctIndex: 0 },
        { question: 'Knowledge Graph provides…', choices: ['Semantics', 'Icons', 'GPU', 'Email'], correctIndex: 0 },
        { question: 'Joule Orchestrator handles…', choices: ['Lifecycle of agents', 'Tests', 'Lint', 'Docs'], correctIndex: 0 },
        { question: 'Safety/observability are…', choices: ['Built‑in', 'Later', 'Optional', 'Removed'], correctIndex: 0 },
      ];
      const platform: Level['questions'] = [
        { question: 'AppFND uses…', choices: ['App.yaml declarative contract', 'XML config', 'Bash only', 'Make only'], correctIndex: 0 },
        { question: 'BTP is…', choices: ['Service‑centric, multi‑cloud', 'Single‑VM', 'Local only', 'Single DB'], correctIndex: 0 },
        { question: 'Unified provisioning hides…', choices: ['Complexity', 'APIs', 'SQL', 'CSS'], correctIndex: 0 },
        { question: 'AI‑assisted dev helps…', choices: ['Migration + agent creation', 'Only docs', 'Only CSS', 'Only PM'], correctIndex: 0 },
        { question: 'Nova supports…', choices: ['Intent‑driven design', 'Manual JSON', 'Shell scripts', 'PDF'], correctIndex: 0 },
      ];
      const trusted: Level['questions'] = [
        { question: 'Security introduces…', choices: ['New attack surfaces', 'No change', 'Less auth', 'Less logging'], correctIndex: 0 },
        { question: 'Three‑Tier AI Defense includes…', choices: ['AI Identity + supervision', 'Disable auth', 'Open admin', 'Plain text logs'], correctIndex: 0 },
        { question: 'No general‑purpose models policy.', choices: [yes, no], correctIndex: 0 },
        { question: 'Regulatory alignment includes…', choices: ['EU AI Act, ISO, NIST', 'HTTP', 'SMTP', 'CSS'], correctIndex: 0 },
        { question: 'Unified services separate…', choices: ['Business intent from setup', 'APIs from auth', 'UIs from CSS', 'Data from code'], correctIndex: 0 },
      ];
      const ecosystem: Level['questions'] = [
        { question: 'Discovery covers…', choices: ['APIs, data products, agents, tools', 'Only APIs', 'Only models', 'Only data'], correctIndex: 0 },
        { question: 'ORD + registries enable…', choices: ['Unified discovery', 'CSV registry', 'Email list', 'FTP index'], correctIndex: 0 },
        { question: 'LeanIX Agent Hub acts as…', choices: ['System registry', 'CI server', 'Static site', 'ML platform'], correctIndex: 0 },
        { question: 'Provenance =…', choices: ['Safe reuse', 'Bigger logs', 'More CSS', 'No tests'], correctIndex: 0 },
        { question: 'Goal is…', choices: ['Compound innovation', 'Closed suite', 'Ad‑hoc forks', 'Shadow IT'], correctIndex: 0 },
      ];
      const resilient: Level['questions'] = [
        { question: 'AIOps provides…', choices: ['Predictive remediation', 'Manual paging', 'Less telemetry', 'Bigger UIs'], correctIndex: 0 },
        { question: 'Cloud ALM becomes…', choices: ['AI‑aware', 'PDF‑aware', 'CSS‑aware', 'SMTP‑aware'], correctIndex: 0 },
        { question: 'Sovereign cloud is…', choices: ['Regulated isolation', 'Just private cloud', 'Single VM', 'On‑prem only'], correctIndex: 0 },
        { question: 'Resilience is…', choices: ['Design constraint', 'Optional', 'Deprecated', 'Only pricing'], correctIndex: 0 },
        { question: 'Ops must be…', choices: ['AI‑native', 'Manual', 'Ad‑hoc', 'CSS‑first'], correctIndex: 0 },
      ];
      const future: Level['questions'] = [
        { question: 'Probabilistic reasoning aligns with…', choices: ['AI workflows', 'Filesystems', 'CSS', 'CDNs'], correctIndex: 0 },
        { question: 'Future prep needs…', choices: ['Abstractions early', 'Late rewrites', 'Ignore research', 'Ad‑hoc policy'], correctIndex: 0 },
        { question: 'Goal is…', choices: ['Future‑proofing', 'GPU‑first', 'UI‑first', 'Doc‑first'], correctIndex: 0 },
        { question: 'Quantum signal is…', choices: ['Post‑classical compute prep', 'SMTP', 'NTP', 'GIF'], correctIndex: 0 },
        { question: 'Grounding reduces…', choices: ['Hallucinations', 'Latency', 'Bandwidth', 'UX'], correctIndex: 0 },
      ];
      return pick(
        isExec && exec, isVision && vision, isUX && ux, isProcess && process, isFoundation && foundation,
        isPlatform && platform, isTrusted && trusted, isEcosystem && ecosystem, isResilient && resilient, isFuture && future, exec
      );
    }

    // Manager
    if (role === 'manager') {
      const exec: Level['questions'] = [
        { question: 'AI‑native vs AI‑first: value comes from…', choices: ['Embedding intelligence into workflows', 'Standalone AI features', 'Bigger UIs', 'Lower TCO only'], correctIndex: 0 },
        { question: 'SAP’s advantage is…', choices: ['Process depth + data + trust', 'Cheapest GPUs', 'Largest model only', 'No governance'], correctIndex: 0 },
        { question: 'Deterministic systems are…', choices: ['Augmented, not replaced', 'Deprecated', 'Impossible', 'Ignored'], correctIndex: 0 },
        { question: 'Cognitive Core combines…', choices: ['System‑1/2 + meta‑learning', 'Only LLMs', 'Only rules', 'Only UI'], correctIndex: 0 },
        { question: 'Outcome orientation replaces…', choices: ['Static automation', 'UX', 'Data', 'APIs'], correctIndex: 0 },
      ];
      const vision: Level['questions'] = [
        { question: 'Compounding value via…', choices: ['Apps → Data → AI → Apps loop', 'Quarterly reviews', 'Manual reports', 'Spreadsheets'], correctIndex: 0 },
        { question: 'Joule’s role is…', choices: ['Intent interpreter/orchestrator', 'UI toolkit', 'Billing', 'CMS'], correctIndex: 0 },
        { question: 'Shared understanding enabled by…', choices: ['MCP/A2A', 'Email', 'CSV', 'Chat'], correctIndex: 0 },
        { question: 'Trust preserved by…', choices: ['Context engineering + logic', 'Faster GPUs', 'Bigger fonts', 'Dark mode'], correctIndex: 0 },
        { question: 'Lead‑to‑cash becomes…', choices: ['Predictive and proactive', 'Manual', 'Ticket‑driven', 'PDF‑driven'], correctIndex: 0 },
      ];
      const ux: Level['questions'] = [
        { question: 'UX success depends on…', choices: ['Trust + explainability + control', 'Animations', 'Fonts', 'Brand only'], correctIndex: 0 },
        { question: 'UX becomes…', choices: ['Outcome‑oriented collaboration', 'Menu‑driven navigation', 'Form entries', 'Dashboards only'], correctIndex: 0 },
        { question: 'Personalization requires…', choices: ['Privacy controls', 'No controls', 'Manual emails', 'VPN only'], correctIndex: 0 },
        { question: 'Future includes…', choices: ['Gen UI + Voice AI + physical AI', 'Longer PDFs', 'Bigger charts', 'Legacy UIs'], correctIndex: 0 },
        { question: 'Foundation pillars are…', choices: ['ONE DS + Kernel + Reuse', 'Only CSS', 'Only ETL', 'Only GUIs'], correctIndex: 0 },
      ];
      const process: Level['questions'] = [
        { question: 'Two paradigms operate…', choices: ['Deterministic + Agentic', 'Only agentic', 'Only deterministic', 'Only manual'], correctIndex: 0 },
        { question: 'Governed low‑code via…', choices: ['Joule Studio', 'Email', 'Wiki', 'Jira'], correctIndex: 0 },
        { question: 'Discoverability via…', choices: ['ORD + UMS + KG', 'PowerPoints', 'Slack', 'Shared drive'], correctIndex: 0 },
        { question: 'Clean core preserved by…', choices: ['MCP/A2A separation', 'DB triggers', 'Macros', 'Spreadsheets'], correctIndex: 0 },
        { question: 'Low→pro code migration is…', choices: ['Supported', 'Unsupported', 'Random', 'Manual'], correctIndex: 0 },
      ];
      const foundation: Level['questions'] = [
        { question: 'Joule Orchestrator manages…', choices: ['Agents at scale', 'Licenses', 'Recruiting', 'Brand'], correctIndex: 0 },
        { question: 'Reasoning grounded by…', choices: ['Knowledge Graph + Vector', 'Only ETL', 'Only BI', 'Only rules'], correctIndex: 0 },
        { question: 'Safety/alignment/observability are…', choices: ['Built‑in', 'Optional', 'Manual', 'After go‑live'], correctIndex: 0 },
        { question: 'Reusable skills prevent…', choices: ['Duplication', 'Hiring', 'APIs', 'Services'], correctIndex: 0 },
        { question: 'Agentic RAG is…', choices: ['Governed, iterative retrieval', 'Copy/paste', 'PDF OCR', 'Manual'], correctIndex: 0 },
      ];
      const platform: Level['questions'] = [
        { question: 'BTP ensures…', choices: ['Scale + governance', 'Cheapest compute', 'Single‑tenant only', 'Only ABAP'], correctIndex: 0 },
        { question: 'Golden Path makes…', choices: ['Enterprise qualities default', 'Docs longer', 'UIs shinier', 'APIs slower'], correctIndex: 0 },
        { question: 'Provisioning should…', choices: ['Hide complexity', 'Expose details', 'Be manual', 'Use tickets'], correctIndex: 0 },
        { question: 'AppFND enables…', choices: ['Developer‑first modern apps', 'Only migration', 'Only KPIs', 'Only ABAP'], correctIndex: 0 },
        { question: 'Nova drives…', choices: ['Intent‑driven design', 'Cost cutting only', 'UX only', 'DB only'], correctIndex: 0 },
      ];
      const trusted: Level['questions'] = [
        { question: 'Integration becomes…', choices: ['SAP‑managed automation', 'Customer wiring', 'CSV piping', 'Email'], correctIndex: 0 },
        { question: 'Security layer adds…', choices: ['AI Identity + supervision', 'Open admin', 'Plain passwords', 'Defaults'], correctIndex: 0 },
        { question: 'Governance includes…', choices: ['Central AI inventory', 'None', 'Wiki', 'Macros'], correctIndex: 0 },
        { question: 'No GP model provision policy.', choices: [yes, no], correctIndex: 0 },
        { question: 'Alignment with…', choices: ['EU AI Act, ISO, NIST', 'Blog posts', 'GitHub stars', 'PDFs'], correctIndex: 0 },
      ];
      const ecosystem: Level['questions'] = [
        { question: 'Marketplace unifies…', choices: ['APIs, data, agents, tools', 'Only APIs', 'Only agents', 'Only data'], correctIndex: 0 },
        { question: 'ORD + registries provide…', choices: ['Safe reuse + discovery', 'Tickets', 'Emails', 'Spreadsheets'], correctIndex: 0 },
        { question: 'LeanIX Agent Hub acts as…', choices: ['System registry', 'CI server', 'CMS', 'ERP'], correctIndex: 0 },
        { question: 'Provenance guarantees…', choices: ['Safety + contracts', 'UI polish', 'GPU usage', 'Storage'], correctIndex: 0 },
        { question: 'Goal is…', choices: ['Compound innovation', 'Vendor lock', 'One‑off tools', 'Shadow IT'], correctIndex: 0 },
      ];
      const resilient: Level['questions'] = [
        { question: 'Ops must be…', choices: ['AI‑native', 'Manual', 'Static', 'Ticket driven only'], correctIndex: 0 },
        { question: 'AIOps provides…', choices: ['Predictive remediation', 'Manual paging', 'Less telemetry', 'Slower ops'], correctIndex: 0 },
        { question: 'Cloud ALM becomes…', choices: ['AI‑aware', 'PDF‑aware', 'UI‑aware', 'N/A'], correctIndex: 0 },
        { question: 'Resilience/portability/elasticity are…', choices: ['Design constraints', 'Optional', 'Legacy', 'Later'], correctIndex: 0 },
        { question: 'Sovereign cloud addresses…', choices: ['Regulatory needs', 'Fonts', 'Logos', 'Icons'], correctIndex: 0 },
      ];
      const future: Level['questions'] = [
        { question: 'Strategy aims to be…', choices: ['Future‑proof', 'Reactive', 'UI‑only', 'DB‑only'], correctIndex: 0 },
        { question: 'Probabilistic reasoning fits…', choices: ['AI workflows', 'Finance only', 'Caching', 'CSS'], correctIndex: 0 },
        { question: 'Early abstractions avoid…', choices: ['Future disruption', 'Hiring', 'Docs', 'UIs'], correctIndex: 0 },
        { question: 'Quantum era prep signals…', choices: ['Post‑classical compute', 'New logo', 'PDFs', 'Charts'], correctIndex: 0 },
        { question: 'Trust remains anchored in…', choices: ['Governed data semantics', 'UI themes', 'Etc.', 'None'], correctIndex: 0 },
      ];
      return pick(
        isExec && exec, isVision && vision, isUX && ux, isProcess && process, isFoundation && foundation,
        isPlatform && platform, isTrusted && trusted, isEcosystem && ecosystem, isResilient && resilient, isFuture && future, exec
      );
    }

    // Fallback generic
    return [
      { question: 'Enterprise AI requires governance.', choices: [yes, no], correctIndex: 0 },
      { question: 'Shared context across agents is enabled by MCP/A2A.', choices: [yes, no], correctIndex: 0 },
      { question: 'Outcome‑orientation replaces static automation.', choices: [yes, no], correctIndex: 0 },
      { question: 'Knowledge Graph grounds reasoning in semantics.', choices: [yes, no], correctIndex: 0 },
      { question: 'Agents should publish metadata via ORD.', choices: [yes, no], correctIndex: 0 },
    ];
  };

  const applyRoleToLevels = (levelsIn: Level[], role: 'architect' | 'developer' | 'manager' | undefined): Level[] => {
    return levelsIn.map(lvl => {
      const picked = pickRoleContent(lvl.content || '', role);
      const qs = genRoleQuestions(lvl.title, picked.content, role);
      return { ...lvl, content: picked.content, tips: picked.tips, questions: qs };
    });
  };

  // Load curated chapters first (your content). If DOCX loads, merge its text into the curated list
  useEffect(() => {
    let mounted = true;

    // 1) Seed with curated custom chapters so tips are correct immediately
    const curated = loadCustomChapters();
    const fallbackManual = loadManualChapters();
    const base = curated.length ? curated : (fallbackManual.length ? fallbackManual : loadNorthstarLevels());
    baseLevelsRef.current = base;
    setLevels(applyQuizShuffle(applyRoleToLevels(base, settings.role)));

    // 2) Load DOCX and merge its content into the curated list WITHOUT reducing the number of levels
    loadDocxLevels().then(docx => {
      if (!mounted || !docx.length) return;
      const key = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Build a map for docx by loose title key
      const docxMap = new Map<string, { idx: number; title: string; content: string }>();
      docx.forEach((d, i) => {
        docxMap.set(key(d.title), { idx: i, title: d.title, content: d.content });
      });

      // Start from curated (or manual fallback if curated missing)
      const base = curated.length ? curated : (fallbackManual.length ? fallbackManual : loadNorthstarLevels());

      // For each base level, if docx has a matching title (loose match), replace content but keep tips and questions
      const merged = base.map((lvl) => {
        const k = key(lvl.title);
        // find exact or partial match in docx titles
        let match = docx.find(d => key(d.title) === k);
        if (!match) {
          match = docx.find(d => key(d.title).includes(k) || k.includes(key(d.title)));
        }
        if (match) {
          return { ...lvl, title: match.title || lvl.title, content: match.content || lvl.content };
        }
        return lvl;
      });

      // Append any extra docx chapters that did not match, carrying over their content (no curated tips)
      docx.forEach((d) => {
        const dk = key(d.title);
        const exists = merged.some(m => key(m.title) === dk);
        if (!exists) {
          merged.push({ id: `docx-${dk}`, title: d.title, content: d.content, questions: d.questions || [] });
        }
      });

      baseLevelsRef.current = merged;
      setLevels(applyQuizShuffle(applyRoleToLevels(merged, settings.role)));
    }).catch(() => { /* keep curated/manual */ });
    return () => { mounted = false; };
  }, []);

  // Re-apply role tailoring whenever role changes
  useEffect(() => {
    const base = baseLevelsRef.current.length ? baseLevelsRef.current : levels;
    const tailored = applyQuizShuffle(applyRoleToLevels(base, settings.role));
    setLevels(tailored);
    setLevelIndex(0);
    setQuizState({ q: 0, correct: 0, selected: undefined });
    tipIdxRef.current = 0;
    setProgress({ popped: 0, target: 10, active: 0 });
    // keep state; player can press Start to play with new role
  }, [settings.role]);



  // Additional guard: degrade detection if no frames for a while
  useEffect(() => {
    if (settings.useMouseFallback) return;
    const id = setInterval(() => {
      const now = Date.now();
      if (now - lastHandSeenRef.current > 2000 && isHandDetected) {
        setIsHandDetected(false);
      }
    }, 300);
    return () => clearInterval(id);
  }, [isHandDetected, settings.useMouseFallback]);

  // Mouse fallback handler
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (settings.useMouseFallback) {
      setPointer({ x: e.clientX, y: e.clientY });
      setIsHandDetected(true);
    }
  }, [settings.useMouseFallback]);

  const handleMouseDown = useCallback(() => {
    if (settings.useMouseFallback) setIsPinching(true);
  }, [settings.useMouseFallback]);

  const handleMouseUp = useCallback(() => {
    if (settings.useMouseFallback) setIsPinching(false);
  }, [settings.useMouseFallback]);


  // Game Logic
  const startGame = () => {
    setScore(0);
    setCombo(0);
    setLevelIndex(0);
    setQuizState({ q: 0, correct: 0 });
    tipIdxRef.current = 0;
    setProgress({ popped: 0, target: 10, active: 0 });
    setGameState(GameState.PLAYING);
    setNotes([]);
    setNotesOpen(false);
    firstNoteOpenedRef.current = false;
  };

  const startBook = () => {
    setScore(0);
    setCombo(0);
    setLevelIndex(0);
    setQuizState({ q: 0, correct: 0 });
    tipIdxRef.current = 0;
    setProgress({ popped: 0, target: 10, active: 0 });
    setGameState(GameState.PLAYING);
    setNotes([]);
    setNotesOpen(false);
    firstNoteOpenedRef.current = false;
  };

  // Enter gameplay for current level and require clearing balloons to proceed
  const beginLevelPlay = () => {
    setGameState(GameState.PLAYING);
  };

  // Remove timer-to-quiz; quiz triggers after clearing a wave (handled via onPop in GameCanvas by checking remaining balloons via a callback if needed)

  const resetForNextLevel = () => {
    setQuizState({ q: 0, correct: 0 });
    tipIdxRef.current = 0;
    setProgress({ popped: 0, target: 10, active: 0 });
    setGameState(GameState.PLAYING);
    setNotes([]);
    setNotesOpen(false);
    firstNoteOpenedRef.current = false;
  };

  const startCalibration = () => {
    setGameState(GameState.CALIBRATION);
    setCalibrationStep(1);
    setTempCalibration({});
  };

  const captureCalibrationPoint = () => {
    // We can't really get raw coordinates here easily because WebcamHandler maps them already.
    // For simplicity, we will just adjust the margins based on where the user IS pointing relative to the center
    // However, a true calibration requires raw normalized inputs.
    // Given the complexity of passing raw data up, we'll stick to a "Smart Fit" or just rely on the 'Sensitivity' setting which scales movement.
    // Let's simplify calibration to just an instruction screen for now, as Sensitivity slider covers most "reach" issues.

    // Instead of complex mapping, we'll just confirm they are ready.
    setGameState(GameState.MENU);
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-black select-none"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {/* Rendering Layer */}
      {settings.mode !== 'book' && (
        <GameCanvas
          key={`level-${levelIndex}`}
          pointer={pointer}
          isPinching={isPinching}
          gameState={gameState}
          settings={settings}
          onScoreUpdate={(s, c) => {
            setScore(s);
            setCombo(c);
            if (s > highScore) setHighScore(s);
          }}
          onPop={(x, y) => {
            setShowHint(false);
            const lvl = levels[levelIndex];
            if (!lvl) return;
            // Build a 4-line cloud from tips or bullet-like splits
            const tips = (lvl.tips && lvl.tips.length)
              ? lvl.tips
              : lvl.content
                .split(/\n|•|\u2022|\-|\–/)
                .map(s => s.trim())
                .filter(s => s.length >= 8);
            if (!tips.length) return;
            const start = (tipIdxRef.current++) % tips.length;
            const lines: string[] = [];
            for (let i = 0; i < 4; i++) lines.push(tips[(start + i) % tips.length]);

            // Add to notes (Knowledge Stack) with dedupe and cap; auto-open on first capture
            const block = lines.join('\n');
            setNotes(prev => {
              const next = prev.includes(block) ? prev : [block, ...prev];
              return next.slice(0, 12);
            });
            if (!notesOpen && !firstNoteOpenedRef.current) {
              setNotesOpen(true);
              firstNoteOpenedRef.current = true;
            }
            // Small smoke puffs that expand from blast (animated cloud formation)
            for (let i = 0; i < 6; i++) {
              const puff = document.createElement('div');
              const offX = (Math.random() - 0.5) * 40;
              const offY = (Math.random() - 0.5) * 30;
              const size = 16 + Math.random() * 20;
              puff.style.position = 'absolute';
              puff.style.left = `${Math.max(0, Math.min(x + offX, window.innerWidth - size))}px`;
              puff.style.top = `${Math.max(0, Math.min(y + offY, window.innerHeight - size))}px`;
              puff.style.width = `${size}px`;
              puff.style.height = `${size}px`;
              puff.style.borderRadius = '9999px';
              puff.style.background = 'radial-gradient(ellipse at center, rgba(255,255,255,0.8), rgba(255,255,255,0.0))';
              puff.style.zIndex = '40';
              puff.style.opacity = '0.9';
              puff.style.transform = 'scale(0.6)';
              puff.style.transition = 'transform 600ms ease-out, opacity 600ms ease-out';
              document.body.appendChild(puff);
              requestAnimationFrame(() => {
                puff.style.transform = 'scale(1.4)';
                puff.style.opacity = '0';
              });
              setTimeout(() => puff.remove(), 650);
            }

            // Proper text cloud bubble that fades
            const id = Math.random().toString(36).slice(2);
            const el = document.createElement('div');
            el.id = id;
            el.style.position = 'absolute';
            el.style.left = `${Math.max(8, Math.min(x - 130, window.innerWidth - 300))}px`;
            el.style.top = `${Math.max(8, Math.min(y - 120, window.innerHeight - 200))}px`;
            el.style.zIndex = '50';
            el.style.maxWidth = '280px';
            el.style.pointerEvents = 'none';
            const list = lines.map(line => `<div class=\"leading-snug\">• ${line.replace(/</g, '&lt;')}</div>`).join('');
            el.innerHTML = `<div class=\"bg-white/95 shadow-xl rounded-2xl p-3 border border-sky-100\"> 
              <div class=\"text-xs text-slate-500 mb-1\">North Star</div>
              <div class=\"text-slate-700 text-sm\">${list}</div>
            </div>`;
            document.body.appendChild(el);
            setTimeout(() => {
              el.style.transition = 'opacity 400ms ease-out, transform 400ms ease-out';
              el.style.opacity = '0';
              el.style.transform = 'translateY(-8px)';
              setTimeout(() => el.remove(), 450);
            }, 1800);
          }}
          totalBalloons={10}
          onCountsUpdate={(popped, target, active) => {
            setProgress({ popped, target, active });
          }}
          onCleared={() => {
            // When all balloons for this level are popped, go to quiz
            setGameState(GameState.QUIZ);
            // Ensure Notes panel remains accessible during quiz
            if (!notesOpen && notes.length > 0) setNotesOpen(true);
          }}
          resetKey={`level-${levelIndex}`}
          theme={settings.mode === 'themed' ? (levels[levelIndex]?.title || '') : 'balloon'}
          width={dimensions.width}
          height={dimensions.height}
        />)}

      {/* PDF Upload Modal */}
      {showPdfUpload && (
        <PdfUpload
          onPdfLoaded={(levels, filename) => {
            setPdfLevels(levels);
            setPdfFilename(filename);
            setShowPdfUpload(false);
            setSettings(prev => ({ ...prev, mode: 'book' as any }));
            startBook();
          }}
          onCancel={() => setShowPdfUpload(false)}
        />
      )}

      {/* Book View */}
      {settings.mode === 'book' && (
        <BookView
          levels={pdfLevels || levels} // Use PDF levels if available, otherwise default levels
          pointer={pointer}
          isPinching={(gameState === GameState.PLAYING) && (settings.bookRequirePinch ? isPinching : true)}
          onChapterQuiz={() => { /* quizzes disabled in book mode per request */ }}
          bookTitle={pdfFilename || undefined} // Add bookTitle prop
          isMobile={isMobile}
        />
      )}
      {/* Sync book flip mode global for BookView */}
      <script dangerouslySetInnerHTML={{ __html: `window.__BOOK_FLIP_MODE='${settings.bookFlipMode}';` }} />

      {/* Input Layer */}
      {settings.inputMode !== 'mouse' && (
        <WebcamHandler
          enabled={true}
          onUpdate={handleWebcamUpdate}
          calibration={calibration}
          smoothingAmount={settings.smoothing}
          screenWidth={dimensions.width}
          screenHeight={dimensions.height}
          inputMode={(settings.mode === 'book') ? 'hands' : (settings.inputMode === 'eyes' ? 'eyes' : 'hands')}
          blinkToFire={settings.blinkToFire}
        />
      )}

      {/* HUD Layer (Always visible when playing) */}
      {gameState === GameState.PLAYING && (
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none">
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              {score.toLocaleString()}
            </h1>
            <p className="text-sm font-bold text-sky-100 uppercase tracking-widest opacity-80">Score</p>
          </div>

          <div className={`flex flex-col items-end transition-opacity duration-300 ${combo > 1 ? 'opacity-100' : 'opacity-0'}`}>
            <h2 className="text-5xl font-black text-yellow-400 drop-shadow-[0_2px_10px_rgba(234,179,8,0.5)] animate-pulse">
              x{combo}
            </h2>
            <p className="text-sm font-bold text-yellow-100 uppercase tracking-widest">Streak</p>
          </div>

          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/40 text-white px-4 py-2 rounded-full pointer-events-none text-sm">
            Level {levelIndex + 1}/{levels.length} • {settings.mode === 'themed' ? (levels[levelIndex]?.title || 'Classic') : 'Classic'} • {progress.popped}/{progress.target}
          </div>

          {/* Tiny objective hint based on level title keywords */}
          <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="bg-black/30 text-white px-3 py-1 rounded-full text-xs">
              {(() => {
                const t = (levels[levelIndex]?.title || '').toLowerCase();
                if (/trusted|security|governance/.test(t)) return 'Hint: Tap the lock (top-left) to unlock pops';
                if (/resilient/.test(t)) return 'Hint: Hold steady on a target to stabilize';
                if (/process/.test(t)) return 'Hint: Pop in order 1 → 2 → 3';
                if (/ecosystem|integration/.test(t)) return 'Hint: Use portal rings to chain hits';
                if (/ux|vision|experience/.test(t)) return 'Hint: Grab the blue capsule after a pop';
                return 'Hint: Align and pinch to pop';
              })()}
            </div>
          </div>
        </div>
      )}

      {/* In-game hint for controls */}
      {gameState === GameState.PLAYING && showHint && settings.mode !== 'book' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="bg-black/60 text-white px-4 py-2 rounded-full text-sm">
            Align crosshair on a balloon and pinch to pop
          </div>
        </div>
      )}

      {/* Hand Loss Warning */}
      {!isHandDetected && !settings.useMouseFallback && gameState === GameState.PLAYING && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none z-40">
          <div className="bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
            <span className="font-semibold tracking-wide">Hand not detected</span>
          </div>
        </div>
      )}

      {/* Menus Overlay */}
      <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">

        {/* Main Menu */}
        {gameState === GameState.MENU && (
          <div className="bg-white/90 backdrop-blur-xl p-12 rounded-3xl shadow-2xl text-center max-w-md w-full pointer-events-auto transform transition-all hover:scale-[1.01]">
            <div className="mb-8">
              <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-400 mb-2">
                Sky Popper
              </h1>
              <p className="text-slate-500 font-medium">Pop balloons using your hand or mouse!</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={startGame}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-blue-500/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="fill-white" /> Start Game
                </button>
                <button
                  onClick={() => { setSettings(prev => ({ ...prev, mode: 'book' as any })); startBook(); }}
                  className="w-full py-4 bg-gradient-to-r from-amber-600 to-yellow-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-yellow-500/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="fill-white" /> Read Book
                </button>
                <button
                  onClick={() => setShowPdfUpload(true)}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-purple-500/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  Upload PDF
                </button>
              </div>

              {!settings.useMouseFallback && (
                <button
                  onClick={startCalibration}
                  className="w-full py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-2"
                >
                  <Target className="w-5 h-5" /> Calibrate Hand
                </button>
              )}

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="w-full py-3 bg-white text-slate-400 hover:text-slate-600 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" /> Settings
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between text-xs text-slate-400 font-medium uppercase tracking-wider">
              <span>High Score: {highScore}</span>
              <span>{settings.useMouseFallback ? 'Mouse Mode' : 'Camera Mode'}</span>
            </div>
          </div>
        )}

        {/* Calibration Screen */}
        {gameState === GameState.CALIBRATION && (
          <div className="bg-black/80 backdrop-blur-md absolute inset-0 flex flex-col items-center justify-center text-white pointer-events-auto text-center p-8">
            <Target className="w-16 h-16 text-sky-400 mb-6 animate-pulse" />
            <h2 className="text-3xl font-bold mb-4">Check Your Reach</h2>
            <p className="max-w-md text-lg text-slate-300 mb-8 leading-relaxed">
              Move your hand to the corners of the screen. <br />
              If the cursor feels too slow, increase <b>Sensitivity</b> in settings.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setGameState(GameState.MENU);
                  setIsSettingsOpen(true);
                }}
                className="px-6 py-3 rounded-lg border border-white/20 hover:bg-white/10 transition-colors"
              >
                Open Settings
              </button>
              <button
                onClick={() => setGameState(GameState.MENU)}
                className="px-8 py-3 rounded-lg bg-sky-500 hover:bg-sky-400 font-bold text-white shadow-lg transition-colors"
              >
                I'm Ready
              </button>
            </div>
          </div>
        )}

        {/* Level Intro overlay removed for uninterrupted flow */}

        {/* Quiz Overlay */}
        {gameState === GameState.QUIZ && (
          <div className="bg-white/95 backdrop-blur-xl p-10 rounded-3xl shadow-2xl text-left max-w-2xl w-full pointer-events-auto">
            {(() => {
              const lvl = levels[levelIndex];
              const q = lvl?.questions[quizState.q];
              if (!lvl || !q) {
                return (
                  <div>
                    <p className="mb-4">No questions for this level.</p>
                    <button
                      onClick={() => setGameState(GameState.SUMMARY)}
                      className="px-6 py-3 bg-sky-600 text-white font-bold rounded-lg"
                    >Continue</button>
                  </div>
                );
              }
              return (
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Level {levelIndex + 1} Quiz</div>
                  <h3 className="text-xl font-bold mb-4">{q.question}</h3>
                  <div className="grid gap-3">
                    {q.choices.map((c, i) => {
                      const isSel = quizState.selected === i;
                      const isCorrect = i === q.correctIndex;
                      let cls = 'px-4 py-3 rounded-lg border text-left';
                      if (quizState.selected !== undefined) {
                        cls += isCorrect ? ' border-green-500 bg-green-50' : isSel ? ' border-red-500 bg-red-50' : ' opacity-60';
                      } else {
                        cls += ' border-slate-200 hover:bg-slate-100';
                      }
                      return (
                        <button
                          key={i}
                          disabled={quizState.selected !== undefined}
                          onClick={() => {
                            const correct = i === q.correctIndex;
                            setQuizState((prev) => ({ ...prev, selected: i, correct: prev.correct + (correct ? 1 : 0) }));
                            if (correct) setScore((s) => s + 50); // bonus points
                          }}
                          className={cls}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-5 flex gap-3">
                    {quizState.selected !== undefined ? (
                      <button
                        onClick={() => {
                          const nextQ = quizState.q + 1;
                          const hasMore = nextQ < levels[levelIndex].questions.length;
                          if (hasMore) {
                            setQuizState({ q: nextQ, correct: quizState.correct, selected: undefined });
                          } else {
                            setGameState(GameState.SUMMARY);
                          }
                        }}
                        className="px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg"
                      >Next</button>
                    ) : (
                      <div className="text-slate-400">Select an option</div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Level Summary */}
        {gameState === GameState.SUMMARY && (
          <div className="bg-white/95 backdrop-blur-xl p-10 rounded-3xl shadow-2xl text-left max-w-xl w-full pointer-events-auto">
            <h3 className="text-2xl font-black text-sky-700 mb-2">Level {levelIndex + 1} Complete</h3>
            <p className="text-slate-700 mb-4">Correct answers: {quizState.correct} / {levels[levelIndex]?.questions.length || 0}</p>
            <div className="flex gap-3">
              {levelIndex + 1 < levels.length ? (
                <button
                  onClick={() => {
                    setLevelIndex((i) => i + 1);
                    setQuizState({ q: 0, correct: 0, selected: undefined });
                    tipIdxRef.current = 0;
                    setProgress({ popped: 0, target: 10, active: 0 });
                    setGameState(GameState.PLAYING);
                  }}
                  className="px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg"
                >Next Level</button>
              ) : (
                <button
                  onClick={() => setGameState(GameState.GAME_OVER)}
                  className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg"
                >Finish Journey</button>
              )}
              <button onClick={() => setGameState(GameState.MENU)} className="px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-lg">Menu</button>
            </div>
          </div>
        )}

        {/* Game Over */}
        {gameState === GameState.GAME_OVER && (
          <div className="bg-white/95 backdrop-blur-xl p-10 rounded-3xl shadow-2xl text-center max-w-lg w-full pointer-events-auto">
            <h3 className="text-3xl font-black text-green-700 mb-2">North Star Journey Complete</h3>
            <p className="text-slate-700 mb-4">Total Score: {score.toLocaleString()}</p>
            <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 mb-6">
              {levels.map((lvl, i) => (
                <div key={lvl.id} className={`px-2 py-1 rounded-md border ${i <= levelIndex ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-white'}`}>{i + 1}. {lvl.title.split(':')[0]}</div>
              ))}
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={startGame} className="px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg">Replay</button>
              <button onClick={() => setGameState(GameState.MENU)} className="px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-lg">Menu</button>
            </div>
          </div>
        )}

      </div>

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        updateSettings={(newSettings) => setSettings(prev => ({ ...prev, ...newSettings }))}
      />

      {/* Notes Toggle (global) */}
      <div className="fixed top-6 right-6 z-50 pointer-events-auto">
        <button onClick={() => setNotesOpen(o => !o)} className="px-3 py-2 rounded-lg bg-white/80 hover:bg-white text-slate-700 text-sm border border-slate-200 shadow">
          {notesOpen ? 'Hide Notes' : `Show Notes (${notes.length})`}
        </button>
      </div>

      {/* Notes Sidebar */}
      <NotesSidebar isOpen={notesOpen} onClose={() => setNotesOpen(false)} notes={notes} levelTitle={levels[levelIndex]?.title || ''} />

      {/* Floating Settings Button (when playing or menu) */}
      {!isSettingsOpen && gameState !== GameState.CALIBRATION && (
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="absolute top-6 right-6 z-30 p-3 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/30 transition-all pointer-events-auto"
        >
          <Settings className="w-6 h-6" />
        </button>
      )}

      {/* Return to Menu Button (when playing) */}
      {gameState === GameState.PLAYING && (
        <button
          onClick={() => setGameState(GameState.MENU)}
          className="absolute bottom-6 left-6 z-30 p-3 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/30 transition-all pointer-events-auto"
          title="Quit to Menu"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
      )}

    </div>
  );
};

export default App;
