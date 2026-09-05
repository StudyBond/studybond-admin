"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { SearchField } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar, Pagination } from "@/components/ui/toolbar";
import { useAdminUsers } from "@/features/users/hooks/use-admin-users";
import type { AdminUserListResponse } from "@/lib/api/types";
import { formatDate } from "@/lib/utils/format";
import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import { ShieldOff } from "lucide-react";
import { useState } from "react";

/**
 * Banned accounts.
 *
 * This is /users pre-filtered to isBanned=true, so it stays deliberately
 * thin — the same DataTable, minus the filters that cannot apply.
 *
 * Fixes carried over from the old version:
 *
 * 1. It had a "Status" column in which every row read "Banned". A column
 *    with one constant value on a list defined by that value is noise; the
 *    page title already says it. Dropped.
 *
 * 2. Search had no debounce, so it fired a request per keystroke while
 *    /users debounced the identical box at 350ms.
 *
 * 3. Loading was the string "Loading banned users..." and a failed request
 *    rendered as "No banned users" — an outage looked like an empty queue.
 *    DataTable gives this skeleton rows and a real error state with retry.
 */

type AdminUserRow = AdminUserListResponse["users"][number];

const PAGE_SIZE = 20;

const roleLabel: Record<string, string> = {
  USER: "User",
  ADMIN: "Admin",
  SUPERADMIN: "Superadmin",
};

export default function BannedUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 350);

  const usersQuery = useAdminUsers({
    page,
    limit: PAGE_SIZE,
    isBanned: true,
    search: debouncedSearch || undefined,
  });

  const users = usersQuery.data?.users ?? [];
  const pagination = usersQuery.data?.pagination;

  const columns: Column<AdminUserRow>[] = [
    {
      key: "user",
      header: "User",
      primary: true,
      cell: (user) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-[var(--sb-text)]">
            {user.fullName}
          </p>
          <p className="mt-0.5 truncate text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
            {user.email}
          </p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (user) =>
        user.role === "USER" ? (
          <span className="text-[var(--sb-text-tertiary)]">User</span>
        ) : (
          <Badge tone="brand">{roleLabel[user.role] ?? user.role}</Badge>
        ),
    },
    {
      key: "plan",
      header: "Plan",
      /* Worth keeping here: a banned account still holding premium is
         the one an admin needs to deal with first. */
      cell: (user) =>
        user.isPremium ? (
          <Badge tone="premium">Premium</Badge>
        ) : (
          <span className="text-[var(--sb-text-tertiary)]">Free</span>
        ),
    },
    {
      key: "devices",
      header: "Devices",
      numeric: true,
      width: "6rem",
      cell: (user) => user.deviceCount,
    },
    {
      key: "joined",
      header: "Joined",
      showFrom: "lg",
      width: "10rem",
      cell: (user) => formatDate(user.createdAt),
    },
  ];

  return (
    <div className="sb-enter space-y-6 pb-2">
      <PageHeader
        title="Banned users"
        description="Accounts currently blocked from signing in. Open one to review the ban or lift it."
      />

      <FilterBar
        search={
          <SearchField
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search name or email"
            aria-label="Search banned users by name or email"
          />
        }
      />

      <DataTable
        caption="Banned user accounts"
        items={users}
        columns={columns}
        getKey={(user) => user.id}
        href={(user) => `/users/${user.id}`}
        isLoading={usersQuery.isLoading}
        error={usersQuery.isError ? usersQuery.error : undefined}
        onRetry={() => usersQuery.refetch()}
        emptyIcon={<ShieldOff className="h-4 w-4" />}
        emptyTitle={
          debouncedSearch ? "No banned user matches that search" : "No banned users"
        }
        emptyDescription={
          debouncedSearch
            ? "Try a shorter search term, or clear it to see every banned account."
            : "Nobody is currently blocked from signing in."
        }
        emptyAction={
          debouncedSearch ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
            >
              Clear search
            </Button>
          ) : null
        }
      />

      {pagination ? (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.limit}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
