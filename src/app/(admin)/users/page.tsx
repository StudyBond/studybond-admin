"use client";

import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import { useAdminUsers } from "@/features/users/hooks/use-admin-users";
import { formatDateTime } from "@/lib/utils/format";
import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useState } from "react";

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const limit = 20;
  const { data, isLoading } = useAdminUsers({
    page,
    limit,
    search: debouncedSearch || undefined,
  });

  const users = data?.users ?? [];
  const pagination = data?.pagination;

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Users"
        title="User accounts"
        description="Search, filter, and manage user accounts."
      />

      <Surface className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="group/search flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 transition-all duration-200 focus-within:border-[color:var(--accent-cyan)]/25 focus-within:shadow-[0_0_0_3px_rgba(110,196,184,0.06)] sm:w-auto">
            <Search className="h-4 w-4 text-[color:var(--muted-foreground)] transition-colors duration-200 group-focus-within/search:text-[color:var(--accent-cyan)]" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name or email..."
              className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-[color:var(--muted-foreground)]/40 transition-[width] duration-300 sm:w-64 sm:focus:w-80"
            />
          </div>
          {pagination ? (
            <p className="text-sm text-[color:var(--muted-foreground)]">
              {pagination.total} users total
            </p>
          ) : null}
        </div>
      </Surface>

      <Surface className="overflow-hidden p-0">
        {isLoading ? (
          <div className="space-y-2 px-5 py-6">
            {Array.from({ length: 5 }).map((_: any, i: number) => (
              <div key={i} className="skeleton h-12 rounded-lg" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-[color:var(--muted-foreground)]">
            {search ? "No users matched your search." : "No users found."}
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
                    <StatusBadge tone={row.role === "SUPERADMIN" ? "rose" : row.role === "ADMIN" ? "cyan" : "slate"}>
                      {row.role}
                    </StatusBadge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge tone={row.isBanned ? "rose" : "emerald"}>
                      {row.isBanned ? "Banned" : "Active"}
                    </StatusBadge>
                    <StatusBadge tone={row.isPremium ? "amber" : "slate"}>
                      {row.isPremium ? "Premium" : "Free"}
                    </StatusBadge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-[color:var(--muted-foreground)]">
                    <div>
                      <p className="uppercase tracking-[0.14em] text-[10px]">Devices</p>
                      <p className="mt-1 text-sm text-white">{row.deviceCount}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.14em] text-[10px]">Joined</p>
                      <p className="mt-1 text-sm text-white">{formatDateTime(row.createdAt)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[820px] w-full divide-y divide-white/[0.04] text-sm">
                <thead className="bg-white/[0.02] text-left text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                  <tr>
                    <th className="px-5 py-3 font-medium">User</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Plan</th>
                    <th className="px-5 py-3 font-medium">Devices</th>
                    <th className="px-5 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {users.map((row: any) => (
                    <tr key={row.id} className="group/row relative transition-colors duration-150 hover:bg-white/[0.03]">
                      <td className="relative px-5 py-3.5">
                        <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-[color:var(--accent-cyan)] opacity-0 transition-opacity duration-150 group-hover/row:opacity-100" />
                        <Link href={`/users/${row.id}`} className="block">
                          <p className="font-medium text-white transition-colors duration-150 group-hover/row:text-[color:var(--accent-cyan)]">{row.fullName}</p>
                          <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">{row.email}</p>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge tone={row.role === "SUPERADMIN" ? "rose" : row.role === "ADMIN" ? "cyan" : "slate"}>
                          {row.role}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge tone={row.isBanned ? "rose" : "emerald"}>
                          {row.isBanned ? "Banned" : "Active"}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge tone={row.isPremium ? "amber" : "slate"}>
                          {row.isPremium ? "Premium" : "Free"}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-3.5 text-[color:var(--muted-foreground)]">{row.deviceCount}</td>
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-3 py-2 text-sm text-[color:var(--muted-foreground)] transition-all duration-200 hover:border-white/10 hover:bg-white/[0.03] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-3 py-2 text-sm text-[color:var(--muted-foreground)] transition-all duration-200 hover:border-white/10 hover:bg-white/[0.03] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
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
