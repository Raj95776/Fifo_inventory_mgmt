import 'dotenv/config';
import { prisma } from '../prisma';

(async () => {
  const rows = await prisma.$queryRaw<Array<{ table_schema: string; table_name: string }>>`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type='BASE TABLE'
      AND table_schema NOT IN ('pg_catalog','information_schema')
    ORDER BY table_schema, table_name;
  `;
  console.table(rows);
  await prisma.$disconnect();
})();
