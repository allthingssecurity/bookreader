import * as pdfjsLib from 'pdfjs-dist';
import { Level, QuizQuestion } from '../types';

// Set up PDF.js worker - must match installed version (5.4.449)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs';

const mkQ = (question: string, choices: string[], correct: number): QuizQuestion => ({
    question,
    choices,
    correctIndex: correct
});

const makeQuestions = (title: string): QuizQuestion[] => {
    const q: QuizQuestion[] = [];
    q.push(mkQ('Did you read this section carefully?', ['Yes', 'No'], 0));
    q.push(mkQ('This content is from your uploaded PDF. True or False?', ['True', 'False'], 0));
    q.push(mkQ('Do you understand the content?', ['Yes', 'Somewhat', 'No'], 0));
    return q;
};

import { summarizeSection } from './aiSummary';

export const parsePdfToLevels = async (file: File): Promise<Level[]> => {
    try {
        console.log('📄 Starting PDF parsing:', file.name);

        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Load PDF document
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        console.log(`📚 PDF loaded: ${pdf.numPages} pages`);

        // Extract text from all pages
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
            fullText += pageText + '\n\n';
        }

        // Basic cleanup of common PDF artifacts before processing
        // Remove standalone numbers that look like line numbers (e.g. " 10 ", " 11 ")
        fullText = fullText.replace(/\s\d+\s/g, ' ');

        console.log('📝 Extracted text length:', fullText.length);

        // Split into sections based on common heading patterns
        const rawSections = splitIntoSections(fullText);
        console.log(`📑 Split into ${rawSections.length} raw sections. Generating AI summaries...`);

        // Process sections with AI (in parallel but limited to avoid rate limits if needed, 
        // but for now let's do Promise.all since it's likely just a few sections for a typical short PDF,
        // or we can do sequential if we want to be safe/show progress)

        // Let's limit to first 10 sections to avoid huge API usage on large docs
        const sectionsToProcess = rawSections.slice(0, 10);

        const validLevels = (await Promise.all(sectionsToProcess.map(async (section, idx) => {
            console.log(`🤖 Summarizing section ${idx + 1}/${sectionsToProcess.length}...`);
            console.log(`   Original length: ${section.content.length} chars`);

            const summary = await summarizeSection(section.content, idx);

            if (!summary.validContent) {
                console.log(`   🗑️ Section ${idx + 1} identified as NOISE (References/TOC/etc). Skipping.`);
                return null;
            }

            console.log(`   ✅ AI Summary generated: "${summary.title}"`);
            console.log(`   POINTS extracted: ${summary.content.length}`);
            summary.content.forEach((p, i) => console.log(`     ${i + 1}. ${p.substring(0, 50)}...`));

            return {
                id: `pdf-section-${idx + 1}`,
                title: summary.title,
                content: summary.content, // This is now string[] (points)
                questions: makeQuestions(summary.title)
            };
        }))).filter(Boolean) as Level[];

        console.log('✅ PDF parsing & AI summarization complete:', validLevels.length, 'chapters');
        return validLevels;

    } catch (error) {
        console.error('❌ PDF parsing failed:', error);
        throw new Error('Failed to parse PDF. Please ensure it\'s a valid PDF file.');
    }
};

function splitIntoSections(text: string): { title: string; content: string }[] {
    const sections: { title: string; content: string }[] = [];

    // Split by common heading patterns (all caps, numbered sections, etc.)
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    let currentSection: { title: string; paragraphs: string[] } | null = null;
    let currentParagraph = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check if this looks like a heading
        const isHeading = (
            // All caps and short
            (line === line.toUpperCase() && line.length < 100 && line.length > 3) ||
            // Numbered section (1., 2., I., II., Chapter 1, etc.)
            /^(\d+\.|\d+\)|(Chapter|Section|Part)\s+\d+|[IVX]+\.)\s+/.test(line) ||
            // Starts with common heading words
            /^(Introduction|Overview|Summary|Conclusion|Background|Method|Results|Discussion|Abstract|Preface)/i.test(line)
        );

        if (isHeading) {
            // Save previous section
            if (currentSection && currentSection.paragraphs.length > 0) {
                sections.push({
                    title: currentSection.title,
                    content: currentSection.paragraphs.join('\n\n')
                });
            }

            // Start new section
            currentSection = {
                title: line.length > 60 ? line.substring(0, 57) + '...' : line,
                paragraphs: []
            };
            currentParagraph = '';
        } else {
            // Accumulate content
            if (line.length > 10) {
                currentParagraph += (currentParagraph ? ' ' : '') + line;

                // If paragraph ends with sentence-ending punctuation, save it
                if (/[.!?]$/.test(line) && currentParagraph.length > 100) {
                    if (currentSection) {
                        currentSection.paragraphs.push(currentParagraph);
                    }
                    currentParagraph = '';
                }
            }
        }
    }

    // Save last paragraph and section
    if (currentParagraph && currentSection) {
        currentSection.paragraphs.push(currentParagraph);
    }
    if (currentSection && currentSection.paragraphs.length > 0) {
        sections.push({
            title: currentSection.title,
            content: currentSection.paragraphs.join('\n\n')
        });
    }

    // If no sections were found, create one big section
    if (sections.length === 0) {
        const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50);
        sections.push({
            title: 'Document Content',
            content: paragraphs.join('\n\n')
        });
    }

    return sections;
}
