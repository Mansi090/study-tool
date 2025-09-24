import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, FileText, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudyTool {
  id: 'flashcards' | 'summary' | 'mcqs';
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface StudyToolSelectorProps {
  selectedTool: string | null;
  onToolSelect: (tool: string) => void;
}

const studyTools: StudyTool[] = [
  {
    id: 'flashcards',
    title: 'Flashcards',
    description: 'Generate interactive flashcards for active recall and spaced repetition',
    icon: <Brain className="h-6 w-6" />
  },
  {
    id: 'summary',
    title: 'Summary',
    description: 'Create concise summaries highlighting key concepts and main points',
    icon: <FileText className="h-6 w-6" />
  },
  {
    id: 'mcqs',
    title: 'Multiple Choice Questions',
    description: 'Generate practice questions to test comprehension and retention',
    icon: <HelpCircle className="h-6 w-6" />
  }
];

export function StudyToolSelector({ selectedTool, onToolSelect }: StudyToolSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Choose Your Study Tool</h3>
      <div className="grid gap-4 md:grid-cols-3">
        {studyTools.map((tool) => (
          <Card
            key={tool.id}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:scale-105 border-2",
              selectedTool === tool.id
                ? "border-primary bg-primary/5 shadow-glow"
                : "border-border hover:border-primary/50"
            )}
            onClick={() => onToolSelect(tool.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg transition-colors",
                  selectedTool === tool.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                )}>
                  {tool.icon}
                </div>
                <CardTitle className="text-base">{tool.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">{tool.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}