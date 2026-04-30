"use client";

import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import { useAdminUsers } from "@/features/users/hooks/use-admin-users";
import { formatDateTime } from "@/lib/utils/format";
import { ChevronLeft, ChevronRight, Search, ShieldOff } from "lucide-react";
import { useState } from "react";

export default function BannedUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 20;

  const { data, isLoading } = useAdminUsers({
    page,
    limit,
    isBanned: true,
    search: search.trim() || undefined,
  });

  const users = data?.users ?? [];
  const pagination = data?.pagination;

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Security"
        title="Banned users"
        description="View and manage restricted accounts."
      />

      <Surface className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full items-center gap-3 rounded-xl border border-white/8 bg-black/10 px-4 py-2.5 sm:w-auto">
            <Search className="h-4 w-4 text-[color:var(--muted-foreground)]" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search banned users..."
              className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-[color:var(--muted-foreground)]/60 sm:w-64"
            />
          </div>
          {pagination ? (
            <p className="text-sm text-[color:var(--muted-foreground)]">
              {pagination.total} banned {pagination.total === 1 ? "user" : "users"}
            </p>
          ) : null}
        </div>
      </Surface>

      <Surface className="overflow-hidden p-0">
        {isLoading ? (
          <div className="px-5 py-12 text-center text-sm text-[color:var(--muted-foreground)]">
            Loading banned users...
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12">
            <ShieldOff className="h-8 w-8 text-[color:var(--muted-foreground)]/60" />
            <p className="text-sm text-[color:var(--muted-foreground)]">
              {search ? "No banned users matched your search." : "No banned users."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 p-3 md:hidden">
              {users.map((row: any) => (
                <Link
                  key={row.id}
                  href={`/users/${row.id}`}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:border-white/12 hover:bg-white/[0.04]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-white">{row.fullName}</p>
                      <p className="mt-1 truncate text-xs text-[color:var(--muted-foreground)]">{row.email}</p>
                    </div>
                    <StatusBadge tone="rose">Banned</StatusBadge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge tone="slate">{row.role}</StatusBadge>
                  </div>
                  <div className="mt-3 text-xs text-[color:var(--muted-foreground)]">
                    <p className="uppercase tracking-[0.14em] text-[10px]">Joined</p>
                    <p className="mt-1 text-sm text-white">{formatDateTime(row.createdAt)}</p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[640px] w-full divide-y divide-white/8 text-sm">
                <thead className="bg-black/15 text-left text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                  <tr>
                    <th className="px-5 py-3">User</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8 bg-black/10">
                  {users.map((row: any) => (
                    <tr key={row.id} className="transition hover:bg-white/[0.03]">
                      <td className="px-5 py-3.5">
                        <Link href={`/users/${row.id}`} className="block">
                          <p className="font-medium text-white hover:underline">{row.fullName}</p>
                          <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">{row.email}</p>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge tone="slate">{row.role}</StatusBadge>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge tone="rose">Banned</StatusBadge>
                      </td>
                      <td className="px-5 py-3.5 text-[color:var(--muted-foreground)]">
                        {formatDateTime(row.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Surface>

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 px-3 py-2 text-sm text-[color:var(--muted-foreground)] transition hover:border-white/14 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 px-3 py-2 text-sm text-[color:var(--muted-foreground)] transition hover:border-white/14 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
