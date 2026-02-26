/**
 * TenTap editor dark theme CSS
 * Matches the Idea Fuel design system colors
 */
export const editorDarkThemeCSS = `
  * {
    box-sizing: border-box;
  }

  body {
    background-color: #161513;
    color: #E8E4DC;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 16px;
    line-height: 1.6;
    padding: 0;
    margin: 0;
    -webkit-font-smoothing: antialiased;
  }

  .ProseMirror {
    padding: 16px;
    min-height: 100%;
    outline: none;
  }

  .ProseMirror-focused {
    outline: none;
  }

  /* Placeholder */
  .ProseMirror p.is-editor-empty:first-child::before {
    color: #5A5855;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }

  /* Headings */
  h1 {
    color: #E8E4DC;
    font-size: 28px;
    font-weight: 700;
    line-height: 1.3;
    margin: 24px 0 8px 0;
    letter-spacing: -0.5px;
  }

  h2 {
    color: #E8E4DC;
    font-size: 22px;
    font-weight: 600;
    line-height: 1.3;
    margin: 20px 0 6px 0;
  }

  h3 {
    color: #E8E4DC;
    font-size: 18px;
    font-weight: 600;
    line-height: 1.4;
    margin: 16px 0 4px 0;
  }

  /* Paragraphs */
  p {
    margin: 0 0 8px 0;
  }

  /* Links */
  a {
    color: #14B8A6;
    text-decoration: underline;
    text-decoration-color: rgba(20, 184, 166, 0.4);
    text-underline-offset: 2px;
  }

  /* Bold & Italic */
  strong {
    color: #E8E4DC;
    font-weight: 700;
  }

  em {
    font-style: italic;
  }

  /* Code */
  code {
    background-color: #1A1918;
    color: #E32B1A;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 14px;
  }

  pre {
    background-color: #1A1918;
    border: 1px solid #2A2A2A;
    border-radius: 8px;
    padding: 12px 16px;
    margin: 12px 0;
    overflow-x: auto;
  }

  pre code {
    background: none;
    padding: 0;
    color: #E8E4DC;
    font-size: 14px;
  }

  /* Lists */
  ul, ol {
    padding-left: 24px;
    margin: 8px 0;
  }

  li {
    margin: 4px 0;
  }

  li::marker {
    color: #8A8680;
  }

  /* Task list (checkboxes) */
  ul[data-type="taskList"] {
    list-style: none;
    padding-left: 0;
  }

  ul[data-type="taskList"] li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  ul[data-type="taskList"] li label {
    margin-top: 2px;
  }

  ul[data-type="taskList"] li[data-checked="true"] > div > p {
    text-decoration: line-through;
    color: #5A5855;
  }

  ul[data-type="taskList"] li input[type="checkbox"] {
    accent-color: #E32B1A;
    width: 18px;
    height: 18px;
    margin-top: 3px;
  }

  /* Blockquote */
  blockquote {
    border-left: 3px solid #E32B1A;
    padding-left: 16px;
    margin: 12px 0;
    color: #8A8680;
    font-style: italic;
  }

  /* Horizontal rule */
  hr {
    border: none;
    border-top: 1px solid #2A2A2A;
    margin: 20px 0;
  }

  /* Selection */
  ::selection {
    background-color: rgba(227, 43, 26, 0.3);
  }
`;
