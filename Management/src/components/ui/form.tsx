import * as React from 'react';
import {
  Controller,
  FormProvider,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

import { Field, FieldError, FieldLabel } from '@/components/ui/field';

/**
 * Thin RHF-binding layer over the shadcn Field/FieldLabel/FieldError
 * primitives (Base UI's shadcn generation ships those undecorated - they
 * don't know about any form library on their own). `Form` is just
 * `FormProvider` under a name that reads better at call sites; `FormField`
 * wires one RHF-controlled field to the Field/FieldError markup so error
 * display and Field's `data-invalid` state come for free instead of being
 * hand-rolled per dialog.
 */
const Form = FormProvider;

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  return <Controller {...props} />;
}

interface FormFieldItemProps {
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: { message?: string };
  children: React.ReactNode;
  className?: string;
}

function FormFieldItem({ label, error, children, className }: FormFieldItemProps) {
  return (
    <Field data-invalid={!!error} className={className}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      {children}
      <FieldError errors={error ? [error] : undefined} />
    </Field>
  );
}

export { Form, FormField, FormFieldItem };
