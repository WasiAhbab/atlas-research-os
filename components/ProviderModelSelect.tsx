"use client";

import { useId, useState } from "react";
import { getModelOptions } from "../lib/modelCatalog";

const CUSTOM = "__atlas_custom_model__";

export default function ProviderModelSelect({ presetId, defaultModel, value, onChange }: {
  presetId: string;
  defaultModel: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const options = getModelOptions(presetId, defaultModel);
  const [custom, setCustom] = useState(
    options.length === 0 || Boolean(value && !options.some(option => option.id === value)),
  );

  return <div className="model-picker">
    <label htmlFor={`${id}-model`}>Model</label>
    <select id={`${id}-model`} aria-describedby={`${id}-help`}
      value={custom ? CUSTOM : value}
      onChange={event => {
        const next = event.target.value;
        setCustom(next === CUSTOM);
        onChange(next === CUSTOM ? "" : next);
      }}>
      <option value="" disabled>Choose a model</option>
      {options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
      <option value={CUSTOM}>Custom model…</option>
    </select>
    {custom ? <label className="custom-model-label" htmlFor={`${id}-custom`}>Custom model ID
      <input id={`${id}-custom`} value={value} onChange={event => onChange(event.target.value)}
        placeholder="Enter the provider’s exact model ID" maxLength={200} required
        autoComplete="off" spellCheck={false} aria-describedby={`${id}-help`}/>
    </label> : value && <small className="model-picker-id">{value}</small>}
    <small id={`${id}-help`} className="model-picker-help">
      {custom ? "Use a text model supported by this endpoint." : "Choose a model your API account can access."}
      {" "}Save, then Test to check the connection.
    </small>
  </div>;
}
