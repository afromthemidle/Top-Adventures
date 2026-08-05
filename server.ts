import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for sending email
  app.post("/api/send-email", async (req, res) => {
    try {
      const { to, subject, html } = req.body;
      const resendApiKey = process.env.RESEND_API_KEY;

      if (!resendApiKey) {
        console.log("-----------------------------------------");
        console.log(`[Email Mock] Simulando envío a: ${to}`);
        console.log(`[Email Mock] Asunto: ${subject}`);
        console.log(`[Email Mock] Contenido (HTML): ${html.substring(0, 100)}...`);
        console.log("-----------------------------------------");
        return res.json({ success: true, fakeSend: true, message: "Simulación de email exitosa. Falta RESEND_API_KEY en variables de entorno." });
      }

      const resend = new Resend(resendApiKey);

      // In testing mode without a custom domain, Resend only allows sending to the verified email address.
      const recipient = "andres.diaz.alvear@gmail.com";

      const { data, error } = await resend.emails.send({
        from: "Acme <onboarding@resend.dev>", // default testing email for Resend
        to: [recipient],
        subject: `[Testing for ${to}] ${subject}`,
        html: html,
      });

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Error sending email:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Helper function to get PayPal Access Token
  const getPayPalAccessToken = async () => {
    const clientId = process.env.VITE_PAYPAL_CLIENT_ID?.trim() || '';
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim() || '';
    const mode = process.env.PAYPAL_MODE?.trim() || 'sandbox';
    const baseUrl = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

    if (!clientId || clientId.includes('Client ID')) throw new Error("Falta configurar VITE_PAYPAL_CLIENT_ID en las variables de entorno.");
    if (!clientSecret) throw new Error("Falta configurar PAYPAL_CLIENT_SECRET en las variables de entorno (menú Settings).");

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        body: 'grant_type=client_credentials',
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded"
        },
    });
    const data = await response.json();
    if (!response.ok) {
        if (data.error === "invalid_client" || (data.error_description || "").includes("Client Authentication failed")) {
             throw new Error("Credenciales de PayPal inválidas (Client ID o Secret incorrectos). Verifica en Settings.");
        }
        throw new Error(data.error_description || "Could not get PayPal access token");
    }
    return { token: data.access_token, baseUrl };
  };

  // Create PayPal Order
  app.post("/api/paypal/create-order", async (req, res) => {
    try {
      const { amount } = req.body;
      const finalAmount = amount || "25.00";

      const paypalAuth = await getPayPalAccessToken();
      const { token, baseUrl } = paypalAuth as {token: string, baseUrl: string};

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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderPayload),
      });

      const orderData = await response.json();
      if (!response.ok) {
        throw new Error(orderData.message || "Error creating order");
      }

      res.json({ success: true, id: orderData.id });
    } catch (err: any) {
      console.error("PayPal Create Order Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Capture PayPal Order
  app.post("/api/paypal/capture-order", async (req, res) => {
    try {
      const { orderID } = req.body;
      const paypalAuth = await getPayPalAccessToken();
      
      const { token, baseUrl } = paypalAuth as {token: string, baseUrl: string};

      const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderID}/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const captureData = await response.json();
      if (!response.ok) {
        throw new Error(captureData.message || "Error capturing order");
      }

      const isCompleted = captureData.status === "COMPLETED";
      res.json({ success: isCompleted, data: captureData });
    } catch (err: any) {
      console.error("PayPal Capture Order Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
