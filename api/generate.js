export default function handler(req, res) {
  console.log("API HIT");

  res.status(200).json({
    status: "success",
    message: "Backend received your request 🎉",
    receivedHTMLLength: req.body?.html?.length || 0
  });
}
