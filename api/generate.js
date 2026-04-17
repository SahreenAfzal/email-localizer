import mammoth from "mammoth";
import archiver from "archiver";

export default async function handler(req, res) {
  try {
    const htmlBase64 = req.body?.html;
    const docxBase64 = req.body?.file;

    if (!htmlBase64 || !docxBase64) {
      return res.status(400).json({ error: "Missing HTML or DOCX file" });
    }

    // Decode HTML
    const html = Buffer.from(htmlBase64, "base64").toString("utf-8");

    // Decode DOCX → text
    const docxBuffer = Buffer.from(docxBase64, "base64");
    const docxResult = await mammoth.extractRawText({ buffer: docxBuffer });
    const translations = docxResult.value;

    console.log("HTML SIZE:", html.length);
    console.log("DOCX SIZE:", translations.length);

    // CALL OPENAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `
You are an expert HTML Email Developer and Localization Engine.

TASK:
You will receive:
1. A reference English HTML email
2. A translation document

YOUR JOB:
- Preserve the EXACT HTML structure (tables, VML, inline CSS, SFMC format)
- DO NOT modify layout, spacing, or attributes
- Only replace TEXT content with translated equivalents
- Maintain email compatibility (Outlook, Gmail, Apple Mail)

CRITICAL BOLD RULE:
- Detect all <b> and <strong> text in the English version
- Find the closest semantic equivalent words in translated languages
- Apply bold formatting (<b> or <strong>) in translated HTML where meaning matches
- Do NOT randomly add or remove bold — preserve intent

OUTPUT FORMAT (STRICT):

Return ONLY raw HTML blocks in this format:

<!-- EN -->
<html>...</html>

<!-- DE -->
<html>...</html>

<!-- FR -->
<html>...</html>

RULES:
- NO JSON
- NO explanations
- NO markdown
- Each block must be full valid HTML
- Keep structure identical across all languages
`
          },
          {
            role: "user",
            content: `
REFERENCE ENGLISH HTML:
${html}

TRANSLATION DOCUMENT:
${translations}
`
          }
        ]
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log("OPENAI OUTPUT:", content);

    // PARSE HTML BLOCKS
    function parseHTMLBlocks(text) {
      const blocks = {};
      const regex = /<!--\s*([A-Z]{2})\s*-->\s*([\s\S]*?)(?=(<!--|$))/g;

      let match;
      while ((match = regex.exec(text)) !== null) {
        const lang = match[1].toLowerCase();
        const html = match[2].trim();
        blocks[lang] = html;
      }

      return blocks;
    }

    const parsed = parseHTMLBlocks(content);

    if (!parsed || Object.keys(parsed).length === 0) {
      return res.status(500).json({
        error: "Failed to parse AI HTML output",
        raw: content
      });
    }

    // CREATE ZIP
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=localized_emails.zip");

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    Object.entries(parsed).forEach(([lang, htmlFile]) => {
      archive.append(htmlFile, { name: `${lang}.html` });
    });

    await archive.finalize();

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}
