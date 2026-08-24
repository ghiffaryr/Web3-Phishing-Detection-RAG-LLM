import React, { useRef, useState } from "react";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { ThemeConfig } from "../types/chat";
import axios from "axios";

interface FileUploaderProps {
  theme: ThemeConfig;
  onContextGenerated: (context: string, fileName: string) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  theme,
  onContextGenerated,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(false);

    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported");
      return;
    }

    setSelectedFile(file);
  };

  const processFile = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      // Step 1: Upload the file
      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploadResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_HOST}:${process.env.NEXT_PUBLIC_API_PORT}/${process.env.NEXT_PUBLIC_API_PREFIX}/rag/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (!uploadResponse.data.result?.file_path) {
        throw new Error("File upload failed");
      }

      const filePath = uploadResponse.data.result.file_path;

      // Step 2: Update Chroma database with uploaded file
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_HOST}:${process.env.NEXT_PUBLIC_API_PORT}/${process.env.NEXT_PUBLIC_API_PREFIX}/rag/update`,
        { file_path: filePath }
      );

      // Step 3: Generate context from the file
      const contextResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_HOST}:${process.env.NEXT_PUBLIC_API_PORT}/${process.env.NEXT_PUBLIC_API_PREFIX}/rag/context`,
        {
          query_text: `Give me a comprehensive overview of this document: ${selectedFile.name}`,
        }
      );

      const generatedContext =
        contextResponse.data.result?.generated_context || "";

      // Pass the context back to parent component
      onContextGenerated(generatedContext, selectedFile.name);

      setSuccess(true);

      // Reset file after successful upload
      setTimeout(() => {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }, 2000);
    } catch (err: any) {
      console.error("File processing error:", err);
      setError(err.message || "Failed to process file");
    } finally {
      setUploading(false);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Box sx={{ mt: 1, mb: 2 }}>
      {!selectedFile ? (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            style={{ display: "none" }}
            id="file-upload-input"
          />
          <label htmlFor="file-upload-input">
            <Button
              component="span"
              variant="outlined"
              startIcon={<AttachFileIcon />}
              size="small"
              sx={{
                color: theme.inputTextColor,
                borderColor: theme.inputBorderColor,
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderColor: theme.inputHoverBorderColor,
                },
              }}
            >
              Attach PDF
            </Button>
          </label>
          <Typography
            variant="caption"
            sx={{ ml: 1, color: theme.inputLabelColor }}
          >
            Only PDF files are supported
          </Typography>
        </Box>
      ) : (
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              p: 1,
              border: `1px solid ${theme.inputBorderColor}`,
              borderRadius: 1,
              mb: 1,
            }}
          >
            <PictureAsPdfIcon sx={{ color: "#f44336", mr: 1 }} />
            <Typography
              variant="body2"
              sx={{
                color: theme.inputTextColor,
                flexGrow: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {selectedFile.name}
            </Typography>
            <Button
              size="small"
              sx={{ minWidth: "auto", color: theme.inputLabelColor }}
              onClick={clearSelectedFile}
            >
              <CloseIcon fontSize="small" />
            </Button>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              disabled={uploading}
              onClick={processFile}
              sx={{
                backgroundColor: theme.buttonBackground,
                color: theme.buttonTextColor,
                "&:hover": {
                  backgroundColor: theme.buttonHoverBackground,
                },
              }}
            >
              {uploading ? (
                <>
                  <CircularProgress
                    size={16}
                    sx={{ mr: 1, color: theme.buttonTextColor }}
                  />
                  Processing...
                </>
              ) : (
                "Process File"
              )}
            </Button>

            {error && (
              <Typography variant="caption" sx={{ color: "#f44336" }}>
                {error}
              </Typography>
            )}

            {success && (
              <Typography variant="caption" sx={{ color: "#4caf50" }}>
                File processed successfully!
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default FileUploader;
