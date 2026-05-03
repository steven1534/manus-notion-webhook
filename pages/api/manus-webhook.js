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
  const NOTION_PAGE_ID = process.env.NOTION_DB_ID;

  if (!NOTION_TOKEN || !NOTION_PAGE_ID) {
    return res.status(500).json({ error: 'Missing env vars' });
  }

  try {
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const taskTitle = (task_detail?.task_title || 'Manus Task').slice(0, 200);
    const taskUrl = task_detail?.task_url || null;
    const taskMsg = (task_detail?.message || '').slice(0, 500);

    const blocks = [
      {
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: `Manus Task Completed — ${today}` } }]
        }
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { type: 'text', text: { content: 'Task: ' }, annotations: { bold: true } },
            taskUrl
              ? { type: 'text', text: { content: taskTitle, link: { url: taskUrl } } }
              : { type: 'text', text: { content: taskTitle } }
          ]
        }
      },
      ...(taskMsg ? [{
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { type: 'text', text: { content: 'Notes: ' }, annotations: { bold: true } },
            { type: 'text', text: { content: taskMsg } }
          ]
        }
      }] : []),
      {
        object: 'block',
        type: 'divider',
        divider: {}
      }
    ];

    const notionRes = await fetch(`https://api.notion.com/v1/blocks/${NOTION_PAGE_ID}/children`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ children: blocks })
    });

    const data = await notionRes.json();
    if (!notionRes.ok) return res.status(500).json({ error: data });
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
