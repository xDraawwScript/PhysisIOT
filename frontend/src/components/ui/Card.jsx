import React from "react";

export function Card({ className = "", ...props }) {
  return (
    <div
      data-slot="card"
      className={`bg-card text-card-foreground flex flex-col gap-6 rounded-xl border ${className}`}
      {...props}
    />
  );
}
export function CardHeader({ className = "", ...props }) {
  return (
    <div
      data-slot="card-header"
      className={`grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 ${className}`}
      {...props}
    />
  );
}
export function CardTitle({ className = "", ...props }) {
  return (
    <h4
      data-slot="card-title"
      className={`leading-none ${className}`}
      {...props}
    />
  );
}
export function CardDescription({ className = "", ...props }) {
  return (
    <p
      data-slot="card-description"
      className={`text-muted-foreground ${className}`}
      {...props}
    />
  );
}
export function CardAction({ className = "", ...props }) {
  return (
    <div
      data-slot="card-action"
      className={`col-start-2 row-span-2 row-start-1 self-start justify-self-end ${className}`}
      {...props}
    />
  );
}
export function CardContent({ className = "", ...props }) {
  return (
    <div
      data-slot="card-content"
      className={`px-6 pb-6 ${className}`}
      {...props}
    />
  );
}
export function CardFooter({ className = "", ...props }) {
  return (
    <div
      data-slot="card-footer"
      className={`flex items-center px-6 pb-6 border-t pt-6 ${className}`}
      {...props}
    />
  );
}
