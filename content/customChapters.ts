import { Level } from '../types';

// Utility: map generic questions to role-specific variants
const roleAdjust = (role: 'architect'|'developer'|'manager'|undefined, q: string): string => {
  if (!role) return q;
  const lc = q.toLowerCase();
  // Simple tailoring by keywords; keep semantics the same
  if (role === 'architect') {
    return q.replace(/(which|what)/i, '$1 (architecture)');
  }
  if (role === 'developer') {
    return q.replace(/(which|what)/i, '$1 (implementation)');
  }
  if (role === 'manager') {
    return q.replace(/(which|what)/i, '$1 (outcome/impact)');
  }
  return q;
};

export const loadCustomChapters = (): Level[] => {
  const levels: Level[] = [
    {
      id: '01-exec-summary',
      title: 'Executive Summary',
      content:
        'Why SAP must transition from AI-first to AI-native. Customers expect intelligent, adaptive, outcome-oriented systems. AI-native embeds intelligence into workflows; SAP’s edge is trusted process depth plus business data and enterprise trust. Introduces the Cognitive Core: System‑1 fast, System‑2 deliberate, and meta‑learning. Deterministic systems are augmented, not replaced.',
      tips: [
        'Enterprises expect adaptive, outcome-oriented systems',
        'AI-native embeds intelligence into workflows',
        'Agentic platforms need shared context and orchestration',
        'SAP advantage: process depth + business data + trust',
        'Cognitive Core: System‑1 + System‑2 + meta‑learning',
        'Deterministic systems are augmented, not replaced',
        'Disrupt ourselves, or be disrupted',
      ],
      questions: [
        { question: 'AI-native vs AI-first — which is true?', choices: [ 'AI-native embeds intelligence into workflows', 'AI-first replaces all deterministic systems', 'AI-native removes governance', 'AI-first means outcome-only orchestration' ], correctIndex: 0 },
        { question: 'Cognitive Core combines which ideas?', choices: [ 'System‑1 + System‑2 + meta‑learning', 'Only rule engines', 'Only large models', 'Only data lakes' ], correctIndex: 0 },
        { question: 'Deterministic systems are…', choices: [ 'Augmented, not replaced', 'Deprecated immediately', 'Incompatible with AI', 'Hidden' ], correctIndex: 0 },
        { question: 'SAP’s advantage is…', choices: [ 'Process depth + data + trust', 'Only model size', 'Cheapest compute', 'No governance' ], correctIndex: 0 },
        { question: 'Why shift to AI-native?', choices: [ 'Meet expectations for adaptive systems', 'Reduce all costs to zero', 'Replace UX with CLI', 'Avoid regulations' ], correctIndex: 0 },
      ],
    },
    {
      id: '02-vision',
      title: 'AI-Native North Star Vision',
      content:
        'Defines the AI-native enterprise and the continuous intelligence loop across Experience, Process, Foundation, and Platform. Joule is the intent interpreter. MCP and A2A enable shared understanding. Lead‑to‑cash becomes predictive and proactive with trusted context.',
      tips: [
        'Evolve from deterministic to cognitive systems',
        'Intelligence spans Experience, Process, Foundation, Platform',
        'Continuous loop: Apps → Data → AI → Apps',
        'Joule interprets intent and orchestrates',
        'MCP + A2A enable shared understanding',
        'Context engineering preserves trust and accuracy',
      ],
      questions: [
        { question: 'Which layers are in scope?', choices: [ 'Experience, Process, Foundation, Platform', 'Frontend, Backend, DB', 'ETL, BI, UX', 'Model, View, Controller' ], correctIndex: 0 },
        { question: 'What forms the intelligence flywheel?', choices: [ 'Apps → Data → AI → Apps', 'Dev → Test → Prod', 'ETL → BI → Dash', 'Plan → Build → Run' ], correctIndex: 0 },
        { question: 'Joule’s role is…', choices: [ 'Intent interpreter and orchestrator', 'Only chat UI', 'Only email sender', 'Only model host' ], correctIndex: 0 },
        { question: 'Shared understanding via…', choices: [ 'MCP and A2A', 'Screenshots', 'Manual exports', 'ETL scripts' ], correctIndex: 0 },
        { question: 'Trust is preserved by…', choices: [ 'Context engineering + neuro-symbolic logic', 'No governance', 'Random sampling', 'Opaque prompts' ], correctIndex: 0 },
      ],
    },
    {
      id: '03-ux',
      title: 'User Experience Layer: Cognitive Interface',
      content:
        'UX is the primary interface to enterprise intelligence. Joule is conversational and multimodal. UX must be adaptive, context‑aware, and privacy‑preserving; built on ONE Design System, Kernel Services, and reusable components. Future: Gen UI, Voice AI, human‑in‑the‑loop, physical AI.',
      tips: [
        'UX shifts from navigation to outcomes',
        'Joule: conversational, multimodal interface',
        'UX must be adaptive and context‑aware',
        'Privacy controls are first‑class',
        'ONE Design System + Kernel Services + reusable UI',
        'Future: Gen UI, Voice AI, human‑in‑the‑loop',
      ],
      questions: [
        { question: 'Joule’s UX role is…', choices: [ 'Interpret intent and orchestrate', 'Replace security', 'Only render dashboards', 'Manage billing' ], correctIndex: 0 },
        { question: 'UX must be…', choices: [ 'Adaptive and context‑aware', 'Static and manual', 'Opaque and automatic', 'Schema‑only' ], correctIndex: 0 },
        { question: 'Future capability example is…', choices: [ 'Gen UI & Voice AI', 'Manual macros', 'SMTP UI', 'Disk RAID' ], correctIndex: 0 },
        { question: 'Privacy is…', choices: [ 'First‑class in UX', 'Optional', 'Only for admins', 'Unrelated' ], correctIndex: 0 },
        { question: 'ONE Design System means…', choices: [ 'Coherent, reusable UI', 'No guidelines', 'Random widgets', 'Only mobile' ], correctIndex: 0 },
      ],
    },
    {
      id: '04-process',
      title: 'Process Layer: Deterministic + Agentic',
      content:
        'Traditional apps and AI agents coexist. Deterministic apps (CAP/ABAP/Fiori) run with reliability; agentic apps plan and act. Joule Studio enables governed low‑code agents; pro‑code follows the Agent Golden Path. Agents run on shared AI Core, publish metadata via ORD, and are discoverable via UMS/Knowledge Graph. MCP and A2A decouple agents from core systems.',
      tips: [
        'Deterministic apps and agentic apps coexist',
        'Governed low‑code agents in Joule Studio',
        'Pro‑code agents follow the Agent Golden Path',
        'Agents on shared AI Core; metadata via ORD',
        'Discoverable via UMS and Knowledge Graph',
        'MCP + A2A decouple agents from core systems',
      ],
      questions: [
        { question: 'What coexists in the process layer?', choices: [ 'Deterministic apps and agentic apps', 'Only agents', 'Only ABAP', 'Only LLMs' ], correctIndex: 0 },
        { question: 'Agents should be…', choices: [ 'Governed and discoverable', 'Untracked and ad‑hoc', 'Hardcoded only', 'Local only' ], correctIndex: 0 },
        { question: 'Low‑code agents live in…', choices: [ 'Joule Studio', 'ABAP CDS', 'SAPGUI', 'Console' ], correctIndex: 0 },
        { question: 'Metadata backbone is…', choices: [ 'ORD', 'CSV', 'Swagger only', 'PDF' ], correctIndex: 0 },
        { question: 'Separation from core via…', choices: [ 'MCP and A2A', 'SSH', 'SCP', 'SMTP' ], correctIndex: 0 },
      ],
    },
    {
      id: '05-foundation',
      title: 'Foundation Layer: Intelligent Core',
      content:
        'AI as an operating system. Joule Orchestrator manages agent lifecycles. Context engineering is first‑class. Knowledge Graph + Vector Engine ground reasoning; agentic RAG replaces naive RAG. Safety, alignment, observability built‑in. Reusable intelligence skills avoid duplication. Data & Knowledge: BDC with Data Products, ORD metadata, Knowledge Graph semantics, governed Customer Data Hub, Business Data Agents for analysis.',
      tips: [
        'AI treated as an operating system',
        'Joule Orchestrator manages agents',
        'Context engineering is first‑class',
        'Knowledge Graph + Vector Engine ground reasoning',
        'Agentic RAG replaces naive RAG',
        'Safety, alignment, observability are built‑in',
      ],
      questions: [
        { question: 'Which grounds reasoning?', choices: [ 'Knowledge Graph + Vector Engine', 'CSV imports', 'Screenshots', 'Email threads' ], correctIndex: 0 },
        { question: 'What replaces naive RAG?', choices: [ 'Agentic RAG', 'Manual ETL', 'Vectorless search', 'N‑gram match' ], correctIndex: 0 },
        { question: 'Joule Orchestrator…', choices: [ 'Manages agent lifecycles', 'Draws icons', 'Sends mail', 'Compiles code' ], correctIndex: 0 },
        { question: 'Reusable intelligence skills help…', choices: [ 'Prevent duplication', 'Add latency', 'Hide state', 'Reduce observability' ], correctIndex: 0 },
        { question: 'Safety/alignment/observability are…', choices: [ 'Built‑in', 'Afterthoughts', 'Unscoped', 'External only' ], correctIndex: 0 },
      ],
    },
    {
      id: '06-platform',
      title: 'Platform Layer: Engine of Scale',
      content:
        'BTP is the unifying substrate for deterministic and AI‑native workloads: service‑centric, multi‑cloud, hyperscaler‑agnostic. Golden Path brings enterprise qualities by default; provisioning hides complexity; partners/ISVs innovate with SAP‑grade governance. AppFND: app.yaml declarative contract; SDKs/services/templates; embedded security and observability; AI‑assisted development and migration; intent‑driven design.',
      tips: [
        'BTP unifies deterministic and AI‑native workloads',
        'Service‑centric and hyperscaler‑agnostic',
        'Golden Path bakes in enterprise qualities',
        'AppFND: declarative app.yaml + SDKs + services',
        'Embedded security and observability',
        'Intent‑driven development at scale',
      ],
      questions: [
        { question: 'BTP provides…', choices: [ 'Unifying substrate across clouds', 'Only on‑prem', 'No governance', 'Single‑tenant only' ], correctIndex: 0 },
        { question: 'AppFND emphasizes…', choices: [ 'Declarative app.yaml and reusable services', 'Manual scripts', 'Ad‑hoc infra', 'UI‑only' ], correctIndex: 0 },
        { question: 'Golden Path ensures…', choices: [ 'Enterprise qualities by default', 'Random defaults', 'No logging', 'DIY only' ], correctIndex: 0 },
        { question: 'Partners/ISVs can…', choices: [ 'Innovate with governance', 'Modify kernels', 'Skip identity', 'Bypass audits' ], correctIndex: 0 },
        { question: 'AppFND includes…', choices: [ 'SDKs, services, templates', 'Only UI', 'Only ABAP', 'Only DB' ], correctIndex: 0 },
      ],
    },
    {
      id: '07-trusted-fabric',
      title: 'Trusted Fabric: Integration, Security, Governance',
      content:
        'Integration shifts to SAP‑managed automation with unified services; AI‑driven and dynamic. Security: new agentic attack surfaces; Three‑Tier AI Defense, AI Identity, supervision agents, automated security ops. Governance: central AI inventory and risk classification, model access with controls, regulatory alignment (EU AI Act, ISO, NIST).',
      tips: [
        'Integration becomes AI‑driven and automated',
        'Three‑Tier AI Defense Architecture',
        'AI Identity and supervision agents',
        'Automated security operations',
        'Central AI inventory and risk classification',
        'Regulatory alignment: EU AI Act, ISO, NIST',
      ],
      questions: [
        { question: 'Trusted Fabric covers…', choices: [ 'Integration, Security, Governance', 'Only UX', 'Only ABAP', 'Only storage' ], correctIndex: 0 },
        { question: 'Why needed?', choices: [ 'License to operate in enterprise', 'Fun UI', 'Faster CSS', 'Cheaper disks' ], correctIndex: 0 },
        { question: 'AI Identity + supervision…', choices: [ 'Secure agent actions', 'Slow UIs', 'Replace UX', 'Remove logs' ], correctIndex: 0 },
        { question: 'Unified services help…', choices: [ 'Automate integration', 'Remove APIs', 'Manual wiring', 'Reduce semantics' ], correctIndex: 0 },
        { question: 'Regulatory alignment includes…', choices: [ 'EU AI Act, ISO, NIST', 'IRC', 'FTP', 'NTP' ], correctIndex: 0 },
      ],
    },
    {
      id: '08-ecosystem',
      title: 'Ecosystem Layer: Marketplace',
      content:
        'SAP becomes a network of intelligence. Unified discovery of APIs, data products, agents, and tools. ORD + API Hub + BDC Marketplace + Agent Registries unify discovery. LeanIX Agent Hub serves as system registry. Safe reuse through contracts and provenance enables compound innovation.',
      tips: [
        'Network of intelligence, not a closed suite',
        'Unified discovery: APIs, data products, agents, tools',
        'ORD + hubs + registries unify discovery',
        'Safe reuse via contracts and provenance',
      ],
      questions: [
        { question: 'Ecosystem goal is…', choices: [ 'Compound innovation via safe reuse', 'Closed suite only', 'Random extensions', 'Untracked agents' ], correctIndex: 0 },
        { question: 'Discovery is unified through…', choices: [ 'ORD + hubs/registries', 'Email lists', 'Manual PDFs', 'Local caches' ], correctIndex: 0 },
        { question: 'LeanIX Agent Hub acts as…', choices: [ 'System registry', 'CI server', 'Static site', 'ML platform' ], correctIndex: 0 },
        { question: 'Provenance ensures…', choices: [ 'Safe reuse', 'Faster CSS', 'Bigger models', 'Looser QA' ], correctIndex: 0 },
        { question: 'Platform becomes…', choices: [ 'Network of intelligence', 'CMS only', 'Data lake only', 'IDE only' ], correctIndex: 0 },
      ],
    },
    {
      id: '09-resilient-cloud',
      title: 'Resilient Cloud: Global Ops',
      content:
        'AI‑native systems require AI‑native operations. Public/private/sovereign cloud strategies. Portability, elasticity, resilience as design constraints. AIOps for predictive remediation. Cloud ALM becomes AI‑aware.',
      tips: [
        'AI‑native systems need AI‑native operations',
        'Portability, elasticity, resilience by design',
        'AIOps enables predictive remediation',
        'Cloud ALM becomes AI‑aware',
      ],
      questions: [
        { question: 'Why Resilient Cloud?', choices: [ 'Operate intelligence at global scale', 'Just cheaper VMs', 'UI animations', 'Experimental use only' ], correctIndex: 0 },
        { question: 'AIOps provides…', choices: [ 'Predictive remediation', 'Manual paging', 'No telemetry', 'Static scripts' ], correctIndex: 0 },
        { question: 'Resilience is a…', choices: [ 'Design constraint', 'Nice to have', 'Only UX', 'Only QA' ], correctIndex: 0 },
        { question: 'Portability & elasticity are…', choices: [ 'Required', 'Optional', 'Deprecated', 'Hidden' ], correctIndex: 0 },
        { question: 'Cloud ALM becomes…', choices: [ 'AI‑aware', 'File server', 'Queue only', 'CMS' ], correctIndex: 0 },
      ],
    },
    {
      id: '10-future',
      title: 'Future Pillar: Quantum Era',
      content:
        'Preparation for post‑classical compute. Probabilistic reasoning aligns with AI workflows. Early abstractions avoid future disruption and keep SAP future‑proof.',
      tips: [
        'Prepare for the quantum era',
        'Probabilistic reasoning fits AI workflows',
        'Early abstractions avoid future disruption',
      ],
      questions: [
        { question: 'Future Pillar signals…', choices: [ 'Preparation for quantum‑era compute', 'Dropping AI', 'Only graphics upgrades', 'No change' ], correctIndex: 0 },
        { question: 'Benefit of early abstractions?', choices: [ 'Avoid future disruption', 'More GUIs', 'Bigger logs', 'No ops' ], correctIndex: 0 },
        { question: 'Probabilistic reasoning…', choices: [ 'Aligns with AI workflows', 'Breaks all ML', 'Is identical to SQL', 'Removes semantics' ], correctIndex: 0 },
        { question: 'Goal is to be…', choices: [ 'Future‑proof, not reactive', 'Static', 'Rule‑only', 'UI‑only' ], correctIndex: 0 },
        { question: 'Quantum preparation requires…', choices: [ 'Abstractions early', 'Ignore research', 'Delete telemetry', 'Manual tickets' ], correctIndex: 0 },
      ],
    },
  ];
  return levels;
};
