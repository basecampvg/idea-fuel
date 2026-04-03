import { Share, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { type AiActionResult, TITLES } from '../components/AiActionSheet';

export function formatResultAsPlainText(
  result: AiActionResult,
  sandboxName: string,
): string {
  const title = TITLES[result.type];
  const header = `${title} — ${sandboxName}`;

  switch (result.type) {
    case 'summary':
      return `${header}\n\n${result.data.summary}`;
    case 'brief':
      return `${header}\n\n${result.data.brief}`;
    case 'todos':
      return `${header}\n\n${result.data.todos.map((t) => `- ${t}`).join('\n')}`;
    case 'gaps':
      return `${header}\n\n${result.data.gaps.map((g) => `- ${g}`).join('\n')}`;
    case 'contradictions':
      if (result.data.contradictions.length === 0) {
        return `${header}\n\nNo contradictions found across your notes.`;
      }
      return `${header}\n\n${result.data.contradictions.map((c) => `- ${c}`).join('\n')}`;
    default:
      return header;
  }
}

export function formatResultAsHtml(
  result: AiActionResult,
  sandboxName: string,
): string {
  const title = TITLES[result.type];

  let bodyContent = '';
  switch (result.type) {
    case 'summary':
      bodyContent = `<p>${escapeHtml(result.data.summary)}</p>`;
      break;
    case 'brief':
      bodyContent = `<p>${escapeHtml(result.data.brief)}</p>`;
      break;
    case 'todos':
      bodyContent = `<ul>${result.data.todos.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`;
      break;
    case 'gaps':
      bodyContent = `<ul>${result.data.gaps.map((g) => `<li>${escapeHtml(g)}</li>`).join('')}</ul>`;
      break;
    case 'contradictions':
      if (result.data.contradictions.length === 0) {
        bodyContent = '<p>No contradictions found across your notes.</p>';
      } else {
        bodyContent = `<ul>${result.data.contradictions.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul>`;
      }
      break;
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — ${escapeHtml(sandboxName)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a; background: #fff; }
  .brand { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #E32B1A; margin-bottom: 4px; }
  .sandbox-name { font-size: 14px; color: #666; margin-bottom: 24px; }
  h1 { font-size: 22px; margin: 0 0 16px 0; }
  p { font-size: 15px; line-height: 1.6; color: #333; }
  ul { padding-left: 20px; }
  li { font-size: 15px; line-height: 1.6; color: #333; margin-bottom: 8px; }
</style>
</head>
<body>
  <div class="brand">IDEA FUEL</div>
  <div class="sandbox-name">${escapeHtml(sandboxName)}</div>
  <h1>${escapeHtml(title)}</h1>
  ${bodyContent}
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function shareAiResult(
  result: AiActionResult,
  sandboxName: string,
): Promise<void> {
  const plainText = formatResultAsPlainText(result, sandboxName);
  const html = formatResultAsHtml(result, sandboxName);

  const title = TITLES[result.type];
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `IdeaFuel-${title.replace(/\s+/g, '-')}-${date}.html`;
  const filePath = `${FileSystem.cacheDirectory}${fileName}`;

  try {
    await FileSystem.writeAsStringAsync(filePath, html, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (Platform.OS === 'ios') {
      await Share.share({ message: plainText, url: filePath });
    } else {
      // Android: Share.share doesn't support url, just share plain text
      await Share.share({ message: plainText });
    }
  } catch {
    // User cancelled or share failed — no-op
  }
}
