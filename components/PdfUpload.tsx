import React, { useState, useRef } from 'react';
import { Upload, FileText, X, Loader } from 'lucide-react';
import { parsePdfToLevels } from '../services/pdfParser';
import { Level } from '../types';

interface PdfUploadProps {
    onPdfLoaded: (levels: Level[], filename: string) => void;
    onCancel: () => void;
}

export const PdfUpload: React.FC<PdfUploadProps> = ({ onPdfLoaded, onCancel }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        if (!file.type.includes('pdf')) {
            setError('Please upload a PDF file');
            return;
        }

        setError(null);
        setIsProcessing(true);

        try {
            const levels = await parsePdfToLevels(file);
            onPdfLoaded(levels, file.name);
        } catch (err: any) {
            setError(err.message || 'Failed to process PDF');
            setIsProcessing(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl mx-4">
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl shadow-2xl p-8 border-2 border-amber-200">
                    {/* Close button */}
                    <button
                        onClick={onCancel}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-amber-100 transition-colors"
                    >
                        <X size={24} />
                    </button>

                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 mb-4">
                            <FileText size={32} className="text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">Upload PDF Document</h2>
                        <p className="text-gray-600">Transform your PDF into an interactive gesture-driven book</p>
                    </div>

                    {/* Drag and drop area */}
                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`
              relative border-3 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
              ${isDragging
                                ? 'border-amber-500 bg-amber-100'
                                : 'border-amber-300 bg-white hover:border-amber-400 hover:bg-amber-50'
                            }
              ${isProcessing ? 'pointer-events-none opacity-60' : ''}
            `}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            onChange={handleFileInput}
                            className="hidden"
                        />

                        {isProcessing ? (
                            <div className="flex flex-col items-center gap-4">
                                <Loader size={48} className="animate-spin text-amber-600" />
                                <p className="text-lg font-semibold text-gray-700">Analyzing with AI...</p>
                                <p className="text-sm text-gray-500">Extracting key concepts and generating summaries</p>
                                <p className="text-xs text-gray-400 mt-2">Powered by NVIDIA Llama-4</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <Upload size={48} className="text-amber-600" />
                                <div>
                                    <p className="text-lg font-semibold text-gray-700 mb-1">
                                        Drop your PDF here or click to browse
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Supports PDF documents up to 50MB
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg">
                            <p className="text-red-700 font-medium">{error}</p>
                        </div>
                    )}

                    <div className="mt-6 text-center text-sm text-gray-500">
                        <p>Your PDF will be processed locally in your browser</p>
                        <p>No data is uploaded to any server</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
