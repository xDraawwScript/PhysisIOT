import React from "react";

export default function Input({ style, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        border: "1px solid #ccc",
        borderRadius: 6,
        fontSize: 14,
        boxSizing: "border-box",
        ...style,
      }}
    />
  );
}
