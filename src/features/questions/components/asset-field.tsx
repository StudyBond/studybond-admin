"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { questionsApi } from "@/lib/api/questions";
import type { QuestionAssetKind } from "@/lib/api/types";
import { ImagePlus, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

/**
 * One image slot: paste a link or upload a file, and see it before saving.
 *
 * Shared by the single-question form and the review queue, so an image can
 * be attached in either place with the same behaviour.
 */
/* ── Image attachment ───────────────────────────────── */

export function AssetField({
  label,
  kind,
  url,
  publicId,
  onChange,
  helper,
}: {
  label: string;
  kind: QuestionAssetKind;
  url: string;
  publicId: string;
  onChange: (url: string, publicId: string) => void;
  helper?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileUpload(file: File) {
    try {
      setIsUploading(true);
      const asset = await questionsApi.uploadAsset(kind, file);
      onChange(asset.url, asset.publicId);
      toast.success(`${label} uploaded`);
    } catch (error) {
      toast.error(`Could not upload the ${label.toLowerCase()}`, {
        description: (
          <ApiErrorMessage error={error} fallback="Please try again." />
        ),
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text-secondary)]">
          {label}
        </p>
        {url ? (
          <Badge tone="info">Attached</Badge>
        ) : (
          <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
            None
          </span>
        )}
      </div>

      {helper ? (
        <p className="mt-1 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
          {helper}
        </p>
      ) : null}

      <div className="mt-2.5 space-y-2.5">
        <Field
          size="sm"
          value={url}
          onChange={(event) => onChange(event.target.value, "")}
          placeholder="Paste an image URL, or upload below"
          aria-label={`${label} URL`}
        />

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFileUpload(file);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            isLoading={isUploading}
          >
            {!isUploading ? <UploadCloud className="h-3.5 w-3.5" /> : null}
            {isUploading ? "Uploading" : "Upload"}
          </Button>
          {url ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange("", "")}
            >
              <X className="h-3.5 w-3.5" />
              Remove
            </Button>
          ) : null}
        </div>

        {url ? (
          /* object-contain: this preview exists so you can check the image
             is the right one, which cropping actively prevents. */
          <div className="overflow-hidden rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={label}
              className="mx-auto max-h-48 w-auto max-w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex h-24 items-center justify-center gap-2 rounded-[var(--sb-radius-sm)] border border-dashed border-[var(--sb-border)] text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
            <ImagePlus className="h-4 w-4" />
            No image
          </div>
        )}

        {publicId ? (
          <p className="sb-mono truncate text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
            {publicId}
          </p>
        ) : null}
      </div>
    </div>
  );
}

