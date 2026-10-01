import { db } from "./db";
export async function searchKnowledge(q: string, projectId = "", offset = 0, limit = 30, broad = false) {
    const tokens = q.match(/[\p{L}\p{N}_-]+/gu)?.slice(0, 16) || [];
    if (!tokens.length)
        return { results: [], total: 0, nextOffset: null };
    const expression = tokens.map(t => `'${t.replaceAll("'", "")}':*`).join(broad ? " | " : " & ");
    const like = `%${q.replace(/[\\%_]/g, c => "\\" + c)}%`;
    // Join every indexed entity to its owning project; memory never crosses workspaces.
    const sql = `WITH matches AS (
    SELECT i.entity_type,i.entity_id,i.title,i.body,i.path,-ts_rank(i.document,to_tsquery('english',?)) AS rank,
      COALESCE(f.project_id,r.project_id) AS project_id,COALESCE(f.session_id,r.session_id) AS session_id,r.url
    FROM search_index i LEFT JOIN findings f ON i.entity_type='finding' AND f.id=i.entity_id
    LEFT JOIN resources r ON i.entity_type='resource' AND r.id=i.entity_id
    WHERE i.document @@ to_tsquery('english',?) AND (?='' OR COALESCE(f.project_id,r.project_id)=?)
    UNION ALL SELECT 'session',id,topic,executive_summary || chr(10) || instructions,'Research history',1,project_id,id,NULL
      FROM sessions WHERE (?='' OR project_id=?) AND (topic ILIKE ? ESCAPE '\\' OR executive_summary ILIKE ? ESCAPE '\\')
    UNION ALL SELECT 'folder',id,name,path,path,2,project_id,NULL,NULL FROM folders
      WHERE (?='' OR project_id=?) AND path ILIKE ? ESCAPE '\\'
    UNION ALL SELECT 'decision',id,'Organization decision',reason || chr(10) || rule_value,'Decisions',3,project_id,NULL,NULL FROM decisions
      WHERE (?='' OR project_id=?) AND (reason ILIKE ? ESCAPE '\\' OR rule_value ILIKE ? ESCAPE '\\')
  )`;
    const args = [expression,expression, projectId, projectId, projectId, projectId, like, like, projectId, projectId, like, projectId, projectId, like, like];
    const total = Number(((await db.prepare(sql + ` SELECT COUNT(*) AS n FROM matches`).get(...args)) as any).n);
    const results = (await db.prepare(sql + ` SELECT * FROM matches ORDER BY rank,title,entity_id LIMIT ? OFFSET ?`).all(...args, limit, offset));
    return { results, total, nextOffset: offset + results.length < total ? offset + results.length : null };
}
export async function retrieveMemory(projectId: string, topic: string, instructions: string) {
    const stop = new Set(["the", "and", "for", "with", "what", "how", "does", "this", "that", "from", "research", "please", "into", "our", "are", "can"]);
    const query = (topic.match(/[\p{L}\p{N}_-]+/gu) || []).filter(t => t.length > 2 && !stop.has(t.toLowerCase())).join(" ");
    const matches = query ? (await searchKnowledge(query, projectId, 0, 12, true)).results as any[] : [];
    const decisions = (await db.prepare(`SELECT id,rule_key,rule_value,reason FROM decisions WHERE project_id=? ORDER BY created_at DESC`).all(projectId)) as any[];
    const words = new Set((topic + " " + instructions).toLowerCase().match(/[\p{L}\p{N}_-]+/gu) || []);
    const ranked = decisions.map((d, i) => ({ d, i, score: [...words].filter(w => w.length > 2 && (d.reason + d.rule_value).toLowerCase().includes(w)).length })).sort((a, b) => b.score - a.score || a.i - b.i).slice(0, 20).map(x => x.d);
    const entries = matches.map(m => ({ id: m.entity_id, type: m.entity_type, title: m.title, folder: m.path, sessionId: m.session_id, content: String(m.body).slice(0, 1800) }));
    const text = JSON.stringify({ priorKnowledge: entries, organizationDecisions: ranked });
    return { entries, decisions: ranked, text };
}
