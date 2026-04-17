document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("generateBtn");

  btn.addEventListener("click", generate);
});

async function generate() {
  console.log("inside generate");
  
  const fileInput = document.getElementById("htmlFile");
  console.log("file input element:", fileInput);

  console.log("files:", fileInput.files);
  console.log("first file:", fileInput.files[0]);
  
  const htmlFile = document.getElementById("htmlFile").files[0];

  if (!htmlFile) {
    alert("Upload HTML file");
    return;
  }

  const html = await htmlFile.text();

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ html })
    });

    const data = await res.json();

    document.getElementById("output").textContent = data.output;

  } catch (e) {
    alert("API error");
    console.error(e);
  }
}
