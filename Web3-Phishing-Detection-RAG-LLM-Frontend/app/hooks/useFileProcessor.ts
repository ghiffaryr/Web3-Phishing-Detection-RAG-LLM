import { useState } from "react";
import APIService from "../services/api.service";

interface FileProcessorHook {
  uploadAndProcessFile: (file: File, queryText?: string) => Promise<void>;
  isProcessing: boolean;
  error: string | null;
}

export const useFileProcessor = (
  onContextGenerated: (context: string, fileName: string) => void
): FileProcessorHook => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const apiService = APIService.getInstance();

  const uploadAndProcessFile = async (
    file: File,
    queryText?: string
  ): Promise<void> => {
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Upload file
      const filePath = await apiService.uploadFileAsBase64(file);

      // Step 2: Process file and get context
      const context = await apiService.processFileAndGetContext(
        filePath,
        queryText || ""
      );

      // Step 3: Call the callback with the generated context
      onContextGenerated(context, file.name);
    } catch (err: any) {
      console.error("File processing error:", err);
      setError(err.message || "Failed to process file");
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    uploadAndProcessFile,
    isProcessing,
    error,
  };
};

export default useFileProcessor;
