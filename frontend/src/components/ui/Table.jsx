import React from "react";
import { cn } from "../../utils/riskUtils";

export function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader(props) {
  return <thead {...props} />;
}

export function TableBody(props) {
  return <tbody {...props} />;
}

export function TableRow(props) {
  return <tr className="border-b" {...props} />;
}

export function TableHead({ className, ...props }) {
  return (
    <th className={cn("h-10 px-2 text-left font-medium", className)} {...props} />
  );
}

export function TableCell({ className, ...props }) {
  return (
    <td className={cn("p-2 align-middle whitespace-nowrap", className)} {...props} />
  );
}
