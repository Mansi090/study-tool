import { GraduationCap } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Study Tool Generator
            </h1>
            <p className="text-sm text-muted-foreground">
              Transform your documents into powerful study materials
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}