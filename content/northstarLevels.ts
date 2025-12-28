import rawText from '../northstar.txt?raw';
import { Level, QuizQuestion } from '../types';

const pick = (text: string, startKey: string, nextKeys: string[]): string => {
  const lower = text.toLowerCase();
  const start = lower.indexOf(startKey.toLowerCase());
  if (start === -1) return '';
  let end = text.length;
  for (const k of nextKeys) {
    const i = lower.indexOf(k.toLowerCase(), start + startKey.length);
    if (i !== -1) end = Math.min(end, i);
  }
  return text.slice(start, end).trim();
};

const summarize = (text: string, max = 400): string => {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  // Try to cut at sentence boundary
  const cut = t.slice(0, max).lastIndexOf('. ');
  return (cut > 80 ? t.slice(0, cut + 1) : t.slice(0, max) + '…');
};

const mkQ = (question: string, choices: string[], correct: number): QuizQuestion => ({
  question,
  choices,
  correctIndex: correct,
});

export const loadNorthstarLevels = (): Level[] => {
  const text = rawText || '';

  const sections = [
    {
      id: 'exec',
      title: 'Executive Summary: AI-Native vs AI-First',
      key: '1. EXECUTIVE SUMMARY',
      next: ['2. AI-NATIVE', 'Table of Contents'],
      fallback: 'Shift from AI-first features to an AI-native model that embeds intelligence into the workflow, with reasoning and learning loops that adapt continuously while preserving enterprise trust and governance.',
      questions: [
        mkQ(
          'What does AI-native primarily emphasize compared to AI-first?',
          [
            'Embedding intelligence into workflows with learning loops',
            'Adding standalone AI features after release',
            'Replacing data governance with speed',
            'Focusing only on model accuracy'
          ],
          0
        ),
        mkQ(
          'Which advantage is highlighted for AI-native enterprise systems?',
          [
            'Manual checks across apps',
            'Continuous adaptation using feedback and data',
            'Less need for integration',
            'No dependency on business context'
          ],
          1
        ),
      ],
    },
    {
      id: 'vision',
      title: 'North Star Vision and Layers',
      key: '2. AI-NATIVE NORTH STAR VISION',
      next: ['3. USER EXPERIENCE LAYER'],
      fallback: 'A unified model of intelligence across Experience, Process, Foundation, and Platform layers creates a continuous flywheel where data informs reasoning, reasoning drives action, and actions generate new data.',
      questions: [
        mkQ(
          'Which layers form the North Star architecture?',
          [
            'Frontend, Backend, Database',
            'Experience, Process, Foundation, Platform',
            'UI, API, Data',
            'Model, View, Controller'
          ],
          1
        ),
        mkQ(
          'What reinforces the continuous intelligence loop?',
          [
            'Brittle rule engines',
            'Apps → Data → AI → Apps flywheel',
            'Manual approvals only',
            'Static ETL pipelines'
          ],
          1
        ),
      ],
    },
    {
      id: 'ux-process',
      title: 'Experience and Process: Joule and Agents',
      key: '3. USER EXPERIENCE LAYER',
      next: ['4. PROCESS LAYER'],
      fallback: 'Joule interprets user intent and orchestrates actions across applications. Joule Agents plan, reason, and act across systems while preserving the reliability and governance of deterministic processes.',
      questions: [
        mkQ(
          'Joule’s role at the experience layer is to…',
          [
            'Render dashboards only',
            'Interpret intent and orchestrate actions',
            'Replace all applications',
            'Manage cloud billing'
          ],
          1
        ),
        mkQ(
          'Process layer evolution emphasizes…',
          [
            'Fixed logic flows',
            'Goal-oriented agentic coordination',
            'Removing governance',
            'Manual cross-team handoffs'
          ],
          1
        ),
      ],
    },
    {
      id: 'foundation',
      title: 'Foundation: Joule OS and Data Core',
      key: '5. FOUNDATION LAYER',
      next: ['6. PLATFORM LAYER'],
      fallback: 'Joule OS orchestrates models, agents, and AI services. Together with Business Data Cloud, Knowledge Graph, and HANA Cloud, it provides a unified semantic layer grounded in trusted data.',
      questions: [
        mkQ(
          'Which element manages lifecycle and orchestration of AI capabilities?',
          ['Joule OS', 'BTP Billing', 'Browser SDK', 'Edge Cache'],
          0
        ),
        mkQ(
          'Trusted data grounding is primarily provided by…',
          [
            'Business Data Cloud + Knowledge Graph',
            'Test doubles',
            'Local CSV files',
            'Email approvals'
          ],
          0
        ),
      ],
    },
    {
      id: 'platform-trust',
      title: 'Platform and Trusted Fabric',
      key: '6. PLATFORM LAYER',
      next: ['7. THE TRUSTED FABRIC', '8. ECOSYSTEM LAYER'],
      fallback: 'SAP BTP and Application Foundation enable trusted, scalable intelligence, while the Trusted Fabric—Integration, Security, Governance—preserves compliance and reliability at scale.',
      questions: [
        mkQ(
          'Trusted Fabric covers which concerns?',
          [
            'Integration, Security, Governance',
            'Only UI design',
            'Payroll processing',
            'Static documentation'
          ],
          0
        ),
        mkQ(
          'Platform layer focus is to…',
          [
            'Slow developer velocity',
            'Enable scalable, trusted intelligence delivery',
            'Remove observability',
            'Avoid extensions'
          ],
          1
        ),
      ],
    },
  ];

  const levels: Level[] = sections.map((s) => {
    const contentSlice = pick(text, s.key, s.next);
    const content = summarize(contentSlice || s.fallback);
    return {
      id: s.id,
      title: s.title,
      content,
      questions: s.questions,
    };
  });

  return levels;
};

