"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FieldShell, SearchField } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar, Pagination } from "@/components/ui/toolbar";
import { useAdminUsers } from "@/features/users/hooks/use-admin-users";
import type { AdminUserListResponse } from "@/lib/api/types";
import { formatDate } from "@/lib/utils/format";
import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import { Users } from "lucide-react";
import { useState } from "react";

/**
 * User directory.
 *
 * Three things changed beyond styling:
 *
 * 1. The page said "Search, filter, and manage" but only offered search.
 *    The backend has always accepted `role`, `isBanned` and `isPremium`
 *    (see /api/admin/users in the generated contract), so finding banned
 *    premium accounts meant paging through everyone by hand. Those three
 *    filters are now on the page.
 *
 * 2. The table was `min-w-[820px]`, so every laptop under ~900px scrolled
 *    sideways, and a separate hand-written card list described the same six
 *    columns a second time. DataTable renders both from one column list.
 *
 * 3. Badges were coloured for variety: SUPERADMIN rose (= danger), ADMIN
 *    cyan, Premium amber (= warning), and every healthy row carried a green
 *    "Active" pill. Colour now marks the exception only: an elevated role, a
 *    ban, a paid plan. An ordinary active free user is plain text, so the
 *    rows that need attention are the ones that stand out.
 */

type AdminUserRow = AdminUserListResponse["users"][number];

const PAGE_SIZE = 20;

const ROLE_OPTIONS = [
  { label: "Any role", value: "" },
  { label: "User", value: "USER" },
  { label: "Admin", value: "ADMIN" },
  { label: "Superadmin", value: "SUPERADMIN" },
];

const STATUS_OPTIONS = [
  { label: "Any status", value: "" },
  { label: "Active", value: "active" },
  { label: "Banned", value: "banned" },
];

const PLAN_OPTIONS = [
  { label: "Any plan", value: "" },
  { label: "Premium", value: "premium" },
  { label: "Free", value: "free" },
];

const roleLabel: Record<string, string> = {
  USER: "User",
  ADMIN: "Admin",
  SUPERADMIN: "Superadmin",
};

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");

  const debouncedSearch = useDebouncedValue(search.trim(), 350);

  /** Any filter change returns to page 1 — page 7 of a new result set is a dead end. */
  function applyFilter(set: (value: string) => void) {
    return (value: string) => {
      set(value);
      setPage(1);
    };
  }

  const usersQuery = useAdminUsers({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    role: role || undefined,
    isBanned: status ? status === "banned" : undefined,
    isPremium: plan ? plan === "premium" : undefined,
  });

  const users = usersQuery.data?.users ?? [];
  const pagination = usersQuery.data?.pagination;
  const hasActiveFilters = Boolean(debouncedSearch || role || status || plan);

  function clearFilters() {
    setSearch("");
    setRole("");
    setStatus("");
    setPlan("");
    setPage(1);
  }

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
      /* Only elevated roles are badged. A list where every row carries a
         badge teaches nothing; this way privileged accounts catch the eye. */
      cell: (user) =>
        user.role === "USER" ? (
          <span className="text-[var(--sb-text-tertiary)]">User</span>
        ) : (
          <Badge tone="brand">{roleLabel[user.role] ?? user.role}</Badge>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (user) =>
        user.isBanned ? (
          <Badge tone="danger" dot>
            Banned
          </Badge>
        ) : (
          <span className="text-[var(--sb-text-tertiary)]">Active</span>
        ),
    },
    {
      key: "plan",
      header: "Plan",
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
        title="Users"
        description="Every StudyBond account. Open one to see its activity, devices, and premium history."
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
            aria-label="Search users by name or email"
          />
        }
      >
        <FieldShell label="Role">
          <CustomSelect
            aria-label="Filter by role"
            value={role}
            onValueChange={applyFilter(setRole)}
            options={ROLE_OPTIONS}
            placeholder="Any role"
          />
        </FieldShell>

        <FieldShell label="Status">
          <CustomSelect
            aria-label="Filter by account status"
            value={status}
            onValueChange={applyFilter(setStatus)}
            options={STATUS_OPTIONS}
            placeholder="Any status"
          />
        </FieldShell>

        <FieldShell label="Plan">
          <CustomSelect
            aria-label="Filter by plan"
            value={plan}
            onValueChange={applyFilter(setPlan)}
            options={PLAN_OPTIONS}
            placeholder="Any plan"
          />
        </FieldShell>
      </FilterBar>

      <DataTable
        caption="User accounts"
        items={users}
        columns={columns}
        getKey={(user) => user.id}
        href={(user) => `/users/${user.id}`}
        isLoading={usersQuery.isLoading}
        error={usersQuery.isError ? usersQuery.error : undefined}
        onRetry={() => usersQuery.refetch()}
        emptyIcon={<Users className="h-4 w-4" />}
        emptyTitle={
          hasActiveFilters ? "No users match these filters" : "No users yet"
        }
        emptyDescription={
          hasActiveFilters
            ? "Try a shorter search term, or set role, status and plan back to Any."
            : "Accounts appear here as people sign up."
        }
        emptyAction={
          hasActiveFilters ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={clearFilters}
            >
              Clear filters
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
