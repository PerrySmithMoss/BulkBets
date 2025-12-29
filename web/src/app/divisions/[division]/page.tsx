import { capitaliseWords } from "@/lib/utils/string";

export async function generateMetadata({
  params,
}: {
  params: { division: string };
}) {
  const division = params.division;

  return {
    title: `BulkBets | ${capitaliseWords(division)}`,
    description:
      "BulkBets - The only place online to bet on bodybuilding shows. Available on desktop, mobile and tablet.",
    // keywords: ...
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ division: string }>;
}) {
  const division = (await params).division;
  return <div>My Post: {division}</div>;
}
