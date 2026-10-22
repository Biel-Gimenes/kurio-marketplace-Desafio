import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import axios from "axios";
import type { ApiError } from "../contracts";
import { errorMessage } from "../api";
export function Field<T extends FieldValues>({
  form,
  name,
  label,
  type = "text",
  options,
  required = false,
  ...props
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "form" | "name" | "type">) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const error = form.formState.errors[name]?.message as string | undefined;
  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label}
        {required && <span className="required" aria-hidden="true" />}
      </label>
      <div className="input-wrap">
        {options ? (
          <select
            id={id}
            {...form.register(name)}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          >
            {options.map((o) => (
              <option value={o} key={o}>
                {o || "Selecione uma opção"}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={id}
            {...form.register(name)}
            type={type === "password" && visible ? "text" : type}
            {...props}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          />
        )}
        {type === "password" && (
          <button
            type="button"
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function applyServerErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown,
) {
  if (axios.isAxiosError<ApiError>(error) && error.response?.data.fields)
    for (const [name, message] of Object.entries(error.response.data.fields))
      form.setError(name as Path<T>, { message });
  form.setError("root", { message: errorMessage(error) });
}
export function FormError<T extends FieldValues>({
  form,
}: {
  form: UseFormReturn<T>;
}) {
  return form.formState.errors.root?.message ? (
    <p className="form-error" role="alert">
      {form.formState.errors.root.message}
    </p>
  ) : null;
}
