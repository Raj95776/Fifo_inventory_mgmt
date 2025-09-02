import 'dotenv/config';
import path from 'path';
import { createWriteStream, mkdirSync } from 'fs';
import { format } from '@fast-csv/format';
import { prisma } from '../prisma';

const CSV_PATH = path.resolve(__dirname, '../../../fifo-ml/data/transactions.csv');
mkdirSync(path.dirname(CSV_PATH), { recursive: true });

type Row = { date: string; sku_id: string; qty_out: number };

(async () => {
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT
        TO_CHAR(DATE(n."issueDate"), 'YYYY-MM-DD')                 AS date,
        COALESCE(m."name", m."id"::text)                           AS sku_id,
        SUM(i."quantity")                                          AS qty_out
      FROM "IssueItem" i
      JOIN "IssueNote" n ON n."id" = i."issueNoteId"
      JOIN "Material"  m ON m."id" = i."materialId"
      WHERE n."issueDate" >= CURRENT_DATE - INTERVAL '365 days'
      GROUP BY DATE(n."issueDate"), COALESCE(m."name", m."id"::text)
      ORDER BY DATE(n."issueDate"), COALESCE(m."name", m."id"::text);
    `;

    const ws = createWriteStream(CSV_PATH);
    const csv = format({ headers: true });
    csv.pipe(ws);

    for (const r of rows) {
      csv.write({
        date: r.date,                         // YYYY-MM-DD
        sku_id: r.sku_id || 'UNKNOWN',
        qty_out: Number(r.qty_out) || 0,
      });
    }
    csv.end();

    await new Promise<void>((resolve, reject) => {
      ws.on('finish', () => resolve());
      ws.on('error', (err) => reject(err));
    });

    console.log(' Exported to', CSV_PATH);
  } catch (err: any) {
    console.error(' Export failed:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
