# Gesture Book Reader 📖👋

An interactive, AI-powered PDF reader that brings your documents to life with realistic page-flipping and touchless hand gesture controls.

## ✨ Features

- **📄 PDF Upload & AI Analysis**: Drag and drop any PDF document. The app uses **NVIDIA's Llama-4 model** to automatically parse the text, filter out noise (like references and indices), and generate concise, bulleted summaries for each chapter.
- **👋 Touchless Hand Control**: Use your webcam to flip pages without touching your screen!
  - **Left Hand**: Flip forward (Next Page)
  - **Right Hand**: Flip backward (Previous Page)
- **🧠 Intelligent Content Filtering**: Automatically detects and removes non-content sections like bibliographies and copyright pages, so you can focus on the reading.
- **📚 Realistic Experience**: Enjoy 3D page-flipping animations and sound effects that mimic a real physical book.

## 🚀 How to Use

1. **Open the App**: [Launch Gesture Book Reader](https://allthingssecurity.github.io/bookreader/)
2. **Upload a PDF**: Drag and drop your PDF file onto the upload zone.
3. **Wait for Analysis**: The AI will process the document, extracting key points and organizing chapters.
4. **Enable Camera**: When prompted, allow camera access for gesture control.
5. **Start Reading**: 
   - Raise your **Left Hand** to turn to the next page.
   - Raise your **Right Hand** to turn to the previous page.
   - Or use the arrow keys on your keyboard.

## 🛠️ Technology Stack

- **Frontend**: React, Vite, TypeScript
- **AI**: NVIDIA NIM API (Llama-4-Maverick) for summarization and content filtering
- **Computer Vision**: Google MediaPipe Hands for gesture recognition
- **PDF Processing**: PDF.js for text extraction
- **3D Rendering**: CSS3D / Custom 3D Book Component

## 🔒 Privacy

- **Local Processing**: PDF text extraction happens entirely in your browser.
- **AI Privacy**: Only extracted text chunks are sent to the NVIDIA API for summarization. No data is stored permanently.
- **Camera**: Video feed is processed locally by MediaPipe and is never sent to any server.

---
*Built with ❤️ by AllThingsSecurity*
