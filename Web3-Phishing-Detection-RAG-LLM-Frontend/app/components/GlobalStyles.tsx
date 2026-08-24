import { ThemeConfig } from "../types/chat";
import { breakpoints } from "../constants/themes";

interface GlobalStylesProps {
  theme: ThemeConfig;
}

export const GlobalStyles = ({ theme }: GlobalStylesProps) => {
  return (
    <style jsx global>{`
      @keyframes blink {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0;
        }
      }

      .formatted-text {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          Helvetica, Arial, sans-serif;
        line-height: 1.6;
        white-space: pre-wrap;
        word-wrap: break-word;
        max-width: 100%;
        overflow-wrap: break-word;
        color: ${theme.assistantTextColor};
        text-align: justify;
      }

      ${breakpoints.xs} {
        .formatted-text {
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .text-paragraph {
          margin-bottom: 12px;
        }

        .code-block {
          padding: 12px;
          font-size: 80%;
          margin-bottom: 12px;
          line-height: 1.4;
        }
      }

      .text-paragraph {
        margin-bottom: 16px;
        max-width: 100%;
        text-align: justify;
      }

      .code-block {
        background-color: ${theme.codeBlockBackground};
        border-radius: 8px;
        padding: 16px;
        max-width: 100%;
        white-space: pre-wrap;
        word-break: break-word;
        font-family: "SF Mono", "Roboto Mono", Menlo, Consolas, monospace;
        font-size: 90%;
        line-height: 1.5;
        margin-bottom: 16px;
        border: 1px solid ${theme.codeBorderColor};
        color: ${theme.codeTextColor};
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      .code-block code {
        display: block;
        width: 100%;
        overflow-x: visible;
        white-space: pre-wrap;
      }

      .cursor-blink {
        animation: blink 1s step-end infinite;
        font-weight: normal;
        color: ${theme.userTextColor};
      }

      @media (max-width: 600px) {
        body {
          margin: 0;
          padding: 0;
        }
      }
    `}</style>
  );
};

export default GlobalStyles;
