import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/FileUpload';
import { StudyToolSelector } from '@/components/StudyToolSelector';
import { Header } from '@/components/Header';
import { Sparkles, ArrowRight } from 'lucide-react';

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<Array<{ question: string; answer: string }> | null>(null);
  const [quiz, setQuiz] = useState<Array<{ question: string; options: string[]; answer: string }> | null>(null);
  const API_BASE = import.meta.env.VITE_API_BASE || '';

  const handleGenerate = async () => {
    if (!selectedFile || !selectedTool) return;

    setLoading(true);
    setError(null);
    setSummary(null);
    setFlashcards(null);
    setQuiz(null);

    try {
      // 1) Upload file and get extracted text
      const form = new FormData();
      form.append('file', selectedFile);
      const uploadRes = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: form,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to upload/parse file');
      }
      const { text } = (await uploadRes.json()) as { text: string; textLength: number };

      // 2) Call tool-specific endpoint
      if (selectedTool === 'summary') {
        const res = await fetch(`${API_BASE}/api/summarize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, sentences: 6 }),
        });
        if (!res.ok) throw new Error('Failed to generate summary');
        const data = await res.json();
        setSummary(data.summary);
      } else if (selectedTool === 'flashcards') {
        const res = await fetch(`${API_BASE}/api/flashcards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, count: 8 }),
        });
        if (!res.ok) throw new Error('Failed to generate flashcards');
        const data = await res.json();
        setFlashcards(data.cards);
      } else if (selectedTool === 'mcqs') {
        const res = await fetch(`${API_BASE}/api/quiz`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, count: 5 }),
        });
        if (!res.ok) throw new Error('Failed to generate quiz');
        const data = await res.json();
        setQuiz(data.quiz);
      }
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            AI-Powered Study Tools
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Transform Your Documents
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Upload any PDF or DOCX file and let AI generate personalized flashcards, summaries, or practice questions
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* File Upload */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Step 1: Upload Your Document</h2>
            <FileUpload onFileSelect={setSelectedFile} selectedFile={selectedFile} />
          </div>

          {/* Study Tool Selection */}
          {selectedFile && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-2xl font-semibold">Step 2: Choose Your Study Tool</h2>
              <StudyToolSelector selectedTool={selectedTool} onToolSelect={setSelectedTool} />
            </div>
          )}

          {/* Generate Button */}
          {selectedFile && selectedTool && (
            <Card className="animate-fade-in border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Ready to Generate!</h3>
                    <p className="text-muted-foreground">
                      Create {selectedTool} from "{selectedFile.name}"
                    </p>
                  </div>
                  <Button 
                    onClick={handleGenerate}
                    size="lg"
                    className="gap-2"
                    disabled={loading}
                  >
                    {loading ? 'Working…' : 'Generate'} <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {error && (
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="p-4 text-destructive">
                {error}
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {summary && (
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-muted-foreground">{summary}</p>
              </CardContent>
            </Card>
          )}

          {flashcards && (
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle>Flashcards</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {flashcards.map((c, idx) => (
                  <div key={idx} className="p-4 rounded-lg border bg-card">
                    <p className="font-medium mb-2">Q{idx + 1}. {c.question}</p>
                    <p className="text-sm text-muted-foreground">{c.answer}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {quiz && (
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle>Quiz</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {quiz.map((q, idx) => (
                  <div key={idx} className="p-4 rounded-lg border bg-card">
                    <p className="font-medium mb-2">Q{idx + 1}. {q.question}</p>
                    <ul className="list-disc pl-6 text-sm text-muted-foreground">
                      {q.options.map((opt, i) => (
                        <li key={i}>{opt}</li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">Answer: {q.answer}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
