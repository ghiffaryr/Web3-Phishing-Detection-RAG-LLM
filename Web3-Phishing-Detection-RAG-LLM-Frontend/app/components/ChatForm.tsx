import {
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  InputAdornment,
} from "@mui/material";
import { useRef, useState, useCallback } from "react";
import { ThemeConfig } from "../types/chat";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import SendIcon from "@mui/icons-material/Send";
import axios from "axios";

interface ChatFormProps {
  inputs: {
    model_name: string;
    prompt: string;
  };
  handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: () => void;
  handleKeyNext: (event: React.KeyboardEvent, nextIndex: number) => void;
  handleKeyNextSubmit: (event: React.KeyboardEvent) => void;
  theme: ThemeConfig;
  loading: boolean;
  error: string;
  isMobile: boolean;
  isTyping: boolean;
  onFileContextGenerated?: (context: string, fileName: string) => void;
  compact?: boolean;
  dockMode?: boolean;
}

export const ChatForm = ({
  inputs,
  handleChange,
  handleSubmit,
  handleKeyNext,
  handleKeyNextSubmit,
  theme,
  loading,
  error,
  isMobile,
  isTyping,
  onFileContextGenerated,
  compact = false,
  dockMode = false,
}: ChatFormProps) => {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for file processing
  const [fileProcessingState, setFileProcessingState] = useState({
    isProcessing: false,
    error: null as string | null,
    selectedFile: null as File | null,
    showNotification: false,
    notificationMessage: "",
    notificationType: "info" as "error" | "info" | "success",
  });

  const textFieldStyles = {
    "& .MuiInputBase-input": {
      color: theme.inputTextColor,
      fontSize: { xs: "0.9rem", md: "1rem" },
    },
    "& .MuiInputLabel-root": {
      color: theme.inputLabelColor,
      fontSize: { xs: "0.9rem", md: "1rem" },
    },
    "& .MuiOutlinedInput-root": {
      "& fieldset": { borderColor: theme.inputBorderColor },
      "&:hover fieldset": { borderColor: theme.inputHoverBorderColor },
      "&.Mui-focused fieldset": { borderColor: theme.buttonBackground },
    },
    "& .MuiOutlinedInput-root.Mui-focused": {
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: theme.buttonBackground,
      },
    },
    "& .MuiTouchRipple-root": { color: theme.buttonBackground },
    "& .MuiInputLabel-root.Mui-focused": { color: theme.buttonBackground },
    "& .MuiFilledInput-underline:after": {
      borderBottomColor: theme.buttonBackground,
    },
    "& .MuiInput-underline:after": {
      borderBottomColor: theme.buttonBackground,
    },
  };

  // File to base64 conversion - implemented directly in component
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        try {
          const base64String = reader.result?.toString().split(",")[1];
          if (base64String) {
            resolve(base64String);
          } else {
            reject(new Error("Failed to convert file to base64"));
          }
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => {
        reject(new Error("Error reading file"));
      };

      reader.readAsDataURL(file);
    });
  };

  // File processing logic - defined as a memoized callback within the component
  const processSelectedFile = useCallback(
    async (file: File, prompt: string) => {
      if (!file || file.type !== "application/pdf") {
        setFileProcessingState((prev) => ({
          ...prev,
          error: "Only PDF files are supported",
          showNotification: true,
          notificationMessage: "Only PDF files are supported",
          notificationType: "error",
        }));
        return;
      }

      // Track selected file and set processing state
      setFileProcessingState((prev) => ({
        ...prev,
        isProcessing: true,
        error: null,
        selectedFile: file,
      }));

      try {
        // Step 1: Convert to base64
        const fileBase64 = await convertFileToBase64(file);

        // Step 2: Create a unique identifier for this upload
        const uploadId = `upload_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 9)}`;

        // Step 3: Upload file using environment variables
        const uploadResponse = await axios.post(
          `${process.env.NEXT_PUBLIC_API_HOST}:${process.env.NEXT_PUBLIC_API_PORT}/${process.env.NEXT_PUBLIC_API_PREFIX}/file/upload`,
          {
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            file_content: fileBase64,
            upload_id: uploadId,
          }
        );

        if (!uploadResponse.data?.result?.file_path) {
          throw new Error("Upload failed: No file path received");
        }

        // Step 4: Process file and generate context
        let queryText = prompt?.trim();
        if (!queryText) {
          // Create a query from filename if no prompt is available
          queryText = `Extract and summarize key information from ${file.name}`;
        }

        const contextResponse = await axios.post(
          `${process.env.NEXT_PUBLIC_API_HOST}:${process.env.NEXT_PUBLIC_API_PORT}/${process.env.NEXT_PUBLIC_API_PREFIX}/rag/process-and-get-context`,
          {
            file_path: uploadResponse.data.result.file_path,
            query_text: queryText,
            // Add additional parameters to make this call more unique
            upload_id: uploadId,
            source_info: {
              file_name: file.name,
              timestamp: new Date().toISOString(),
            },
          }
        );

        // Success - pass context to parent silently, don't show in UI
        if (
          onFileContextGenerated &&
          contextResponse.data?.result?.generated_context
        ) {
          // Pass the context and filename back to parent component
          onFileContextGenerated(
            contextResponse.data.result.generated_context,
            file.name
          );

          // Show success notification without revealing the context
          setFileProcessingState((prev) => ({
            ...prev,
            showNotification: true,
            notificationMessage: `File "${file.name}" processed successfully. The AI will use this information to answer your questions.`,
            notificationType: "success",
          }));
        } else {
          throw new Error("No context was generated");
        }
      } catch (err: any) {
        console.error("PDF processing error:", err);

        // Handle error and display message
        const errorMessage =
          err.response?.data?.description || err.message || "Unknown error";
        setFileProcessingState((prev) => ({
          ...prev,
          error: errorMessage,
          showNotification: true,
          notificationMessage: `Error: ${errorMessage}`,
          notificationType: "error",
        }));
      } finally {
        setFileProcessingState((prev) => ({
          ...prev,
          isProcessing: false,
          selectedFile: null,
        }));

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [onFileContextGenerated]
  );

  // Handle file select
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    processSelectedFile(files[0], inputs.prompt);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Close notification
  const handleCloseNotification = () => {
    setFileProcessingState((prev) => ({
      ...prev,
      showNotification: false,
    }));
  };

  // For dock mode, use a horizontal layout with auto-growing prompt
  if (dockMode) {
    return (
      <>
        {/* Hidden file input */}
        <input
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          ref={fileInputRef}
          onChange={handleFileSelect}
        />

        <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
          {/* Top row: Prompt field only */}
          <Box sx={{ width: "100%", mb: 1 }}>
            {/* Main prompt field with send button adornment - auto grows */}
            <TextField
              fullWidth
              name="prompt"
              placeholder="Ask a question..."
              onChange={handleChange}
              value={inputs.prompt}
              onKeyDown={handleKeyNextSubmit}
              inputRef={(el) => (inputRefs.current[1] = el)}
              disabled={loading || fileProcessingState.isProcessing || isTyping}
              size="small"
              variant="outlined"
              multiline
              maxRows={5}
              minRows={1}
              InputProps={{
                endAdornment: (
                  <InputAdornment
                    position="end"
                    sx={{ alignSelf: "flex-end", pb: 0.5 }}
                  >
                    <IconButton
                      onClick={handleSubmit}
                      disabled={
                        loading ||
                        fileProcessingState.isProcessing ||
                        isTyping ||
                        !inputs.prompt.trim()
                      }
                      size="small"
                      sx={{
                        color: theme.buttonTextColor,
                        backgroundColor:
                          loading ||
                          fileProcessingState.isProcessing ||
                          isTyping ||
                          !inputs.prompt.trim()
                            ? theme.buttonBackground + "80"
                            : theme.buttonBackground,
                        "&:hover": {
                          backgroundColor: theme.buttonHoverBackground,
                        },
                        width: 32,
                        height: 32,
                      }}
                    >
                      <SendIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiInputBase-input": {
                  color: theme.inputTextColor,
                  fontSize: "0.9rem",
                  py: 1,
                  overflowY: "auto",
                  maxHeight: "150px",
                },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: theme.inputBorderColor },
                  "&:hover fieldset": {
                    borderColor: theme.inputHoverBorderColor,
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: theme.buttonBackground,
                  },
                },
              }}
            />
          </Box>

          {/* Bottom row: Model name field with file upload button */}
          <Box sx={{ display: "flex", width: "100%", alignItems: "center" }}>
            {/* Model name field */}
            <TextField
              name="model_name"
              value={inputs.model_name}
              onChange={handleChange}
              onKeyDown={(e) => handleKeyNext(e, 1)}
              placeholder="Model name"
              disabled={loading || fileProcessingState.isProcessing || isTyping}
              variant="outlined"
              size="small"
              sx={{
                width: "calc(100% - 50px)", // Exactly prompt width minus button width + margin
                "& .MuiInputBase-input": {
                  color: theme.inputTextColor,
                  fontSize: "0.85rem",
                  py: 0.75,
                },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: theme.inputBorderColor },
                  "&:hover fieldset": {
                    borderColor: theme.inputHoverBorderColor,
                  },
                },
              }}
            />

            {/* File upload button - next to model name */}
            <Tooltip title="Upload PDF document">
              <IconButton
                onClick={triggerFileInput}
                disabled={
                  loading || fileProcessingState.isProcessing || isTyping
                }
                size="medium"
                sx={{
                  color: theme.buttonBackground,
                  backgroundColor: "transparent",
                  border: `1px solid ${theme.inputBorderColor}`,
                  borderRadius: 1,
                  padding: "6px",
                  ml: 1, // 8px in MUI
                  width: "38px",
                  height: "38px",
                  flexShrink: 0, // Prevent button from shrinking
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    borderColor: theme.inputHoverBorderColor,
                  },
                }}
              >
                {fileProcessingState.isProcessing ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <AttachFileIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Error display below the form */}
        {(error || fileProcessingState.error) && (
          <Typography
            color="#ff6b6b"
            variant="caption"
            sx={{ mt: 0.5, display: "block" }}
          >
            {error || fileProcessingState.error}
          </Typography>
        )}

        {/* Notification for file processing */}
        <Snackbar
          open={fileProcessingState.showNotification}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={handleCloseNotification}
            severity={fileProcessingState.notificationType}
            sx={{ width: "100%" }}
          >
            {fileProcessingState.notificationMessage}
          </Alert>
        </Snackbar>
      </>
    );
  }

  // Original layout for non-dock mode
  return (
    <>
      {/* Model name field */}
      <TextField
        fullWidth
        label="Model Name"
        name="model_name"
        placeholder="Enter model name"
        onChange={handleChange}
        value={inputs.model_name}
        onKeyDown={(e) => handleKeyNext(e, 1)}
        inputRef={(el) => (inputRefs.current[0] = el)}
        disabled={loading || fileProcessingState.isProcessing || isTyping}
        sx={{
          ...textFieldStyles,
          mb: compact ? 1 : 2,
          "& .MuiInputBase-root": {
            fontSize: compact ? "0.9rem" : "inherit",
          },
        }}
        size={compact ? "small" : "medium"}
      />

      {/* Prompt field */}
      <TextField
        fullWidth
        multiline
        label="Prompt"
        name="prompt"
        placeholder="Ask a question..."
        onChange={handleChange}
        value={inputs.prompt}
        onKeyDown={handleKeyNextSubmit}
        inputRef={(el) => (inputRefs.current[1] = el)}
        disabled={loading || fileProcessingState.isProcessing || isTyping}
        rows={compact ? 1 : 2}
        sx={{
          mb: compact ? 1 : 2,
          ...textFieldStyles,
        }}
        size={compact ? "small" : "medium"}
      />

      {/* Hidden file input */}
      <input
        type="file"
        accept="application/pdf"
        style={{ display: "none" }}
        ref={fileInputRef}
        onChange={handleFileSelect}
      />

      {/* Action buttons */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Button
            size={isMobile ? "small" : "medium"}
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || fileProcessingState.isProcessing || isTyping}
            sx={{
              backgroundColor:
                loading || fileProcessingState.isProcessing || isTyping
                  ? theme.buttonBackground + "80"
                  : theme.buttonBackground,
              "&:hover": { backgroundColor: theme.buttonHoverBackground },
              color: theme.buttonTextColor,
              fontSize: { xs: "0.8rem", md: "0.875rem" },
              py: { xs: 0.5, md: 0.75 },
              mr: 1,
            }}
          >
            {loading ? "Generating..." : isTyping ? "Processing..." : "Send"}
          </Button>

          <Tooltip title="Upload PDF document">
            <IconButton
              onClick={triggerFileInput}
              disabled={loading || fileProcessingState.isProcessing || isTyping}
              sx={{
                color: theme.buttonBackground,
                backgroundColor: "transparent",
                border: `1px solid ${theme.inputBorderColor}`,
                borderRadius: 1,
                padding: isMobile ? "4px" : "8px",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                },
              }}
            >
              {fileProcessingState.isProcessing ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <AttachFileIcon fontSize={isMobile ? "small" : "medium"} />
              )}
            </IconButton>
          </Tooltip>
        </Box>

        {(error || fileProcessingState.error) && (
          <Typography color="#ff6b6b" variant="caption" sx={{ ml: 2 }}>
            {error || fileProcessingState.error}
          </Typography>
        )}
      </Box>

      {/* Notification for file processing */}
      <Snackbar
        open={fileProcessingState.showNotification}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={fileProcessingState.notificationType}
          sx={{ width: "100%" }}
        >
          {fileProcessingState.notificationMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ChatForm;
