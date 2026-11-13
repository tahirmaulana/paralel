// @file apps/web/src/app/print/receipt/[type]/[auctionId]/PrintButton.tsx
'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700"
    >
      Print
    </button>
  );
}