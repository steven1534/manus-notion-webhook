export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { event_type, task_detail } = req.body;

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
            title: [{ text: { content: task_detail.task_title || 'Manus Task' } }]
          },
          'Session Notes': {
            rich_text: [{ text: { content: (task_detail.message || '').slice(0, 2000) } }]
          },
          'Date': { date: { start: today } },
          'Manus Link': { url: task_detail.task_url || null },
          'Status': {
            rich_text: [{ text: { content: 'finish' } }]
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
