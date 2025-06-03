import React from 'react';
import Link from 'next/link';

function Breadcrumb({ items }) {
  return (
    <nav className="text-sm mb-4 flex items-center gap-2">
      {items.map((item, idx) => (
        <span key={item.href || item.label} className="flex items-center">
          {idx > 0 && <span className="mx-1">&gt;</span>}
          {item.href ? (
            <Link href={item.href} className="text-blue-600 hover:underline">{item.label}</Link>
          ) : (
            <span className="font-bold">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export default Breadcrumb; 