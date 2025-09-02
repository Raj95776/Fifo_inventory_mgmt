import 'dotenv/config';
import { prisma } from '../prisma';

async function list(table: string) {
  const cols = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table};
  `;
  console.log(table, cols.map(c => c.column_name));
}

(async () => {
  await list('IssueNote');
  await list('IssueItem');
  await list('Material');
  await prisma.$disconnect();
})();
