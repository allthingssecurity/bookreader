import { Level, QuizQuestion } from '../types';

const mkQ = (question: string, choices: string[], correct: number): QuizQuestion => ({ question, choices, correctIndex: correct });

const makeQuestions = (title: string): QuizQuestion[] => {
  const q: QuizQuestion[] = [];
  q.push(mkQ('AI-native emphasizes outcome-oriented workflows. True or False?', ['True', 'False'], 0));
  q.push(mkQ('Trust is preserved by context + governance. True or False?', ['True', 'False'], 0));
  q.push(mkQ('SAP\'s cognitive core includes Joule orchestration. True or False?', ['True', 'False'], 0));
  q.push(mkQ('The Process Layer bridges deterministic and agentic paths. True or False?', ['True', 'False'], 0));
  q.push(mkQ('BTP provides composable services by default. True or False?', ['True', 'False'], 0));
  return q;
};

// Hardcoded formatted content with proper structure
export const loadDocxLevels = async (): Promise<Level[]> => {
  const chapters = [
    {
      id: 'exec-summary',
      title: 'Executive Summary',
      content: [
        'SAP is at a structural inflection point where traditional deterministic enterprise systems must evolve into adaptive, learning systems without sacrificing trust, compliance, or reliability.',
        'Customers now expect enterprise software to be intelligent, intuitive, and seamlessly interconnected across their value chains.',
        'SAP\'s strategic shift is toward AI-native systems, where intelligence is embedded directly into workflows through continuous reasoning, learning, and feedback loops.',
        'The AI-Native North Star Architecture defines this end state. It provides a guiding framework for how experiences, processes, data, platforms, and governance must converge over the next three to five years.',
        'At its heart lies SAP\'s Cognitive Core, where business data, process knowledge, and reasoning models interact. This enables systems that not only automate execution but anticipate outcomes and adapt behavior.',
        'The architecture unifies two complementary paths:\n• The Deterministic Path preserves SAP\'s strengths in reliability, compliance, and systems of record\n• The AI-Native Path introduces agentic reasoning, adaptive workflows, and self-learning mechanisms',
        'Together, they create a compounding intelligence loop where data improves reasoning, reasoning improves processes, and processes generate better data.',
        'By grounding AI in enterprise semantics, governance, and human oversight, SAP positions itself to lead the next era of enterprise software—delivering trusted intelligence at global scale while continuously evolving through experience.'
      ]
    },
    {
      id: 'vision',
      title: 'AI-Native North Star Vision',
      content: `The AI-Native North Star Vision defines SAP's transition from static, rule-driven systems to cognitive systems capable of perception, reasoning, learning, and action.

Rather than treating AI as an external enhancement, intelligence becomes a first-class architectural concern across the entire stack.

This vision is realized through a layered model:

▪ User Experience Layer
Interactions shift from navigation to intent-driven engagement, where Joule interprets goals and orchestrates outcomes.

▪ Process Layer
Workflows evolve from fixed logic into goal-oriented coordination managed by agents that learn from feedback.

▪ Foundation Layer
Provides the AI operating fabric—Joule OS, AI Core, Business Data Cloud, Knowledge Graph—ensuring intelligence is grounded in trusted enterprise data and semantics.

▪ Platform Layer  
Enables this transformation at scale through a unified, governed runtime and developer experience.

Together, these layers form a continuous intelligence flywheel: applications generate data, data fuels AI, AI improves applications.

Context engineering, agent orchestration, and semantic grounding ensure that learning remains relevant, explainable, and compliant.

In practice, this vision transforms end-user workflows. Users express intent in natural language, and SAP systems assemble the right data, agents, and actions across applications.

What once required manual cross-system coordination becomes a single, governed flow that improves with every execution.

The result is faster outcomes, reduced friction, and enterprise intelligence that compounds over time—without abandoning the trust foundations that define SAP.`
    },
    {
      id: 'ux-layer',
      title: 'User Experience Layer',
      content: `The User Experience Layer is where SAP's intelligence becomes tangible to users.

Its purpose is to replace fragmented, persona-based screens with a unified, adaptive, and intelligent experience focused on outcomes rather than navigation.

This layer builds on SAP's existing UX foundations:
• A unified design system
• Shared kernel services
• Reusable UI components

These ensure consistency, accessibility, and efficiency across the suite.

On top of this foundation, SAP introduces adaptive intelligence—interfaces that learn from user behavior, context, and workflows while respecting privacy and user control.

Architecturally, the layer combines design standards, runtime services, and embedded AI.

Conversational interfaces, multimodal interaction (voice, text, gesture, vision), and human-in-the-loop controls are integrated directly into the UI.

Joule and SAP Start act as unified entry points, surfacing insights, tasks, and recommendations across applications.

Embedded analytics, process visibility, and guided adoption tools ensure transparency and trust.

Over time, this layer evolves toward Gen UI, where interfaces are generated dynamically based on context, and toward ambient computing scenarios such as smart glasses and physical AI.

The end state is an adaptive workspace where humans and agents collaborate naturally, intelligence feels intuitive, and governance is visible but unobtrusive.`
    },
    {
      id: 'process-layer',
      title: 'Process Layer',
      content: `The Process Layer connects SAP's deterministic application heritage with emerging agentic systems.

Its role is to ensure that adaptive intelligence enhances—not disrupts—enterprise workflows.

Here, processes evolve from fixed sequences into goal-oriented, learning systems while remaining governed and auditable.

Developers continue to build deterministic applications using established platforms:
• CAP (Cloud Application Programming)
• ABAP Cloud
• SAP BTP services

All following the Golden Path for enterprise quality.

On top of this foundation, AI agents introduce reasoning, planning, and learning.

These agents can be created through:
• Low-code environments like Joule Studio
• Pro-code frameworks for developers

But all must follow enterprise guardrails for security, compliance, and reliability.

The architecture separates concerns cleanly:
• Deterministic systems expose stable capabilities
• A bridge layer using protocols such as MCP and A2A allows agents to consume these capabilities
• The agentic layer orchestrates agents, manages metadata through ORD and UMS

Looking ahead, this layer evolves toward intent-based development, where AI systems translate business intent into executable solutions.

Developers move from writing orchestration logic to collaborating with intelligent systems that assemble, validate, and optimize enterprise workflows.`
    },
    {
      id: 'foundation-layer',
      title: 'Foundation Layer',
      content: `The Foundation Layer is SAP's cognitive core, treating AI as an operating system rather than an add-on.

It provides the runtime, orchestration, semantics, and governance required for enterprise-grade intelligence.

▪ AI Foundation
Coordinates agents through Joule orchestration, manages lifecycle and telemetry via AI Core, and grounds reasoning in enterprise semantics.

▪ Data and Knowledge
• Business Data Cloud standardizes data sharing through governed Data Products
• SAP HANA Cloud provides the data platform
• SAP Knowledge Graph links structured and unstructured information into a semantic fabric

Together, they enable agentic reasoning, analytics, and learning across SAP and partner ecosystems.

Context engineering ensures each agent receives only the most relevant, authorized information, transforming stateless models into context-aware participants in workflows.

The Foundation Layer enforces alignment and safety through policy checks, symbolic reasoning, and auditability.

Intelligence is reusable through standardized skills, avoiding fragmentation.

Over time, the layer evolves toward meta-learning and experience-driven systems that improve not just outputs, but how systems learn—turning enterprise workflows into accumulating assets.`
    },
    {
      id: 'platform-layer',
      title: 'Platform Layer',
      content: `The Platform Layer operationalizes the AI-Native North Star at scale.

SAP Business Technology Platform (BTP) serves as the unified foundation connecting applications, data, intelligence, and ecosystems across hyperscalers and SAP infrastructure.

BTP provides composable services for:
• Development
• Integration
• Security
• Operations

Ensuring enterprise qualities by default.

The Golden Path defines standardized architectures so developers focus on business logic while the platform guarantees compliance, scalability, and resilience.

Application Foundation extends this model to brownfield scenarios, simplifying lifecycle management and reducing TCO.

The platform is service-centric, modular, and cloud-agnostic, enabling rapid innovation while maintaining governance.

AI-native capabilities are embedded directly into platform services, from agent runtimes to AI-driven observability and DevOps automation.

BTP thus becomes more than infrastructure. It is the execution engine that unites deterministic and adaptive workloads, ensuring intelligence remains observable, governed, and portable across global enterprise landscapes.`
    },
    {
      id: 'trusted-fabric',
      title: 'Trusted Fabric',
      content: `Trust is the prerequisite for autonomy. The Trusted Fabric weaves integration, security, and governance into a living system that validates every action and ensures accountability.

▪ Integration
Shifts from customer-managed wiring to SAP-managed, intent-driven provisioning.

Unified Services automate landscape setup, enforce best practices, and separate business intent from technical realization.

Metadata standards such as ORD and One Domain Model ensure discoverability and AI-ready integration.

▪ Security
Evolves to address agentic risks. SAP's three-tier AI defense architecture combines:
• Zero-trust foundations
• Agent supervision
• AI-driven security automation

Identity, encryption, observability, and third-party governance are extended to non-human actors and multi-agent systems.

▪ Governance and Compliance
Ensure alignment with global regulations.

Central AI inventories, risk classification, certification, and shift-left automation embed compliance into the platform itself.

Together, the Trusted Fabric ensures that as intelligence scales, trust deepens.`
    },
    {
      id: 'ecosystem-layer',
      title: 'Ecosystem Layer',
      content: `The Ecosystem Layer transforms SAP from a suite into a network of intelligence.

It provides a unified marketplace where APIs, Data Products, agents, and tools are discovered, governed, and reused.

Built on:
• API Hub
• ORD (Open Resource Discovery)
• Business Data Cloud
• Knowledge Graph

This layer enables composable cognitive workflows across SAP and partner systems.

Agents and tools are registered, versioned, and orchestrated through A2A and MCP protocols, with metadata governed centrally.

This ecosystem multiplies innovation. Partners, customers, and SAP teams co-create intelligence that integrates seamlessly into enterprise workflows.

While SAP retains governance, security, and trust—ensuring that intelligence remains enterprise-grade at scale.`
    },
    {
      id: 'resilient-cloud',
      title: 'Resilient Cloud',
      content: `An AI-native enterprise requires a cloud that is resilient, portable, and intelligent.

SAP's cloud strategy balances global reach, regulatory compliance, and cost efficiency through public, private, and sovereign cloud models.

▪ Resilience
• Standardized packaging
• Multi-region resilience
• Disaster recovery
• Mission-critical availability

▪ Portability and Elasticity
• Reduces hyperscaler lock-in
• Enables efficient scaling of AI workloads
• Multi-cloud flexibility

▪ Intelligent Operations (AIOps)
Operations evolve from reactive to anticipatory:
• Predictive monitoring
• Self-healing workflows
• AI-aware support

SAP Cloud ALM extends into AI scenarios, ensuring explainability, debuggability, and trust at scale.

The result is a cloud foundation that supports both traditional enterprise workloads and next-generation AI systems with equal reliability.`
    },
    {
      id: 'future-pillar',
      title: 'Future Pillar: Quantum Era',
      content: `The North Star Architecture is designed to remain future-proof.

Quantum computing represents a forthcoming paradigm shift, introducing probabilistic computation through superposition and entanglement.

SAP prepares by designing:
• Abstraction layers
• Hybrid execution models
• Governance frameworks

That can integrate quantum capabilities when they mature.

The goal is not immediate adoption, but architectural readiness—ensuring SAP can harness quantum advances for optimization, simulation, and AI without disrupting enterprise trust.

By building flexibility into the architecture today, SAP ensures that tomorrow's quantum breakthroughs can be integrated seamlessly into enterprise workflows.

This forward-looking approach maintains SAP's position as a trusted partner through multiple technology generations.`
    }
  ];

  return chapters.map(ch => ({
    ...ch,
    content: Array.isArray(ch.content) ? ch.content.join('\n\n') : ch.content,
    questions: makeQuestions(ch.title)
  }));
};
