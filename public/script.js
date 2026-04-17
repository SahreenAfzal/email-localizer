
const htmlInput = document.getElementById("htmlInput");
const docxInput = document.getElementById("docxInput");
const htmlZone = document.getElementById("htmlZone");
const docxZone = document.getElementById("docxZone");
const htmlLabel = document.getElementById("htmlLabel");
const docxLabel = document.getElementById("docxLabel");
const generateBtn = document.getElementById("generateBtn");
const status = document.getElementById("status");

let htmlFile = null, docxFile = null;

function setupZone(zone, input, labelEl, onFile) {
  zone.addEventListener("click", () => input.click());
  input.addEventListener("change", () => { if (input.files[0]) onFile(input.files[0]); });
  zone.addEventListener("dragover", e => { e.preventDefault(); zone.classList.add("drag"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("drag"));
  zone.addEventListener("drop", e => {
    e.preventDefault(); zone.classList.remove("drag");
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  });
}

setupZone(htmlZone, htmlInput, htmlLabel, f => {
  htmlFile = f;
  htmlLabel.textContent = f.name;
  htmlZone.classList.add("has-file");
  checkReady();
});

setupZone(docxZone, docxInput, docxLabel, f => {
  docxFile = f;
  docxLabel.textContent = f.name;
  docxZone.classList.add("has-file");
  checkReady();
});

function checkReady() {
  generateBtn.disabled = !(htmlFile && docxFile);
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = () => reject(new Error("File read failed"));
    r.readAsDataURL(file);
  });
}

function setStatus(msg, type = "") {
  status.textContent = msg;
  status.className = type;
}

generateBtn.addEventListener("click", async () => {
  generateBtn.disabled = true;
  setStatus("Reading files...");

  try {
    const [htmlBase64, docxBase64] = await Promise.all([toBase64(htmlFile), toBase64(docxFile)]);

    setStatus("Sending to Claude API — this may take a minute...");

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ htmlBase64, docxBase64 })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || `Server error ${res.status}`);
    }

    setStatus("Preparing download...");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "localized_emails.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatus("Done! Your ZIP has been downloaded.", "success");
  } catch (err) {
    setStatus("Error: " + err.message, "error");
  } finally {
    generateBtn.disabled = false;
  }
});
