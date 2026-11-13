// @file apps/web/src/app/my-auction/[code]/page.tsx
//
// Server wrapper: awaits route params and delegates to a client component.
// `code` is passed as prop so the client tree no longer calls useParams().
// `instant = false` is required under cacheComponents so Next.js 16 knows
// this route is dynamic and blocks until params are resolved.
// Ref: PARALEL.md §9.2, §17.
import { MyAuctionClient } from './MyAuctionClient';

export const instant = false;

export default async function MyAuctionPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <MyAuctionClient code={code} />;
}