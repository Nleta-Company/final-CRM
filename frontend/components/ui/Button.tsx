"use client";

import React, { forwardRef } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "danger"
  | "success"
  | "ghost"
  | "light";

export type ButtonSize = "xs" | "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  loadingText?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 focus:ring-4 focus:ring-brand-500/20 active:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600",
  secondary:
    "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-4 focus:ring-gray-200 active:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:ring-gray-700",
  outline:
    "bg-white text-gray-700 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 active:bg-gray-100 shadow-theme-xs dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/5",
  danger:
    "bg-error-500 text-white shadow-theme-xs hover:bg-error-600 focus:ring-4 focus:ring-error-500/20 active:bg-error-700 dark:bg-error-500 dark:hover:bg-error-600",
  success:
    "bg-success-500 text-white shadow-theme-xs hover:bg-success-600 focus:ring-4 focus:ring-success-500/20 active:bg-success-700 dark:bg-success-500 dark:hover:bg-success-600",
  ghost:
    "bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-gray-200 active:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-white",
  light:
    "bg-brand-50 text-brand-600 hover:bg-brand-100 focus:ring-4 focus:ring-brand-500/15 dark:bg-brand-500/15 dark:text-brand-400 dark:hover:bg-brand-500/25",
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: "px-2.5 py-1.5 text-xs rounded-md gap-1.5",
  sm: "px-3.5 py-2 text-sm rounded-lg gap-2",
  md: "px-4 py-2.5 text-sm rounded-lg gap-2",
  lg: "px-5 py-3 text-base rounded-xl gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      loadingText,
      disabled,
      className = "",
      type = "button",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center font-medium transition-all duration-200 select-none cursor-pointer outline-none ${
          variantStyles[variant]
        } ${sizeStyles[size]} ${
          fullWidth ? "w-full" : ""
        } ${
          isDisabled
            ? "opacity-60 cursor-not-allowed pointer-events-none shadow-none"
            : ""
        } ${className}`}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-0.5 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {!isLoading && leftIcon && (
          <span className="inline-flex shrink-0 items-center justify-center">
            {leftIcon}
          </span>
        )}

        <span>{isLoading && loadingText ? loadingText : children}</span>

        {!isLoading && rightIcon && (
          <span className="inline-flex shrink-0 items-center justify-center">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
