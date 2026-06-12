// /api/analyze.js
// Vercel のサーバーレス関数。
// フロントエンドから画像(base64)を受け取り、Google Gemini API に送って
// 食品の名前と推定カロリーを解析して返す。

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { image, mediaType } = req.body;

  if (!image || !mediaType) {
    return res.status(400).json({ error: '画像データがありません' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'APIキーが設定されていません(サーバー設定を確認してください)' });
  }

  const prompt = `この写真に写っている食品（お菓子・料理など）を判定してください。
以下の形式で日本語で答えてください。複数の食品が写っている場合は、それぞれについて記載してください。

【食品名】
【推定量（目安）】
【推定カロリー】 〇〇 kcal 程度
【補足】（見た目から判断した根拠やコメント、誤差がある旨）

写真がはっきりしない、または食品が写っていない場合は、その旨を伝えてください。`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mediaType,
                    data: image
                  }
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', data);
      return res.status(500).json({ error: 'AI解析でエラーが発生しました' });
    }

    const textContent = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text)
      .filter(Boolean)
      .join('\n') || '解析結果を取得できませんでした。';

    return res.status(200).json({ result: textContent });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'サーバー内部エラー' });
  }
}
