import React from "react";

export default function Switch({ checked, onChange }) {
  return (
    <label
      style={{
        position: "relative",
        display: "inline-block",
        width: 42,
        height: 22,
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ display: "none" }}
      />

      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 42,
          height: 22,
          background: checked ? "#000" : "#bbb",
          borderRadius: 22,
          transition: "0.3s",
        }}
      />

      <span
        style={{
          position: "absolute",
          height: 18,
          width: 18,
          left: checked ? 20 : 2,
          top: 2,
          backgroundColor: "white",
          borderRadius: "50%",
          transition: "0.3s",
        }}
      />
    </label>
  );
}
