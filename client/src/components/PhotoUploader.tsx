import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface UploadedFile {
  url: string;
  filename: string;
  originalName: string;
}

interface PhotoUploaderProps {
  maxNumberOfFiles?: number;
  onComplete?: (files: UploadedFile[]) => void;
  onError?: (error: string) => void;
  buttonClassName?: string;
  children: ReactNode;
  accept?: string;
}

export function PhotoUploader({
  maxNumberOfFiles = 10,
  onComplete,
  onError,
  buttonClassName,
  children,
  accept = "image/*",
}: PhotoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files).slice(0, maxNumberOfFiles);
    
    setIsUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      fileArray.forEach((file) => {
        formData.append("files", file);
      });

      setProgress(30);

      const response = await fetch("/api/upload/multiple", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Upload failed");
      }

      const data = await response.json();
      
      setProgress(100);
      onComplete?.(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      onError?.(message);
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={maxNumberOfFiles > 1}
        onChange={handleFileChange}
        className="hidden"
        data-testid="input-photo-upload"
      />
      
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={isUploading}
        className={buttonClassName}
      >
        {isUploading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Uploading...</span>
          </div>
        ) : (
          children
        )}
      </Button>

      {isUploading && progress > 0 && (
        <Progress value={progress} className="mt-2 h-1" />
      )}
    </div>
  );
}
