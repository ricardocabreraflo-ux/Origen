// Cliente mínimo de la Claude API (Anthropic), usado para el análisis del
// post viral y la generación del borrador de recreación (RF7/RF8). Se usa
// fetch directo en vez del SDK para no sumar una dependencia nueva al
// proyecto.

const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-5";

async function askClaude({ system, messages, maxTokens = 1500 }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Falta la variable de entorno ANTHROPIC_API_KEY");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API respondió ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return data.content.map((block) => block.text || "").join("\n");
}

// Extrae el primer bloque JSON de una respuesta de texto de Claude. Se le
// pide siempre JSON en el prompt, pero esto tolera que venga envuelto en
// texto o en un bloque ```json.
function extractJson(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`No se encontró JSON en la respuesta de Claude: ${text}`);
  }
  return JSON.parse(raw.slice(start, end + 1));
}

module.exports = { askClaude, extractJson };
