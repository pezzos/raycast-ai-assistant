import { Detail } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { getClipboardContent, getSelectedText, replaceSelectedText } from "./utils/common";

export default function Command() {
  const [clipboardText, setClipboardText] = useState<string>("");
  const [error, setError] = useState<string>("");
  const hasRun = useRef(false);

  useEffect(() => {
    async function fetchTexts() {
      if (hasRun.current) return;
      hasRun.current = true;

      try {
        const clipboard = await getClipboardContent();
        setClipboardText(clipboard);

        try {
          await replaceSelectedText("Replaced by test.tsx");
        } catch (e) {
          setError("No text selected");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error occurred");
      }
    }

    fetchTexts();
  }, []);

  const markdown = `
# Text Test Results

## Clipboard Content
\`\`\`
${clipboardText}
\`\`\`

${error ? `## Error\n\`\`\`\n${error}\n\`\`\`` : ""}
`;

  return <Detail markdown={markdown} />;
}
