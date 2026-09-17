"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { INQUIRY_TOPICS } from "../lib/contracts.mjs";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

type FormValues = {
  name: string;
  contact: string;
  topic: string;
  message: string;
  website: string;
};

type InquiryResponse = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

const emptyValues: FormValues = {
  name: "",
  contact: "",
  topic: "",
  message: "",
  website: "",
};

const fieldOrder = ["name", "contact", "topic", "message"] as const;

export function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [submissionId, setSubmissionId] = useState("");
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ kind: "idle" | "success" | "error"; message: string }>({
    kind: "idle",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSubmissionId(crypto.randomUUID());
  }, []);

  const updateValue = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const focusFirstInvalidField = (errors: Record<string, string>) => {
    const firstField = fieldOrder.find((field) => errors[field]);
    if (!firstField) return;
    requestAnimationFrame(() => {
      const element = formRef.current?.elements.namedItem(firstField);
      if (element instanceof HTMLElement) element.focus();
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const draftId = submissionId || crypto.randomUUID();
    if (!submissionId) setSubmissionId(draftId);
    setSubmitting(true);
    setFieldErrors({});
    setStatus({ kind: "idle", message: "正在安全保存留言…" });

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, submissionId: draftId }),
      });
      const result = await response.json() as InquiryResponse;

      if (response.status === 201 && result.ok) {
        setValues(emptyValues);
        setSubmissionId(crypto.randomUUID());
        setStatus({ kind: "success", message: result.message || "留言已安全保存，我们会尽快查看。" });
        return;
      }

      const errors = result.fieldErrors ?? {};
      setFieldErrors(errors);
      setStatus({ kind: "error", message: result.message || "提交未完成，请稍后重试。" });
      focusFirstInvalidField(errors);
    } catch {
      setStatus({ kind: "error", message: "网络暂时不可用，内容已保留，请稍后重试。" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form ref={formRef} className="contact-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="contact-name">称呼</label>
        <input
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          minLength={2}
          maxLength={60}
          required
          value={values.name}
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? "contact-name-error" : undefined}
          onChange={(event) => updateValue("name", event.target.value)}
        />
        {fieldErrors.name && <span id="contact-name-error" className="field-error">{fieldErrors.name}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="contact-method">联系方式</label>
        <input
          id="contact-method"
          name="contact"
          type="text"
          autoComplete="email"
          minLength={3}
          maxLength={120}
          required
          value={values.contact}
          aria-invalid={Boolean(fieldErrors.contact)}
          aria-describedby={fieldErrors.contact ? "contact-method-error" : undefined}
          onChange={(event) => updateValue("contact", event.target.value)}
        />
        {fieldErrors.contact && <span id="contact-method-error" className="field-error">{fieldErrors.contact}</span>}
      </div>

      <div className="form-field form-field-wide">
        <label htmlFor="contact-topic">合作方向</label>
        <NativeSelect
          id="contact-topic"
          name="topic"
          required
          value={values.topic}
          aria-invalid={Boolean(fieldErrors.topic)}
          aria-describedby={fieldErrors.topic ? "contact-topic-error" : undefined}
          onChange={(event) => updateValue("topic", event.target.value)}
        >
          <NativeSelectOption value="">请选择合作方向</NativeSelectOption>
          {INQUIRY_TOPICS.map((topic: string) => <NativeSelectOption key={topic} value={topic}>{topic}</NativeSelectOption>)}
        </NativeSelect>
        {fieldErrors.topic && <span id="contact-topic-error" className="field-error">{fieldErrors.topic}</span>}
      </div>

      <div className="form-field form-field-wide">
        <label htmlFor="contact-message">留言</label>
        <textarea
          id="contact-message"
          name="message"
          rows={6}
          minLength={10}
          maxLength={2000}
          required
          value={values.message}
          aria-invalid={Boolean(fieldErrors.message)}
          aria-describedby={fieldErrors.message ? "contact-message-error" : undefined}
          onChange={(event) => updateValue("message", event.target.value)}
        />
        {fieldErrors.message && <span id="contact-message-error" className="field-error">{fieldErrors.message}</span>}
      </div>

      <div className="website-field" aria-hidden="true">
        <label htmlFor="contact-website">请勿填写此字段</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(event) => updateValue("website", event.target.value)}
        />
      </div>

      <div className="form-actions">
        <button className="primary-action" type="submit" disabled={submitting}>
          {submitting ? "正在保存" : "发送合作留言"}
        </button>
        <p
          id="contact-status"
          className={status.kind === "idle" ? undefined : `is-${status.kind}`}
          role="status"
          aria-live="polite"
        >
          {status.message}
        </p>
      </div>
    </form>
  );
}
