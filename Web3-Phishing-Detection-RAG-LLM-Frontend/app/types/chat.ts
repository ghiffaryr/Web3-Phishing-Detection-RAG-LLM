export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  created: Date;
  lastUpdated: Date;
}

export interface ThemeConfig {
  name: string;
  appBar: string;
  background: string;
  cardBackground: string;
  containerBackground: string;
  borderColor: string;
  userBubbleBackground: string;
  assistantBubbleBackground: string;
  userTextColor: string;
  assistantTextColor: string;
  inputTextColor: string;
  inputLabelColor: string;
  inputBorderColor: string;
  inputHoverBorderColor: string;
  buttonBackground: string;
  buttonHoverBackground: string;
  buttonTextColor: string;
  codeBlockBackground: string;
  codeTextColor: string;
  codeBorderColor: string;
}

export interface FormattedTextProps {
  text: string;
  isTyping?: boolean;
}

export interface ChatFormProps {
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
  dockMode?: boolean; // New property for dock-like layout
}
