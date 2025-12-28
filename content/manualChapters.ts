import { Level } from '../types';

export const loadManualChapters = (): Level[] => {
  const levels: Level[] = [
    {
      id: '01-exec-summary',
      title: 'Executive Summary',
      content:
        'Why SAP must move from AI-first features to AI-native systems. Customers expect intelligent, adaptive, outcome-driven systems. AI-native embeds intelligence into workflows; SAP’s edge is trusted process depth plus business data. Introduces the Cognitive Core (System-1 fast, System-2 deliberate, meta-learning). Deterministic systems are augmented, not replaced. We must disrupt ourselves or be disrupted.',
      questions: [
        { question: 'AI-native vs AI-first — which is true?', choices: [ 'AI-native embeds intelligence into workflows', 'AI-first replaces all deterministic systems', 'AI-native removes governance', 'AI-first means outcome-first orchestration' ], correctIndex: 0 },
        { question: 'Cognitive Core combines which ideas?', choices: [ 'System-1 + System-2 + meta-learning', 'Only rule engines', 'Only large models', 'Only data lakes' ], correctIndex: 0 }
      ]
    },
    {
      id: '02-vision',
      title: 'AI-Native North Star Vision',
      content:
        'Defines the AI-native enterprise and how intelligence flows across Experience, Process, Foundation, and Platform. Continuous intelligence loop: Apps → Data → AI → Apps. Joule is the intent interpreter and orchestrator. MCP and A2A enable shared understanding. Example: lead-to-cash becomes predictive and proactive. Context engineering + neuro-symbolic logic preserve trust.',
      questions: [
        { question: 'Which layers are in scope?', choices: [ 'Experience, Process, Foundation, Platform', 'Frontend, Backend, DB', 'ETL, BI, UX', 'Model, View, Controller' ], correctIndex: 0 },
        { question: 'What forms the intelligence flywheel?', choices: [ 'Apps → Data → AI → Apps', 'Dev → Test → Prod', 'ETL → BI → Dash', 'Plan → Build → Run' ], correctIndex: 0 }
      ]
    },
    {
      id: '03-ux',
      title: 'User Experience Layer: Cognitive Interface',
      content:
        'UX reframed as the primary interface to enterprise intelligence. Joule becomes conversational and multimodal. UX must be adaptive, context-aware, and privacy-preserving. Built on ONE Design System, Kernel Services, and reusable components. Future: Gen UI, Voice AI as a service, human-in-the-loop by default, and physical AI interfaces.',
      questions: [
        { question: 'Joule’s UX role is to…', choices: [ 'Interpret intent and orchestrate', 'Replace security', 'Only render dashboards', 'Manage billing' ], correctIndex: 0 },
        { question: 'UX must be…', choices: [ 'Adaptive and context-aware', 'Static and manual', 'Opaque and automatic', 'Schema-only' ], correctIndex: 0 }
      ]
    },
    {
      id: '04-process',
      title: 'Process Layer: Deterministic + Agentic',
      content:
        'Traditional applications and AI agents coexist. Deterministic apps (CAP/ABAP/Fiori) run with governed reliability; agentic apps (low-code and pro-code) plan and act. Joule Studio enables governed low-code agents; pro-code agents follow the Agent Golden Path. Agents run on shared AI Core, publish metadata via ORD, are discoverable via UMS/Knowledge Graph. MCP and A2A decouple from core systems.',
      questions: [
        { question: 'What coexists in the process layer?', choices: [ 'Deterministic apps and agentic apps', 'Only agents', 'Only ABAP', 'Only LLMs' ], correctIndex: 0 },
        { question: 'Agents should be…', choices: [ 'Governed and discoverable', 'Untracked and ad-hoc', 'Hardcoded only', 'Local only' ], correctIndex: 0 }
      ]
    },
    {
      id: '05-foundation',
      title: 'Foundation Layer: Intelligent Core',
      content:
        'AI as an operating system. Joule Orchestrator manages agent lifecycles; context engineering is first-class. Knowledge Graph + Vector Engine ground reasoning; “agentic RAG” replaces naive RAG. Safety, alignment, and observability are built-in. Reusable intelligence skills avoid duplication. Data & Knowledge: BDC standardizes via Data Products, ORD as metadata backbone, Knowledge Graph provides semantics, governed Customer Data Hub, Business Data Agents deliver analytical reasoning.',
      questions: [
        { question: 'Which grounds reasoning?', choices: [ 'Knowledge Graph + Vector Engine', 'CSV imports', 'Screenshots', 'Email threads' ], correctIndex: 0 },
        { question: 'What replaces naive RAG?', choices: [ 'Agentic RAG', 'Manual ETL', 'Vectorless search', 'N-gram match' ], correctIndex: 0 }
      ]
    },
    {
      id: '06-platform',
      title: 'Platform Layer: Engine of Scale',
      content:
        'BTP is the unifying substrate for deterministic and AI-native workloads: service-centric, multi-cloud, hyperscaler-agnostic. Golden Path brings enterprise qualities by default; provisioning hides complexity; partners/ISVs innovate with governance. App Foundation (AppFND): app.yaml as declarative contract, SDKs/services/templates, embedded security and observability, AI-assisted development and migration, intent-driven design (Project Nova).',
      questions: [
        { question: 'BTP provides…', choices: [ 'Unifying substrate across clouds', 'Only on-prem', 'No governance', 'Single-tenant only' ], correctIndex: 0 },
        { question: 'AppFND emphasizes…', choices: [ 'Declarative app.yaml and reusable services', 'Manual scripts', 'Ad-hoc infra', 'UI-only' ], correctIndex: 0 }
      ]
    },
    {
      id: '07-trusted-fabric',
      title: 'Trusted Fabric: Integration, Security, Governance',
      content:
        'Integration shifts to SAP-managed automation with unified services; AI-driven, dynamic. Security: new agentic attack surfaces; Three-Tier AI Defense, AI Identity, supervision agents, automated security ops. Governance: central AI inventory and risk classification, no general-purpose model provision without controls, regulatory alignment (EU AI Act, ISO, NIST).',
      questions: [
        { question: 'Trusted Fabric covers…', choices: [ 'Integration, Security, Governance', 'Only UX', 'Only ABAP', 'Only storage' ], correctIndex: 0 },
        { question: 'Why needed?', choices: [ 'License to operate in enterprise', 'Fun UI', 'Faster CSS', 'Cheaper disks' ], correctIndex: 0 }
      ]
    },
    {
      id: '08-ecosystem',
      title: 'Ecosystem Layer: Marketplace',
      content:
        'SAP becomes a network of intelligence. Unified discovery of APIs, data products, agents, and tools. ORD + API Hub + BDC Marketplace + Agent Registries unify discovery. LeanIX Agent Hub as system registry. Safe reuse through contracts and provenance to enable compound innovation across SAP and partners.',
      questions: [
        { question: 'Ecosystem goal is…', choices: [ 'Compound innovation via safe reuse', 'Closed suite only', 'Random extensions', 'Untracked agents' ], correctIndex: 0 },
        { question: 'Discovery is unified through…', choices: [ 'ORD + hubs/registries', 'Email lists', 'Manual PDFs', 'Local caches' ], correctIndex: 0 }
      ]
    },
    {
      id: '09-resilient-cloud',
      title: 'Resilient Cloud: Global Ops',
      content:
        'AI-native systems require AI-native operations. Public/private/sovereign cloud strategies; portability, elasticity, and resilience as design constraints. AIOps enables predictive remediation; Cloud ALM becomes AI-aware. This ensures intelligence survives real-world scale and constraints.',
      questions: [
        { question: 'Why Resilient Cloud?', choices: [ 'Operate intelligence at global scale', 'Just cheaper VMs', 'UI animations', 'Experimental use only' ], correctIndex: 0 },
        { question: 'AIOps provides…', choices: [ 'Predictive remediation', 'Manual paging', 'No telemetry', 'Static scripts' ], correctIndex: 0 }
      ]
    },
    {
      id: '10-future',
      title: 'Future Pillar: Quantum Era',
      content:
        'Signals preparation for post-classical compute. Probabilistic reasoning aligns with AI workflows. Preparing abstractions early avoids future disruption and keeps SAP future-proof, not reactive.',
      questions: [
        { question: 'Future Pillar signals…', choices: [ 'Preparation for quantum-era compute', 'Dropping AI', 'Only graphics upgrades', 'No change' ], correctIndex: 0 },
        { question: 'Benefit of early abstractions?', choices: [ 'Avoid future disruption', 'More GUIs', 'Bigger logs', 'No ops' ], correctIndex: 0 }
      ]
    }
  ];
  return levels;
};

