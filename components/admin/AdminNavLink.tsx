"use client";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Link from "next/link";
import { useState, type ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  pendingLabel?: string;
};

export function AdminNavLink({ href, children, pendingLabel = "Loading" }: Props) {
  const [pending, setPending] = useState(false);

  return (
    <Link
      href={href}
      className={`course-link${pending ? " loading-link-pending" : ""}`}
      onClick={() => setPending(true)}
    >
      {pending ? (
        <>
          <LoadingSpinner size="sm" label={pendingLabel} />
          {children}
        </>
      ) : (
        children
      )}
    </Link>
  );
}
