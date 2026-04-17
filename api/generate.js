export default async function handler(req, res) {
  console.log("API HIT - REQUEST RECEIVED");

  return res.status(200).json({
    ok: true,
    message: "Backend is working",
    bodyReceived: req.body
  });
}
