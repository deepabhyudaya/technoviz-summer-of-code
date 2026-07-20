"use client";

import { useState } from "react";
import { FieldError } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";

type InputFieldProps = {
  label: string;
  type?: string;
  register: any;
  name: string;
  defaultValue?: string;
  error?: FieldError;
  hidden?: boolean;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
};

const InputField = ({
  label,
  type = "text",
  register,
  name,
  defaultValue,
  error,
  hidden,
  inputProps,
}: InputFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  const { ref: rhfRef, ...rhfRest } = register(name);

  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className={hidden ? "hidden" : "flex flex-col gap-2 w-full md:min-w-[200px] md:flex-1"}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative w-full">
        <input
          {...rhfRest}
          ref={rhfRef}
          type={inputType}
          className={`px-3 py-2.5 rounded-[6px] text-sm w-full !bg-background text-foreground shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] dark:shadow-[rgba(255,255,255,0.1)_0px_0px_0px_1px] outline-none focus:ring-1 focus:ring-ring transition-all placeholder:text-muted-foreground appearance-none ${isPassword ? "pr-9" : ""}`}
          style={{ backgroundColor: "hsl(var(--background))" }}
          {...inputProps}
          defaultValue={defaultValue}
          onClick={(e) => {
            if (type === "date" || type === "datetime-local") {
              try {
                (e.target as HTMLInputElement).showPicker();
              } catch (err) {}
            }
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 p-0.5 rounded-sm text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error?.message && (
        <p className="text-xs text-red-500">{error.message.toString()}</p>
      )}
    </div>
  );
};

export default InputField;

