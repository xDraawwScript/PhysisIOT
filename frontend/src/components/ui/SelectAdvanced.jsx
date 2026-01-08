import React, { useState } from "react";

export default function SelectAdvanced({ value, onChange, options, wrapperClassName = "" }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`relative mt-2 ${wrapperClassName} select-advanced-container`}>
      {/* Trigger */}
      <button
        className="w-full text-left p-3 bg-white rounded-md shadow-sm hover:shadow-md transition"
        onClick={() => setOpen(o => !o)}
      >
        {options.find(o => o.value === value)?.label || "Sélectionner..."}
      </button>

      {/* Flèche */}
      <svg
        className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-transform ${open ? "rotate-180" : ""}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>

      {/* Dropdown content */}
      {open && (
        <div className="absolute mt-1 w-full bg-white border rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
          {options.map(opt => (
            <div
              key={opt.value}
              className="p-3 hover:bg-gray-100 cursor-pointer transition"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
