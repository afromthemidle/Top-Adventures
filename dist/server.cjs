var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_resend = require("resend");
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.post("/api/send-email", async (req, res) => {
    try {
      const { to, subject, html } = req.body;
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.log("-----------------------------------------");
        console.log(`[Email Mock] Simulando env\xEDo a: ${to}`);
        console.log(`[Email Mock] Asunto: ${subject}`);
        console.log(`[Email Mock] Contenido (HTML): ${html.substring(0, 100)}...`);
        console.log("-----------------------------------------");
        return res.json({ success: true, fakeSend: true, message: "Simulaci\xF3n de email exitosa. Falta RESEND_API_KEY en variables de entorno." });
      }
      const resend = new import_resend.Resend(resendApiKey);
      const recipient = "andres.diaz.alvear@gmail.com";
      const { data, error } = await resend.emails.send({
        from: "Acme <onboarding@resend.dev>",
        // default testing email for Resend
        to: [recipient],
        subject: `[Testing for ${to}] ${subject}`,
        html
      });
      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }
      res.json({ success: true, data });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  const getPayPalAccessToken = async () => {
    const clientId = process.env.VITE_PAYPAL_CLIENT_ID?.trim() || "";
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim() || "";
    const mode = process.env.PAYPAL_MODE?.trim() || "sandbox";
    const baseUrl = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
    if (!clientId || clientId.includes("Client ID")) throw new Error("Falta configurar VITE_PAYPAL_CLIENT_ID en las variables de entorno.");
    if (!clientSecret) throw new Error("Falta configurar PAYPAL_CLIENT_SECRET en las variables de entorno (men\xFA Settings).");
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      body: "grant_type=client_credentials",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    const data = await response.json();
    if (!response.ok) {
      if (data.error === "invalid_client" || (data.error_description || "").includes("Client Authentication failed")) {
        throw new Error("Credenciales de PayPal inv\xE1lidas (Client ID o Secret incorrectos). Verifica en Settings.");
      }
      throw new Error(data.error_description || "Could not get PayPal access token");
    }
    return { token: data.access_token, baseUrl };
  };
  app.post("/api/paypal/create-order", async (req, res) => {
    try {
      const { amount } = req.body;
      const finalAmount = amount || "25.00";
      const paypalAuth = await getPayPalAccessToken();
      const { token, baseUrl } = paypalAuth;
      const orderPayload = {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: finalAmount
            },
            payee: {
              email_address: "resumenesdenoticias@gmail.com"
            }
          }
        ]
      };
      const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload)
      });
      const orderData = await response.json();
      if (!response.ok) {
        throw new Error(orderData.message || "Error creating order");
      }
      res.json({ success: true, id: orderData.id });
    } catch (err) {
      console.error("PayPal Create Order Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/paypal/capture-order", async (req, res) => {
    try {
      const { orderID } = req.body;
      const paypalAuth = await getPayPalAccessToken();
      const { token, baseUrl } = paypalAuth;
      const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderID}/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      const captureData = await response.json();
      if (!response.ok) {
        throw new Error(captureData.message || "Error capturing order");
      }
      const isCompleted = captureData.status === "COMPLETED";
      res.json({ success: isCompleted, data: captureData });
    } catch (err) {
      console.error("PayPal Capture Order Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
