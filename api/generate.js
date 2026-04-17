import mammoth from "mammoth";
import archiver from "archiver";

export default async function handler(req, res) {
  try {
    const htmlBase64 = req.body?.html;
    const docxBase64 = req.body?.file;

    if (!htmlBase64 || !docxBase64) {
      return res.status(400).json({ error: "HTML and DOCX are required" });
    }

    // STEP 1: Decode HTML
    const html = Buffer.from(htmlBase64, "base64").toString("utf-8");

    // STEP 2: Decode DOCX → text
    const docxBuffer = Buffer.from(docxBase64, "base64");
    const docxResult = await mammoth.extractRawText({ buffer: docxBuffer });
    const translations = docxResult.value;

    console.log("HTML LENGTH:", html.length);
    console.log("DOCX TEXT LENGTH:", translations.length);

    // STEP 3: OPENAI REQUEST
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
You are an expert HTML Email Developer.

I will provide you with a reference Enphase email. Your task is to carefully analyze it and replicate the same coding standards, structure, and styling while building localized versions.

STRICT RULES:

1. STRUCTURE
- Use table-based layout only (no divs for structure)
- Nested tables for sections (header, hero, body, footer)
- Max width 600px centered
- cellpadding, cellspacing, border="0"
- Outlook compatibility required

2. CSS & STYLING
- Reuse structure and patterns from reference email
- Inline CSS for email safety
- Maintain responsiveness using media queries

3. FONTS
- Match reference font-family
- Include web-safe fallbacks

4. RESPONSIVENESS
- Mobile stacking required
- Images fluid (max-width:100%)

5. CTA BUTTONS
- Table-based bulletproof buttons
- Outlook compatible

6. IMAGES
- Proper alt text
- No broken layout if images fail

7. BACKGROUND IMAGES
- Use VML/MSO for Outlook support
- Include fallback colors

8. LISTS
- NO ul/ol/li
- Use table-based lists only

9. SPACING
- Use spacer rows, not margins

10. SFMC COMPATIBILITY
- Must work in Salesforce Marketing Cloud
- Preserve %%FirstName%% and similar tokens

STRICT RULE:
Always prioritize Outlook compatibility and email client consistency.

OUTPUT FORMAT (VERY IMPORTANT):
Return ONLY valid JSON in this format:

{
  "en": "<html>...</html>",
  "de": "<html>...</html>",
  "fr": "<html>...</html>",
  "es": "<html>...</html>"
}
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
        ],
        temperature: 0.2
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log("OPENAI RAW RESPONSE:", content);

    // STEP 4: Parse AI JSON safely
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      return res.status(500).json({
        error: "AI returned invalid JSON",
        raw: content
      });
    }

    // STEP 5: CREATE ZIP FILE
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=localized_emails.zip");

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    Object.entries(parsed).forEach(([lang, htmlFile]) => {
      archive.append(htmlFile, { name: `${lang}.html` });
    });

    await archive.finalize();

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}
