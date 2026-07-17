import { createFileRoute } from "@tanstack/react-router";

const SYSTEM = `Sen "Akademya", YKS ve KPSS öğrencileri için Türkçe konuşan, sıcak, motive edici bir çalışma asistanısın.
- Öğrencilere ders konularını (matematik, türkçe, tarih, coğrafya, fizik, kimya, biyoloji, vatandaşlık) açıkça ve örneklerle anlat.
- Ders programı oluşturmalarına, çalışma stratejileri geliştirmelerine yardım et.
- Cevaplarını kısa paragraflarda, gerekirse maddeler halinde ver.
- ÖSYM'nin telifli sorularını birebir aktarma; kavramları kendi cümlelerinle anlat.
- Emin olmadığın konuda dürüstçe söyle.
- Her zaman Türkçe yanıtla.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const { messages } = (await request.json()) as { messages: { role: string; content: string }[] };
        if (!Array.isArray(messages)) return new Response("Bad request", { status: 400 });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            stream: true,
            messages: [{ role: "system", content: SYSTEM }, ...messages],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          console.error("AI upstream error", upstream.status, text);
          return new Response(text || "AI error", { status: upstream.status });
        }

        // Parse SSE stream from OpenAI-compatible endpoint and emit raw text tokens.
        const stream = new ReadableStream({
          async start(controller) {
            const reader = upstream.body!.getReader();
            const dec = new TextDecoder();
            const enc = new TextEncoder();
            let buf = "";
            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop() ?? "";
                for (const line of lines) {
                  const s = line.trim();
                  if (!s.startsWith("data:")) continue;
                  const payload = s.slice(5).trim();
                  if (payload === "[DONE]") { controller.close(); return; }
                  try {
                    const json = JSON.parse(payload);
                    const delta = json.choices?.[0]?.delta?.content;
                    if (delta) controller.enqueue(enc.encode(delta));
                  } catch { /* ignore partial chunks */ }
                }
              }
              controller.close();
            } catch (err) {
              controller.error(err);
            }
          },
        });

        return new Response(stream, {
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});
