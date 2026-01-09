import { useState, useCallback } from "react";

interface UploadResponse {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
}

interface UseUploadOptions {
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * React hook for handling file uploads to local storage.
 *
 * This hook uses a simple form data upload to the local server.
 */
export function useUpload(options: UseUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  /**
   * Upload a file to local storage.
   *
   * @param file - The file to upload
   * @returns The upload response containing the file URL
   */
  const uploadFile = useCallback(
    async (file: File): Promise<UploadResponse | null> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        const formData = new FormData();
        formData.append("file", file);

        setProgress(30);
        
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Upload failed");
        }

        const data: UploadResponse = await response.json();
        
        setProgress(100);
        options.onSuccess?.(data);
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Upload failed");
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [options]
  );

  /**
   * Upload multiple files to local storage.
   *
   * @param files - The files to upload
   * @returns Array of upload responses
   */
  const uploadFiles = useCallback(
    async (files: File[]): Promise<UploadResponse[]> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        const formData = new FormData();
        files.forEach((file) => {
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

        const data: UploadResponse[] = await response.json();
        
        setProgress(100);
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Upload failed");
        setError(error);
        options.onError?.(error);
        return [];
      } finally {
        setIsUploading(false);
      }
    },
    [options]
  );

  return {
    uploadFile,
    uploadFiles,
    isUploading,
    error,
    progress,
  };
}

