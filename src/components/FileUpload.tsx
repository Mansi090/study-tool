import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  selectedFiles: File[];
}

export function FileUpload({ onFileSelect, selectedFiles }: FileUploadProps) {
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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files)
        .filter(file => isValidFile(file));
      
      if (newFiles.length > 0) {
        onFileSelect([...selectedFiles, ...newFiles]);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
        .filter(file => isValidFile(file));
      
      if (newFiles.length > 0) {
        onFileSelect([...selectedFiles, ...newFiles]);
      }
    }
  };

  const isValidFile = (file: File): boolean => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    return validTypes.includes(file.type);
  };

  const removeFile = (index: number) => {
    const updatedFiles = [...selectedFiles];
    updatedFiles.splice(index, 1);
    onFileSelect(updatedFiles);
    
    // Reset input if all files are removed
    if (updatedFiles.length === 0 && inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <Card className="border-2 border-dashed border-border bg-card/50 backdrop-blur-sm">
      <CardContent className="p-8">
        {selectedFiles.length > 0 ? (
          <div className="space-y-3">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            <Button 
              onClick={() => {
                // Create a new input element
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,.docx';
                input.multiple = true;
                input.style.display = 'none';
                
                // Add event listener
                input.addEventListener('change', (e) => {
                  const target = e.target as HTMLInputElement;
                  if (target.files && target.files.length > 0) {
                    const newFiles = Array.from(target.files)
                      .filter(file => isValidFile(file));
                    
                    if (newFiles.length > 0) {
                      onFileSelect([...selectedFiles, ...newFiles]);
                    }
                  }
                  // Remove the input after selection
                  document.body.removeChild(input);
                });
                
                // Append to body and trigger click
                document.body.appendChild(input);
                input.click();
              }} 
              variant="outline" 
              className="w-full mt-3 border-dashed flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Another Document
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
            <h3 className="text-lg font-semibold mb-2">Upload Your Study Materials</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Drag and drop your PDF or DOCX files here, or click to browse
            </p>
            <Button onClick={() => inputRef.current?.click()} className="mb-2">
              Choose Files
            </Button>
            <p className="text-xs text-muted-foreground">
              Supports PDF and DOCX files up to 20MB each
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleChange}
              className="hidden"
              multiple
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}