import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

export function FileUpload({ onFileSelect, selectedFile }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (isValidFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (isValidFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const isValidFile = (file: File): boolean => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    return validTypes.includes(file.type);
  };

  const removeFile = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onFileSelect(null as any);
  };

  return (
    <Card className="border-2 border-dashed border-border bg-card/50 backdrop-blur-sm">
      <CardContent className="p-8">
        {selectedFile ? (
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={removeFile}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              "flex flex-col items-center justify-center py-12 px-6 text-center transition-colors",
              dragActive && "bg-primary/5 border-primary"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Upload Your Study Material</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Drag and drop your PDF or DOCX file here, or click to browse
            </p>
            <Button onClick={() => inputRef.current?.click()} className="mb-2">
              Choose File
            </Button>
            <p className="text-xs text-muted-foreground">
              Supports PDF and DOCX files up to 20MB
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleChange}
              className="hidden"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}