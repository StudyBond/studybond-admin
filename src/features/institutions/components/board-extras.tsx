"use client";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  adminBoardExtrasApi,
  type AdminCommunityLinks,
  type AdminExamDate,
} from "@/lib/api/admin-board-extras";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Two things the student Home reads from each board: the next exam date
 * (the calendar card) and the WhatsApp links (the channel sheet and Me >
 * Community). Any admin can change them; they never need a code release.
 */

const panel = "rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4";
const title = "text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]";
const body = "mt-1 text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]";

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Could not save.";
}

/* ── Exam date ── */

export function ExamDateControl({ institutionId }: { institutionId: number }) {
  const query = useQuery({
    queryKey: ["admin", "board-exam-date", institutionId],
    queryFn: () => adminBoardExtrasApi.getExamDate(institutionId),
  });
  if (!query.data) {
    return (
      <section className={panel}>
        <h2 className={title}>Exam date</h2>
        <p className={body}>{query.isError ? "Couldn't load the exam date." : "Loading…"}</p>
      </section>
    );
  }
  return <ExamDateForm key={JSON.stringify(query.data)} institutionId={institutionId} saved={query.data} />;
}

function ExamDateForm({ institutionId, saved }: { institutionId: number; saved: AdminExamDate }) {
  const qc = useQueryClient();
  const [year, setYear] = useState(saved.examYear ? String(saved.examYear) : "");
  const [starts, setStarts] = useState(saved.examStartsOn ?? "");
  const [ends, setEnds] = useState(saved.examEndsOn ?? "");
  const [note, setNote] = useState(saved.examDateNote ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      adminBoardExtrasApi.setExamDate(institutionId, {
        examYear: year.trim() ? Number(year) : starts ? Number(starts.slice(0, 4)) : null,
        examStartsOn: starts || null,
        examEndsOn: starts && ends ? ends : null,
        examDateNote: note.trim() || null,
      }),
    onSuccess: async () => {
      toast.success("Exam date saved. Students see it on Home within a minute.");
      await qc.invalidateQueries({ queryKey: ["admin", "board-exam-date", institutionId] });
    },
    onError: (error) => toast.error(errorText(error)),
  });

  const yearNumber = year.trim() ? Number(year) : null;
  const yearError = yearNumber !== null && (!Number.isInteger(yearNumber) || yearNumber < 2025 || yearNumber > 2100) ? "A year like 2027." : undefined;
  const endError = ends && !starts ? "Set the first day too." : ends && starts && ends < starts ? "The last day can't be before the first." : undefined;
  const changed =
    year !== (saved.examYear ? String(saved.examYear) : "") ||
    starts !== (saved.examStartsOn ?? "") ||
    ends !== (saved.examEndsOn ?? "") ||
    note !== (saved.examDateNote ?? "");

  const summary = saved.examStartsOn
    ? `Students see a countdown to ${saved.examStartsOn}${saved.examEndsOn ? ` (to ${saved.examEndsOn})` : ""}.`
    : `Students see "${saved.examYear ?? "—"}, date not out"${saved.examDateNote ? " with your note" : ""}.`;

  return (
    <section className={panel}>
      <h2 className={title}>Exam date</h2>
      <p className={body}>{summary} Leave the first day empty until the date is official.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Field label="Exam year" hint="e.g. 2027" inputMode="numeric" value={year} error={yearError} disabled={mutation.isPending}
          onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} />
        <Field label="First day" type="date" value={starts} disabled={mutation.isPending} onChange={(e) => setStarts(e.target.value)} />
        <Field label="Last day" hint="Optional" type="date" value={ends} error={endError} disabled={mutation.isPending || !starts} onChange={(e) => setEnds(e.target.value)} />
      </div>
      <div className="mt-3">
        <Field
          label="Note while the date is not out"
          hint={`${note.length}/200`}
          value={note}
          maxLength={200}
          placeholder="e.g. JAMB hasn't fixed the dates yet. It usually runs from April into May."
          disabled={mutation.isPending}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Button type="button" size="sm" disabled={!changed || Boolean(yearError || endError) || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
        {changed ? (
          <Button type="button" size="sm" variant="secondary" disabled={mutation.isPending} onClick={() => {
            setYear(saved.examYear ? String(saved.examYear) : "");
            setStarts(saved.examStartsOn ?? "");
            setEnds(saved.examEndsOn ?? "");
            setNote(saved.examDateNote ?? "");
          }}>
            Cancel
          </Button>
        ) : null}
      </div>
    </section>
  );
}

/* ── WhatsApp links ── */

const CHANNEL_RE = /^https:\/\/(www\.)?whatsapp\.com\/channel\/[A-Za-z0-9]+\/?(\?\S*)?$/;
const GROUP_RE = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+\/?(\?\S*)?$/;

export function WhatsAppLinksControl({ institutionId }: { institutionId: number }) {
  const query = useQuery({
    queryKey: ["admin", "board-community-links", institutionId],
    queryFn: () => adminBoardExtrasApi.getCommunityLinks(institutionId),
  });
  if (!query.data) {
    return (
      <section className={panel}>
        <h2 className={title}>WhatsApp links</h2>
        <p className={body}>{query.isError ? "Couldn't load the links." : "Loading…"}</p>
      </section>
    );
  }
  return <WhatsAppLinksForm key={JSON.stringify(query.data)} institutionId={institutionId} saved={query.data} />;
}

function WhatsAppLinksForm({ institutionId, saved }: { institutionId: number; saved: AdminCommunityLinks }) {
  const qc = useQueryClient();
  const [channel, setChannel] = useState(saved.whatsappChannelUrl ?? "");
  const [group, setGroup] = useState(saved.whatsappGroupUrl ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      adminBoardExtrasApi.setCommunityLinks(institutionId, {
        whatsappChannelUrl: channel.trim() || null,
        whatsappGroupUrl: group.trim() || null,
      }),
    onSuccess: async () => {
      toast.success("WhatsApp links saved.");
      await qc.invalidateQueries({ queryKey: ["admin", "board-community-links", institutionId] });
    },
    onError: (error) => toast.error(errorText(error)),
  });

  const channelError = channel.trim() && !CHANNEL_RE.test(channel.trim()) ? "A channel link looks like https://whatsapp.com/channel/…" : undefined;
  const groupError = group.trim() && !GROUP_RE.test(group.trim()) ? "A group link looks like https://chat.whatsapp.com/…" : undefined;
  const changed = channel !== (saved.whatsappChannelUrl ?? "") || group !== (saved.whatsappGroupUrl ?? "");

  return (
    <section className={panel}>
      <h2 className={title}>WhatsApp links</h2>
      <p className={body}>
        Students on {saved.name} are asked once to join the channel, and find both links in Me &gt; Community.
        Only premium students on this board ever receive the group link. Leave a box empty to hide it.
      </p>
      <div className="mt-4 grid gap-3">
        <Field label="Channel (everyone on this board)" value={channel} error={channelError} placeholder="https://whatsapp.com/channel/…"
          disabled={mutation.isPending} onChange={(e) => setChannel(e.target.value)} />
        <Field label="Premium group (premium on this board only)" value={group} error={groupError} placeholder="https://chat.whatsapp.com/…"
          disabled={mutation.isPending} onChange={(e) => setGroup(e.target.value)} />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Button type="button" size="sm" disabled={!changed || Boolean(channelError || groupError) || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
        {changed ? (
          <Button type="button" size="sm" variant="secondary" disabled={mutation.isPending} onClick={() => {
            setChannel(saved.whatsappChannelUrl ?? "");
            setGroup(saved.whatsappGroupUrl ?? "");
          }}>
            Cancel
          </Button>
        ) : null}
      </div>
    </section>
  );
}
