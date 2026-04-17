document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("generateBtn");

  console.log("button found:", btn);

  btn.addEventListener("click", () => {
    console.log("BUTTON CLICK WORKING");
  });
});
