/**
 * gemini.js
 * Google Gemini AI Provider with multi-turn conversation support.
 */

const DEFAULT_MODEL = 'gemini-3.5-flash';

/**
 * Call Gemini API with multi-turn conversation support.
 * @param {string} systemPrompt - System instruction text
 * @param {{ role: string, parts: { text: string }[] }[]} contents - Conversation contents
 * @param {((text: string) => void)|null} [onChunk] - Streaming callback
 * @returns {Promise<string>} The model's response text
 */
export async function complete(systemPrompt, contents, onChunk = null) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const configuredModel = import.meta.env.VITE_GEMINI_MODEL;
  const modelName = configuredModel && configuredModel.trim() !== '' ? configuredModel.trim() : DEFAULT_MODEL;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'Gemini API key is not configured. Please define VITE_GEMINI_API_KEY in your environment (.env file).'
    );
  }

  const isStreaming = typeof onChunk === 'function';
  const action = isStreaming ? 'streamGenerateContent' : 'generateContent';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:${action}?key=${apiKey}`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents,
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.2,
        },
      }),
    });
  } catch (err) {
    throw new Error(`Network error connecting to Gemini API: ${err.message}`, { cause: err });
  }

  if (!response.ok) {
    let errMsg = `HTTP Error ${response.status}`;
    try {
      const errBody = await response.json();
      if (errBody?.error?.message) {
        errMsg = errBody.error.message;
      }
    } catch { /* ignore */ }
    throw new Error(`Gemini API Error: ${errMsg}`);
  }

  if (isStreaming) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let startIdx;
        while ((startIdx = buffer.indexOf('{')) !== -1) {
          let braceCount = 0;
          let endIdx = -1;
          let inString = false;
          let escape = false;

          for (let i = startIdx; i < buffer.length; i++) {
            const char = buffer[i];
            if (escape) { escape = false; continue; }
            if (char === '\\') { escape = true; continue; }
            if (char === '"') { inString = !inString; continue; }
            if (!inString) {
              if (char === '{') braceCount++;
              else if (char === '}') {
                braceCount--;
                if (braceCount === 0) { endIdx = i; break; }
              }
            }
          }

          if (endIdx === -1) break;

          const jsonStr = buffer.substring(startIdx, endIdx + 1);
          buffer = buffer.substring(endIdx + 1);

          try {
            const chunkObj = JSON.parse(jsonStr);
            const chunkText = chunkObj?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (chunkText) {
              fullText += chunkText;
              onChunk(fullText);
            }
          } catch (e) {
            console.warn('Skipped parsing block:', e.message);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullText;
  } else {
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini API returned an empty response.');
    }
    return text;
  }
}
