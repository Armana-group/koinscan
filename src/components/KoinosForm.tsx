"use client";

import { useMemo, useState } from "react";
import type { Enum } from "protobufjs";
import type { Contract, Serializer } from "koilib";
import { Segmented } from "@/components/ks/Controls";
import { Note } from "@/components/ks/Page";

const nativeTypes = [
  "double",
  "float",
  "int32",
  "int64",
  "uint32",
  "uint64",
  "sint32",
  "sint64",
  "fixed32",
  "fixed64",
  "sfixed32",
  "sfixed64",
  "bool",
  "string",
  "bytes",
];

/** "balance_of" and "getAllowances" both read as titles: "Balance Of", "Get Allowances". */
export function prettyName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export interface Field {
  type: string;
  rule?: "repeated" | "required" | "optional";
  options?: {
    "(koinos.btype)": string;
    "(btype)": string;
  };
}

export interface INamespace2 {
  fields: {
    [key: string]: Field;
  };
}

export interface KoinosFormProps {
  contract?: Contract;
  protobufType?: string;
  serializer?: Serializer;
  norepeated?: boolean;
  onChange?: (value: unknown) => void;
}

interface EnumOption {
  name: string;
  value: number;
}

/** Everything the form needs to know about one argument, resolved once from the ABI. */
interface FieldSpec {
  name: string;
  label: string;
  type: string;
  format: string;
  nested: boolean;
  repeated: boolean;
  isEnum: boolean;
  enums?: EnumOption[];
  protobufType?: INamespace2;
}

function describeField(serializer: Serializer, name: string, field: Field, norepeated = false): FieldSpec {
  const nested = !nativeTypes.includes(field.type);
  const repeated = field.rule === "repeated" && !norepeated;
  const btype = field.options?.["(koinos.btype)"] || field.options?.["(btype)"];
  const format = btype || field.type.toUpperCase();

  let protobufType: INamespace2 | undefined;
  let isEnum = false;
  let enums: EnumOption[] | undefined;
  if (nested) {
    protobufType = serializer.root.lookupTypeOrEnum(field.type) as INamespace2;
    if (!protobufType.fields) {
      isEnum = true;
      const values = (protobufType as unknown as Enum).values;
      enums = Object.keys(values).map((key) => ({ name: key, value: values[key] }));
    }
  }

  return { name, label: prettyName(name), type: field.type, format, nested, repeated, isEnum, enums, protobufType };
}

function buildInitialInputValues(serializer: Serializer, type: string, nested: boolean, repeated: boolean): unknown {
  if (repeated) {
    return [];
  }

  if (!nested) {
    switch (type) {
      case "bool":
        return false;
      case "string":
        return "";
      case "bytes":
        return "";
      default:
        return "0";
    }
  }

  const protobufType = serializer.root.lookupTypeOrEnum(type) as INamespace2;
  if (!protobufType.fields) {
    return "0";
  }

  const value: Record<string, unknown> = {};
  Object.keys(protobufType.fields).forEach((name) => {
    const { type: fieldType, rule } = protobufType.fields[name];
    value[name] = buildInitialInputValues(serializer, fieldType, !nativeTypes.includes(fieldType), rule === "repeated");
  });
  return value;
}

/** An empty value for every field of a message type. */
function emptyMessage(serializer: Serializer, protobufType: INamespace2): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  Object.entries(protobufType.fields).forEach(([fieldName, field]) => {
    item[fieldName] = buildInitialInputValues(serializer, field.type, !nativeTypes.includes(field.type), field.rule === "repeated");
  });
  return item;
}

/** "ADDRESS" becomes "address", "CONTRACT_ID" becomes "contract id". */
function formatText(format: string): string {
  return format.toLowerCase().replace(/_/g, " ");
}

function placeholderFor(format: string, type: string): string {
  const f = format.toLowerCase();
  if (f.includes("address") || f === "contract_id") return "Address";
  if (f === "hex") return "0x…";
  if (f === "base64") return "Base64";
  if (f === "base58") return "Base58";
  if (type === "string") return "Text";
  if (type === "bytes") return "Bytes";
  return "0";
}

function FieldLabel({ id, label, format }: { id?: string; label: string; format?: string }) {
  return (
    <label htmlFor={id} className="ks-field-label">
      {label}
      {format && <span className="ks-fmt">{formatText(format)}</span>}
    </label>
  );
}

const BOOL_OPTIONS = [
  { value: "true", label: "True" },
  { value: "false", label: "False" },
] as const;

interface FormFieldProps {
  spec: FieldSpec;
  path: string;
  value: unknown;
  serializer: Serializer;
  onChange: (value: unknown) => void;
}

/** The fields of one message, laid out in order. */
function MessageFields({ protobufType, path, value, serializer, onChange }: { protobufType: INamespace2; path: string; value: unknown; serializer: Serializer; onChange: (value: Record<string, unknown>) => void }) {
  const record = (value ?? {}) as Record<string, unknown>;
  return (
    <>
      {Object.entries(protobufType.fields).map(([fieldName, field]) => (
        <FormField
          key={fieldName}
          spec={describeField(serializer, fieldName, field)}
          path={`${path}.${fieldName}`}
          value={record[fieldName]}
          serializer={serializer}
          onChange={(next) => onChange({ ...record, [fieldName]: next })}
        />
      ))}
    </>
  );
}

function FormField({ spec, path, value, serializer, onChange }: FormFieldProps) {
  const { label, type, format, nested, repeated, isEnum, enums, protobufType } = spec;
  const id = `kf-${path}`;

  // A list of messages: each item gets its own hairline group with a Remove button.
  if (repeated && nested && !isEnum && protobufType?.fields) {
    const items = Array.isArray(value) ? (value as unknown[]) : [];
    const update = (next: unknown[]) => onChange(next);
    return (
      <div className="ks-form-group">
        <div className="ks-form-title">
          <span>{label}</span>
          <button type="button" className="ks-btn ghost md" onClick={() => update([...items, emptyMessage(serializer, protobufType)])}>
            Add
          </button>
        </div>
        {items.length === 0 && <p className="ks-foot">No items yet.</p>}
        {items.map((item, index) => (
          <div key={index} className="ks-form-item">
            <div className="ks-form-title">
              <span>Item {index + 1}</span>
              <button type="button" className="ks-btn ghost md" onClick={() => update(items.filter((_, i) => i !== index))}>
                Remove
              </button>
            </div>
            <MessageFields
              protobufType={protobufType}
              path={`${path}.${index}`}
              value={item}
              serializer={serializer}
              onChange={(next) => update(items.map((current, i) => (i === index ? next : current)))}
            />
          </div>
        ))}
      </div>
    );
  }

  // One message: its fields indented under a small title.
  if (nested && !isEnum && protobufType?.fields) {
    return (
      <div className="ks-form-group">
        <div className="ks-form-title">
          <span>{label}</span>
        </div>
        <MessageFields protobufType={protobufType} path={path} value={value} serializer={serializer} onChange={onChange} />
      </div>
    );
  }

  if (isEnum && enums) {
    const current = String(value ?? enums[0]?.value ?? 0);
    if (enums.length <= 4) {
      return (
        <div>
          <FieldLabel label={label} />
          <Segmented options={enums.map((option) => ({ value: String(option.value), label: prettyName(option.name.toLowerCase()) }))} value={current} onChange={(next) => onChange(Number(next))} />
        </div>
      );
    }
    return (
      <div>
        <FieldLabel id={id} label={label} />
        <select id={id} className="ks-input" value={current} onChange={(event) => onChange(Number(event.target.value))}>
          {enums.map((option) => (
            <option key={option.name} value={String(option.value)}>
              {prettyName(option.name.toLowerCase())}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // A list of plain values: one input per row.
  if (repeated) {
    const items = Array.isArray(value) ? (value as unknown[]) : [];
    return (
      <div>
        <FieldLabel label={label} format={format} />
        {items.map((item, index) => (
          <div key={index} className="ks-form-row">
            <input
              className="ks-input"
              value={String(item ?? "")}
              placeholder={placeholderFor(format, type)}
              aria-label={`${label} ${index + 1}`}
              onChange={(event) => onChange(items.map((current, i) => (i === index ? event.target.value : current)))}
            />
            <button type="button" className="ks-btn ghost md" onClick={() => onChange(items.filter((_, i) => i !== index))}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="ks-btn ghost md" onClick={() => onChange([...items, ""])}>
          Add
        </button>
      </div>
    );
  }

  if (type === "bool") {
    return (
      <div>
        <FieldLabel label={label} format={format} />
        <Segmented options={BOOL_OPTIONS} value={value ? "true" : "false"} onChange={(next) => onChange(next === "true")} />
      </div>
    );
  }

  return (
    <div>
      <FieldLabel id={id} label={label} format={format} />
      <input
        id={id}
        className="ks-input"
        value={String(value ?? "")}
        placeholder={placeholderFor(format, type)}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export const KoinosForm = (props: KoinosFormProps) => {
  const [value, setValue] = useState<Record<string, unknown>>({});

  const serializer = useMemo(() => {
    return props.contract?.serializer || props.serializer || null;
  }, [props.contract?.serializer, props.serializer]);

  const fields = useMemo(() => {
    if (!serializer) {
      return {};
    }

    try {
      const protobufType =
        props.contract && props.protobufType
          ? serializer.root.lookupType(props.contract.abi!.methods[props.protobufType].argument || "")
          : props.protobufType
            ? serializer.root.lookupType(props.protobufType)
            : null;

      return protobufType?.fields || {};
    } catch (error) {
      console.error("Error looking up protobuf type:", error);
      return {};
    }
  }, [props.contract, props.protobufType, serializer]);

  const specs = useMemo(() => {
    if (!serializer) return [];
    return Object.keys(fields).map((name) => describeField(serializer, name, fields[name] as Field, props.norepeated));
  }, [fields, props.norepeated, serializer]);

  if (!serializer) {
    return <Note>This contract doesn&apos;t publish its argument types, so there is no form. You can still run it with no arguments.</Note>;
  }

  return (
    <div className="ks-form">
      {specs.map((spec) => (
        <FormField
          key={spec.name}
          spec={spec}
          path={spec.name}
          value={value[spec.name] === undefined ? buildInitialInputValues(serializer, spec.type, spec.nested, spec.repeated) : value[spec.name]}
          serializer={serializer}
          onChange={(next) => {
            const nextValues = { ...value, [spec.name]: next };
            setValue(nextValues);
            props.onChange?.(nextValues);
          }}
        />
      ))}
    </div>
  );
};
