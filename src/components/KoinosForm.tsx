import { useMemo, useState } from "react";
import { Enum } from "protobufjs";
import { Contract, Serializer } from "koilib";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import styles from "../app/page.module.css";

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

export function prettyName(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildInitialInputValues(
  serializer: Serializer,
  type: string,
  nested: boolean,
  repeated: boolean,
): unknown {
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
    const fieldNested = !nativeTypes.includes(fieldType);
    const fieldRepeated = rule === "repeated";
    value[name] = buildInitialInputValues(
      serializer,
      fieldType,
      fieldNested,
      fieldRepeated,
    );
  });
  return value;
}

export const KoinosForm = (props: KoinosFormProps) => {
  const [value, setValue] = useState<Record<string, unknown>>({});
  const [counter, setCounter] = useState(0);

  const serializer = useMemo(() => {
    if (!props.contract?.serializer && !props.serializer) {
      throw new Error("No serializer provided");
    }
    return props.contract?.serializer || props.serializer;
  }, [props.contract?.serializer, props.serializer]);

  const fields = useMemo(() => {
    if (!serializer || !props.contract && (!props.protobufType || !props.serializer)) {
      return {};
    }

    try {
      const protobufType = props.contract && props.protobufType
        ? serializer.root.lookupType(
            props.contract.abi!.methods[props.protobufType].argument || "",
          )
        : props.protobufType
        ? serializer.root.lookupType(props.protobufType)
        : null;

      return protobufType?.fields || {};
    } catch (error) {
      console.error("Error looking up protobuf type:", error);
      return {};
    }
  }, [props.contract, props.protobufType, serializer]);

  const args = useMemo(() => {
    if (!serializer || !props.contract && (!props.protobufType || !props.serializer)) {
      return [];
    }

    return Object.keys(fields).map((name) => {
      const field = fields[name] as Field;
      const { type, rule, options } = field;
      const nested = !nativeTypes.includes(type);
      const repeated = rule === "repeated" && !props.norepeated;
      const format =
        options && (options["(koinos.btype)"] || options["(btype)"])
          ? options["(koinos.btype)"] || options["(btype)"]
          : type.toUpperCase();

      let protobufType: INamespace2 | undefined;
      let isEnum = false;
      let enums:
        | {
            name: string;
            value: number;
          }[]
        | undefined;
      if (nested) {
        protobufType = serializer.root.lookupTypeOrEnum(type) as INamespace2;
        if (!protobufType.fields) {
          isEnum = true;
          enums = Object.keys((protobufType as unknown as Enum).values).map(
            (v) => {
              return {
                name: v,
                value: (protobufType as unknown as Enum).values[v],
              };
            },
          );
        }
      }

      let val: unknown;
      if (value[name] === undefined) {
        val = buildInitialInputValues(serializer, type, nested, repeated);
      } else {
        val = value[name];
      }

      return {
        name,
        prettyName: prettyName(name),
        value: val,
        type,
        format,
        isEnum,
        enums,
        nested,
        repeated,
        protobufType,
        error: "",
      };
    });
  }, [counter, props, fields, serializer, value]);

  const handleInputChange = (name: string, newValue: unknown) => {
    const newValues = { ...value };
    newValues[name] = newValue;
    setValue(newValues);
    if (props.onChange) {
      props.onChange(newValues);
    }
  };

  const handleAddItem = (name: string) => {
    const newValues = { ...value };
    if (!Array.isArray(newValues[name])) {
      newValues[name] = [];
    }
    (newValues[name] as unknown[]).push("");
    setValue(newValues);
    setCounter(counter + 1);
    if (props.onChange) {
      props.onChange(newValues);
    }
  };

  const handleRemoveItem = (name: string, index: number) => {
    const newValues = { ...value };
    if (Array.isArray(newValues[name])) {
      (newValues[name] as unknown[]).splice(index, 1);
      setValue(newValues);
      setCounter(counter + 1);
      if (props.onChange) {
        props.onChange(newValues);
      }
    }
  };

  return (
    <div className="space-y-4">
      {args.map((arg) => (
        <div key={arg.name} className="space-y-2">
          <Label>{arg.prettyName}</Label>
          {arg.repeated ? (
            <div className="space-y-2">
              {Array.isArray(arg.value) &&
                arg.value.map((item: unknown, index: number) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={item as string}
                      onChange={(e) => {
                        const newValues = { ...value };
                        if (Array.isArray(newValues[arg.name])) {
                          (newValues[arg.name] as unknown[])[index] = e.target.value;
                          setValue(newValues);
                          if (props.onChange) {
                            props.onChange(newValues);
                          }
                        }
                      }}
                    />
                    <Button
                      variant="destructive"
                      onClick={() => handleRemoveItem(arg.name, index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              <Button
                variant="outline"
                onClick={() => handleAddItem(arg.name)}
              >
                Add Item
              </Button>
            </div>
          ) : arg.isEnum ? (
            <RadioGroup
              value={arg.value as string}
              onValueChange={(value) => handleInputChange(arg.name, value)}
              className="flex flex-col space-y-1"
            >
              {arg.enums?.map((enumItem) => (
                <div key={enumItem.name} className="flex items-center space-x-2">
                  <RadioGroupItem value={enumItem.value.toString()} id={`${arg.name}-${enumItem.name}`} />
                  <Label htmlFor={`${arg.name}-${enumItem.name}`}>{enumItem.name}</Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <Input
              value={arg.value as string}
              onChange={(e) => handleInputChange(arg.name, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
};
