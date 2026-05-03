export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, message: 'Webhook endpoint ready' });
  }

  const body = req.body || {};
  const { event_type, task_detail } = body;

  if (event_type !== 'task_stopped' || task_detail?.stop_reason !== 'finish') {
    return res.status(200).json({ skipped: true });
  }

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_DB_ID = process.env.NOTION_DB_ID;

  if (!NOTION_TOKEN || !NOTION_DB_ID) {
    return res.status(500).json({ error: 'Missing env vars' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const taskTitle = (task_detail?.task_title || 'Manus Session').slice(0, 100);

    const notionRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_DB_ID },
        properties: {
          'Player Name': {
            title: [{ text: { content: taskTitle } }]
          },
          'Last Session Date': {
            date: { start: today }
          }
        }
      })
    });

    const data = await notionRes.json();
    if (!notionRes.ok) return res.status(500).json({ error: data });
    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
