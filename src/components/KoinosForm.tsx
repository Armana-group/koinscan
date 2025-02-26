import { useMemo, useState } from "react";
import { Enum } from "protobufjs";
import { Contract, Serializer } from "koilib";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import styles from "../app/page.module.css";
import { PlusCircle, Trash2 } from "lucide-react";

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

// Export the function so it can be used by other components
export function prettyName(name: string): string {
  return name
    .split("_")
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

interface RecursiveFormFieldProps {
  name: string;
  prettyName: string;
  value: unknown;
  type: string;
  format: string;
  isEnum: boolean;
  enums?: { name: string; value: number }[];
  nested: boolean;
  repeated: boolean;
  protobufType?: INamespace2;
  error: string;
  serializer: Serializer;
  onChange: (value: unknown) => void;
  level?: number;
}

const RecursiveFormField = ({
  name,
  prettyName: fieldPrettyName,
  value,
  type,
  format,
  isEnum,
  enums,
  nested,
  repeated,
  protobufType,
  error,
  serializer,
  onChange,
  level = 0,
}: RecursiveFormFieldProps) => {
  // Handle array of objects (repeated nested type)
  if (repeated && nested && !isEnum && protobufType?.fields) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>{fieldPrettyName}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => {
              const newArray = [...(Array.isArray(value) ? value : [])];
              // Create a new empty object with the structure of the protobuf type
              const newItem: Record<string, unknown> = {};
              Object.entries(protobufType.fields).forEach(([fieldName, field]) => {
                const fieldType = field.type;
                const fieldNested = !nativeTypes.includes(fieldType);
                const fieldRepeated = field.rule === "repeated";
                newItem[fieldName] = buildInitialInputValues(
                  serializer,
                  fieldType,
                  fieldNested,
                  fieldRepeated
                );
              });
              newArray.push(newItem);
              onChange(newArray);
            }}
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Item</span>
          </Button>
        </div>
        
        {Array.isArray(value) && value.length > 0 ? (
          <div className="space-y-4">
            {value.map((item, index) => (
              <Card key={index} className="relative p-4 border-dashed">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 text-destructive hover:text-destructive/80"
                  onClick={() => {
                    const newArray = [...(value as unknown[])];
                    newArray.splice(index, 1);
                    onChange(newArray);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                
                <div className="pt-4 space-y-4">
                  {Object.entries(protobufType.fields).map(([fieldName, field]) => {
                    const fieldType = field.type;
                    const fieldNested = !nativeTypes.includes(fieldType);
                    const fieldRepeated = field.rule === "repeated";
                    const fieldFormat =
                      field.options && (field.options["(koinos.btype)"] || field.options["(btype)"])
                        ? field.options["(koinos.btype)"] || field.options["(btype)"]
                        : fieldType.toUpperCase();

                    let fieldProtobufType: INamespace2 | undefined;
                    let fieldIsEnum = false;
                    let fieldEnums: { name: string; value: number }[] | undefined;

                    if (fieldNested) {
                      fieldProtobufType = serializer.root.lookupTypeOrEnum(fieldType) as INamespace2;
                      if (!fieldProtobufType.fields) {
                        fieldIsEnum = true;
                        fieldEnums = Object.keys((fieldProtobufType as unknown as Enum).values).map((v) => ({
                          name: v,
                          value: (fieldProtobufType as unknown as Enum).values[v],
                        }));
                      }
                    }

                    const itemValue = (item as Record<string, unknown>)?.[fieldName];

                    return (
                      <RecursiveFormField
                        key={`${index}-${fieldName}`}
                        name={fieldName}
                        prettyName={prettyName(fieldName)}
                        value={itemValue}
                        type={fieldType}
                        format={fieldFormat}
                        isEnum={fieldIsEnum}
                        enums={fieldEnums}
                        nested={fieldNested}
                        repeated={fieldRepeated}
                        protobufType={fieldProtobufType}
                        error=""
                        serializer={serializer}
                        onChange={(newValue) => {
                          const newArray = [...(value as unknown[])];
                          const newItem = { ...(newArray[index] as Record<string, unknown>) };
                          newItem[fieldName] = newValue;
                          newArray[index] = newItem;
                          onChange(newArray);
                        }}
                        level={level + 1}
                      />
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center p-4 border border-dashed rounded-md text-muted-foreground">
            No items added. Click &quot;Add Item&quot; to add a new entry.
          </div>
        )}
      </div>
    );
  }

  if (nested && !isEnum && protobufType?.fields) {
    // Handle nested object
    return (
      <Card className={cn("p-4", level > 0 && "border-dashed")}>
        <div className="font-medium mb-2">{fieldPrettyName}</div>
        <div className="space-y-4">
          {Object.entries(protobufType.fields).map(([fieldName, field]) => {
            const fieldType = field.type;
            const fieldNested = !nativeTypes.includes(fieldType);
            const fieldRepeated = field.rule === "repeated";
            const fieldFormat =
              field.options && (field.options["(koinos.btype)"] || field.options["(btype)"])
                ? field.options["(koinos.btype)"] || field.options["(btype)"]
                : fieldType.toUpperCase();

            let fieldProtobufType: INamespace2 | undefined;
            let fieldIsEnum = false;
            let fieldEnums: { name: string; value: number }[] | undefined;

            if (fieldNested) {
              fieldProtobufType = serializer.root.lookupTypeOrEnum(fieldType) as INamespace2;
              if (!fieldProtobufType.fields) {
                fieldIsEnum = true;
                fieldEnums = Object.keys((fieldProtobufType as unknown as Enum).values).map((v) => ({
                  name: v,
                  value: (fieldProtobufType as unknown as Enum).values[v],
                }));
              }
            }

            const nestedValue = (value as Record<string, unknown>)?.[fieldName];

            return (
              <RecursiveFormField
                key={fieldName}
                name={fieldName}
                prettyName={prettyName(fieldName)}
                value={nestedValue}
                type={fieldType}
                format={fieldFormat}
                isEnum={fieldIsEnum}
                enums={fieldEnums}
                nested={fieldNested}
                repeated={fieldRepeated}
                protobufType={fieldProtobufType}
                error=""
                serializer={serializer}
                onChange={(newValue) => {
                  const newObj = { ...(value as Record<string, unknown>) };
                  newObj[fieldName] = newValue;
                  onChange(newObj);
                }}
                level={level + 1}
              />
            );
          })}
        </div>
      </Card>
    );
  }

  if (isEnum && enums) {
    return (
      <div className="space-y-2">
        <Label>{fieldPrettyName}</Label>
        <RadioGroup
          value={value as string}
          onValueChange={(newValue) => onChange(newValue)}
          className="flex flex-col space-y-1"
        >
          {enums.map((enumValue) => (
            <div key={enumValue.name} className="flex items-center space-x-2">
              <RadioGroupItem value={enumValue.name} id={`${name}-${enumValue.name}`} />
              <Label htmlFor={`${name}-${enumValue.name}`}>{enumValue.name}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    );
  }

  if (repeated) {
    return (
      <div className="space-y-2">
        <Label>{fieldPrettyName}</Label>
        <div className="space-y-2">
          {Array.isArray(value) &&
            value.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={item as string}
                  onChange={(e) => {
                    const newArray = [...(value as unknown[])];
                    newArray[index] = e.target.value;
                    onChange(newArray);
                  }}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const newArray = [...(value as unknown[])];
                    newArray.splice(index, 1);
                    onChange(newArray);
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newArray = [...(value as unknown[]), ""];
              onChange(newArray);
            }}
          >
            Add Item
          </Button>
        </div>
      </div>
    );
  }

  // Handle boolean type
  if (type === "bool") {
    return (
      <div className="space-y-2">
        <Label>
          {fieldPrettyName}
          <span className="ml-2 text-xs text-muted-foreground">({format})</span>
        </Label>
        <RadioGroup
          value={String(value)}
          onValueChange={(newValue) => onChange(newValue === "true")}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="true" id={`${name}-true`} />
            <Label htmlFor={`${name}-true`}>True</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="false" id={`${name}-false`} />
            <Label htmlFor={`${name}-false`}>False</Label>
          </div>
        </RadioGroup>
      </div>
    );
  }

  // Handle basic types with format consideration
  return (
    <div className="space-y-2">
      <Label>
        {fieldPrettyName}
        <span className="ml-2 text-xs text-muted-foreground">({format})</span>
      </Label>
      <Input
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${format.toLowerCase()}`}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};

export const KoinosForm = (props: KoinosFormProps) => {
  const [value, setValue] = useState<Record<string, unknown>>({});

  const serializer = useMemo(() => {
    if (!props.contract?.serializer && !props.serializer) {
      throw new Error("No serializer provided");
    }
    return props.contract?.serializer || props.serializer;
  }, [props.contract?.serializer, props.serializer]);

  const fields = useMemo(() => {
    if (!serializer) {
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
    if (!serializer) {
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
            (v) => ({
              name: v,
              value: (protobufType as unknown as Enum).values[v],
            }),
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
  }, [fields, props, serializer, value]);

  if (!serializer) {
    return null;
  }

  return (
    <div className="space-y-6">
      {args.map((arg) => (
        <RecursiveFormField
          key={arg.name}
          {...arg}
          serializer={serializer}
          onChange={(newValue) => {
            const newValues = { ...value };
            newValues[arg.name] = newValue;
            setValue(newValues);
            if (props.onChange) {
              props.onChange(newValues);
            }
          }}
        />
      ))}
    </div>
  );
};
