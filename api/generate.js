export default function handler(req, res) {
  console.log("API HIT");

  const html = req.body?.html || "";

  return res.status(200).json({
    message: "Backend received your request 🎉",
    receivedHTMLLength: html.length
  });
}
