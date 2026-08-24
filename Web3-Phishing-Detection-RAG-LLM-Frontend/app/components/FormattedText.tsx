import { FormattedTextProps } from "../types/chat";

/**
 * Component that formats text with code blocks and paragraphs
 */
export const FormattedText = ({ text, isTyping }: FormattedTextProps) => {
  // Process the text to identify code blocks and other formatting
  const processText = () => {
    // Split by double newlines to identify paragraphs
    const paragraphs = text.split(/\n\n+/);

    return (
      <>
        {paragraphs.map((paragraph, pIndex) => {
          // Check if this is a code block (starts with spaces or tabs)
          const isCodeBlock = /^(\s{2,}|\t)/.test(paragraph);

          if (isCodeBlock) {
            return (
              <pre key={pIndex} className="code-block">
                <code>{paragraph}</code>
              </pre>
            );
          }

          // Handle regular paragraphs with line breaks
          const lines = paragraph.split("\n");
          return (
            <p key={pIndex} className="text-paragraph">
              {lines.map((line, lIndex) => (
                <span key={lIndex}>
                  {line}
                  {lIndex < lines.length - 1 && <br />}
                </span>
              ))}
            </p>
          );
        })}
        {isTyping && <span className="cursor-blink">▋</span>}
      </>
    );
  };

  return <div className="formatted-text">{processText()}</div>;
};

export default FormattedText;
