"use client";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminAuditLogEntry } from "@/lib/api/types";
import { formatDateTime } from "@/lib/utils/format";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * What an audit entry recorded beyond its table row.
 *
 * Question entries get a layout built for reading: an edit lists each changed
 * field with its old and new value, a create or delete shows the question as
 * it stood, and a bulk upload shows the file and the questions it made. Every
 * other action lists whatever the backend stored, so nothing recorded stays
 * hidden.
 *
 * Built like the bulk-upload duplicate dialog: labelled, focus moved in on
 * open and handed back on close, dismissible with Escape or the backdrop.
 */

type Metadata = Record<string, unknown>;

/** Display order for a stored question, following how the question form reads. */
const QUESTION_FIELDS = [
  "questionText",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "optionE",
  "correctAnswer",
  "explanationText",
  "additionalNotes",
  "subject",
  "branch",
  "topic",
  "subTopic",
  "year",
  "questionType",
  "questionPool",
  "isFeaturedFree",
  "difficultyLevel",
  "cognitiveLevel",
  "reviewStatus",
  "parentQuestionId",
  "institutionId",
  "isAiGenerated",
  "hasImage",
  "imageUrl",
  "optionAImageUrl",
  "optionBImageUrl",
  "optionCImageUrl",
  "optionDImageUrl",
  "optionEImageUrl",
  "explanationImageUrl",
];

const FIELD_LABELS: Record<string, string> = {
  questionText: "Question",
  optionA: "Option A",
  optionB: "Option B",
  optionC: "Option C",
  optionD: "Option D",
  optionE: "Option E",
  correctAnswer: "Correct answer",
  explanationText: "Explanation",
  additionalNotes: "Additional notes",
  subTopic: "Sub-topic",
  questionPool: "Question pool",
  isFeaturedFree: "In free exam pool",
  difficultyLevel: "Difficulty",
  parentQuestionId: "Parent question",
  institutionId: "Institution ID",
  isAiGenerated: "AI generated",
  imageUrl: "Question image",
  optionAImageUrl: "Option A image",
  optionBImageUrl: "Option B image",
  optionCImageUrl: "Option C image",
  optionDImageUrl: "Option D image",
  optionEImageUrl: "Option E image",
  explanationImageUrl: "Explanation image",
  institutionCode: "Institution",
  fileName: "File",
  fileHash: "File fingerprint",
  totalRows: "Rows in file",
  createdCount: "Questions created",
};

const TARGET_NAMES: Record<string, string> = {
  USER: "User",
  QUESTION: "Question",
  DEVICE: "Device",
  REPORT: "Report",
  SYSTEM: "System",
};

/** A bulk upload can create hundreds of questions; list enough to act on. */
const MAX_LISTED_IDS = 60;

function isRecord(value: unknown): value is Metadata {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEmpty(value: unknown) {
  return value === null || value === undefined || value === "";
}

function fieldLabel(key: string) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function describeTarget(log: AdminAuditLogEntry) {
  const action: string = log.action;
  if (action === "QUESTIONS_BULK_UPLOADED") return "Bulk question upload";
  const name = TARGET_NAMES[log.targetType] ?? log.targetType;
  return log.targetId ? `${name} #${log.targetId}` : name;
}

function FieldValue({ value }: { value: unknown }) {
  if (isEmpty(value)) {
    return <span className="text-[var(--sb-text-tertiary)]">Empty</span>;
  }

  if (typeof value === "boolean") {
    return <>{value ? "Yes" : "No"}</>;
  }

  if (typeof value === "string" || typeof value === "number") {
    return <span className="whitespace-pre-wrap break-words">{String(value)}</span>;
  }

  return (
    <pre className="sb-mono whitespace-pre-wrap break-words text-[length:var(--sb-text-xs)]">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function FieldList({ entries }: { entries: Array<[string, unknown]> }) {
  return (
    <dl className="divide-y divide-[var(--sb-border)] rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)]">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="grid gap-1 px-3 py-2.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3"
        >
          <dt className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
            {fieldLabel(key)}
          </dt>
          <dd className="min-w-0 text-[length:var(--sb-text-sm)] text-[var(--sb-text)]">
            <FieldValue value={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
      {children}
    </p>
  );
}

function EditedQuestion({ metadata }: { metadata: Metadata }) {
  const rawFields = metadata.changedFields;
  const changedFields = Array.isArray(rawFields)
    ? rawFields.filter((field): field is string => typeof field === "string")
    : [];
  const rawChanges = metadata.changes;
  const changes = isRecord(rawChanges) ? rawChanges : {};

  if (!changedFields.length) {
    return <Note>The question was saved without changing any field.</Note>;
  }

  return (
    <Section
      title={
        changedFields.length === 1
          ? "1 field changed"
          : `${changedFields.length} fields changed`
      }
    >
      <ul className="divide-y divide-[var(--sb-border)] rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)]">
        {changedFields.map((field) => {
          const rawChange = changes[field];
          const change = isRecord(rawChange) ? rawChange : {};

          return (
            <li key={field} className="px-3 py-2.5">
              <p className="text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text-secondary)]">
                {fieldLabel(field)}
              </p>
              <div className="mt-1.5 grid gap-2 sm:grid-cols-2 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-[length:var(--sb-text-2xs)] uppercase tracking-[0.06em] text-[var(--sb-text-tertiary)]">
                    Before
                  </p>
                  <div className="mt-0.5 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
                    <FieldValue value={change.from} />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[length:var(--sb-text-2xs)] uppercase tracking-[0.06em] text-[var(--sb-text-tertiary)]">
                    After
                  </p>
                  <div className="mt-0.5 text-[length:var(--sb-text-sm)] text-[var(--sb-text)]">
                    <FieldValue value={change.to} />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function QuestionCopy({ metadata }: { metadata: Metadata }) {
  const rawQuestion = metadata.question;
  const question = isRecord(rawQuestion) ? rawQuestion : {};
  const entries = QUESTION_FIELDS.filter((field) => !isEmpty(question[field])).map(
    (field): [string, unknown] => [field, question[field]],
  );

  if (!entries.length) {
    return <Note>No copy of the question was stored with this entry.</Note>;
  }

  return <FieldList entries={entries} />;
}

function BulkUpload({ metadata }: { metadata: Metadata }) {
  const rawIds = metadata.questionIds;
  const ids = Array.isArray(rawIds)
    ? rawIds.filter((id): id is number => typeof id === "number")
    : [];
  const listed = ids.slice(0, MAX_LISTED_IDS);

  return (
    <>
      <FieldList
        entries={[
          ["fileName", metadata.fileName],
          ["institutionCode", metadata.institutionCode],
          ["totalRows", metadata.totalRows],
          ["createdCount", metadata.createdCount],
        ]}
      />
      {ids.length ? (
        <Section title="Question IDs">
          <p className="sb-mono break-words text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
            {listed.join(", ")}
            {ids.length > listed.length
              ? ` and ${ids.length - listed.length} more`
              : ""}
          </p>
        </Section>
      ) : null}
    </>
  );
}

function OtherDetails({ metadata }: { metadata: Metadata }) {
  const entries = Object.entries(metadata).filter(([, value]) => !isEmpty(value));

  if (!entries.length) {
    return <Note>No extra details were recorded for this entry.</Note>;
  }

  return <FieldList entries={entries} />;
}

export function AuditLogDetailsDialog({
  log,
  label,
  tone,
  onClose,
}: {
  log: AdminAuditLogEntry;
  label: string;
  tone: BadgeTone;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  /* Remembers what had focus so it can be handed back on close. */
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    openerRef.current = document.activeElement;
    dialogRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [onClose]);

  /* The generated contract only lists actions that existed when it was last
     exported. The API sends newer ones too, so compare as plain strings. */
  const action: string = log.action;
  const metadata = isRecord(log.metadata) ? log.metadata : null;
  const canOpenQuestion =
    log.targetType === "QUESTION" &&
    Boolean(log.targetId) &&
    action !== "QUESTION_DELETED";

  let details: React.ReactNode;
  if (!metadata) {
    details = <Note>No extra details were recorded for this entry.</Note>;
  } else if (action === "QUESTION_EDITED") {
    details = <EditedQuestion metadata={metadata} />;
  } else if (action === "QUESTION_CREATED") {
    details = (
      <Section title="The question as it was created">
        <QuestionCopy metadata={metadata} />
      </Section>
    );
  } else if (action === "QUESTION_DELETED") {
    details = (
      <Section title="The question before it was deleted">
        <Note>
          This question no longer exists. Below is the copy saved at the moment
          it was deleted.
        </Note>
        <QuestionCopy metadata={metadata} />
      </Section>
    );
  } else if (action === "QUESTIONS_BULK_UPLOADED") {
    details = <BulkUpload metadata={metadata} />;
  } else {
    details = <OtherDetails metadata={metadata} />;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.7)] p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-details-title"
        tabIndex={-1}
        /* Clicks inside must not reach the dismissing backdrop. */
        onClick={(event) => event.stopPropagation()}
        className="sb-fade flex max-h-[min(90vh,48rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-2)] shadow-[var(--sb-shadow-xl)] outline-none"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--sb-border)] p-5">
          <div className="min-w-0 space-y-2">
            <Badge tone={tone} dot={tone === "danger"}>
              {label}
            </Badge>
            <h2
              id="audit-details-title"
              className="text-[length:var(--sb-text-lg)] font-semibold text-[var(--sb-text)]"
            >
              {describeTarget(log)}
            </h2>
            <p className="text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
              <span className="sb-nums">{formatDateTime(log.createdAt)}</span>
              {" by "}
              {log.actor.fullName} ({log.actorRole})
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close details"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-5 overflow-y-auto p-5">
          {log.reason ? (
            <Section title="Reason given">
              <Note>{log.reason}</Note>
            </Section>
          ) : null}

          {details}

          {log.ipAddress ? (
            <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
              IP address <span className="sb-mono">{log.ipAddress}</span>
            </p>
          ) : null}
        </div>

        {canOpenQuestion ? (
          <div className="flex justify-end border-t border-[var(--sb-border)] p-4">
            <Button
              asChild
              href={`/questions/${log.targetId}`}
              variant="secondary"
              size="sm"
            >
              Open question
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
