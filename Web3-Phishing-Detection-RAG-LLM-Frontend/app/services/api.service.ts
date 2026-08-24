import axios, { AxiosInstance, AxiosResponse } from "axios";

// Types for API responses
interface APIResponse<T> {
  title: string;
  status: string;
  description: string;
  result?: T;
}

interface FileUploadResult {
  file_name: string;
  file_path: string;
}

interface ContextGenerationResult {
  generated_context: string;
}

class APIService {
  private client: AxiosInstance;
  private static instance: APIService;

  private constructor() {
    this.client = axios.create({
      baseURL: `${process.env.NEXT_PUBLIC_API_HOST}:${process.env.NEXT_PUBLIC_API_PORT}/${process.env.NEXT_PUBLIC_API_PREFIX}`,
    });
  }

  // Singleton pattern to ensure we have only one instance
  public static getInstance(): APIService {
    if (!APIService.instance) {
      APIService.instance = new APIService();
    }
    return APIService.instance;
  }

  // File upload using base64
  public async uploadFileAsBase64(file: File): Promise<string> {
    try {
      // Convert file to base64
      const base64Content = await this.fileToBase64(file);

      // Make the API call
      const response: AxiosResponse<APIResponse<FileUploadResult>> =
        await this.client.post("/file/upload", {
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_content: base64Content,
        });

      if (!response.data.result?.file_path) {
        throw new Error("File upload response missing file path");
      }

      return response.data.result.file_path;
    } catch (error) {
      this.handleError("File upload failed", error);
      throw error;
    }
  }

  // Process file and get context in one request
  public async processFileAndGetContext(
    filePath: string,
    queryText: string
  ): Promise<string> {
    try {
      const response: AxiosResponse<APIResponse<ContextGenerationResult>> =
        await this.client.post("/rag/process-and-get-context", {
          file_path: filePath,
          query_text: queryText || "Extract key information from this document",
        });

      if (!response.data.result?.generated_context) {
        throw new Error("No context was generated");
      }

      return response.data.result.generated_context;
    } catch (error) {
      this.handleError("Context generation failed", error);
      throw error;
    }
  }

  // Helper method to convert File to base64 string
  private async fileToBase64(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result?.toString().split(",")[1];
        if (base64) {
          resolve(base64);
        } else {
          reject(new Error("Failed to convert file to base64"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  // Centralized error handling
  private handleError(message: string, error: any): void {
    console.error(`${message}:`, error);

    if (error.response) {
      console.error("Server response:", {
        status: error.response.status,
        data: error.response.data,
      });
    }
  }
}

export default APIService;
