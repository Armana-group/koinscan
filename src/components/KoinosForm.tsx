import { useMemo, useState, useEffect, useCallback } from "react";
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
  rule?: string;
  options?: {
    "(koinos.btype)": string;
    "(btype)": string;
  };
}

export interface INamespace2 {
  fields: {
    [x: string]: Field;
  };
}

export interface KoinosFormProps {
  contract?: Contract;
  typeName?: string;
  protobufType?: INamespace2;
  serializer?: Serializer;
  norepeated?: boolean;
  drawLine?: boolean;
  onChange?: (newValue: unknown) => void;
}

function buildInitialInputValues(
  serializer: Serializer,
  type: string,
  nested: boolean,
  repeated: boolean,
): unknown {
  if (repeated) {
    if (nested) {
      try {
        const protobufType = serializer.root.lookupTypeOrEnum(type);
        if (!protobufType.fields) return "";
        const nestedArgs = Object.keys(protobufType.fields).map((f) => {
          const { type } = protobufType.fields[f];
          const nested = !nativeTypes.includes(type);
          return buildInitialInputValues(serializer, type, nested, false);
        });
        // build 1 element
        return [nestedArgs];
      } catch (error) {
        console.error('Error building initial values:', error);
        return [""];
      }
    }
    return [""];
  }

  if (nested) {
    try {
      const protobufType = serializer.root.lookupTypeOrEnum(type);
      if (!protobufType.fields) return "";
      const nestedArgs = Object.keys(protobufType.fields).map((f) => {
        const { type, rule } = protobufType.fields[f] as Field;
        const nested = !nativeTypes.includes(type);
        const repeated = rule === "repeated";
        return buildInitialInputValues(serializer, type, nested, repeated);
      });
      return nestedArgs;
    } catch (error) {
      console.error('Error building initial values:', error);
      return "";
    }
  }

  if (type === "bool") return false;

  return "";
}

export function prettyName(name: string): string {
  return name
    .split("_")
    .map((word) => {
      return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    })
    .join(" ");
}

// Replace RadioChangeEvent type with standard HTML event
type RadioChangeEvent = React.ChangeEvent<HTMLInputElement>;

export const KoinosForm = (props: KoinosFormProps) => {
  const [value, setValue] = useState<Record<string, unknown>>({});
  const serializer = useMemo(() => {
    if (props.contract) {
      if (!props.contract.serializer) {
        console.warn('Contract serializer is not initialized');
        return undefined;
      }
      return props.contract.serializer;
    }
    return props.serializer;
  }, [props.contract, props.serializer]);

  // Initialize value state only when typeName changes
  useEffect(() => {
    const initialValue = {};
    setValue(initialValue);
    // Only call onChange with the initial value once when typeName changes
    if (props.onChange) {
      props.onChange(initialValue);
    }
  }, [props.typeName]); // Remove props.onChange from dependencies

  const args = useMemo(() => {
    if (!props.contract && (!props.protobufType || !props.serializer)) {
      console.warn('Invalid properties for KoinosForm');
      return [];
    }

    if (!serializer) {
      console.warn('Serializer is not initialized');
      return [];
    }

    let fields: INamespace2["fields"] = {};
    try {
      if (props.contract && props.typeName) {
        const type = serializer.root.lookupType(props.typeName);
        if (type) {
          fields = (type as INamespace2).fields;
        }
      } else if (props.protobufType) {
        fields = props.protobufType.fields;
      }
    } catch (error) {
      console.error('Error looking up type:', error);
      return [];
    }

    return Object.keys(fields).map((name) => {
      const { type, rule, options } = fields[name];
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

      if (nested && serializer) {
        try {
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
        } catch (error) {
          console.error('Error looking up nested type:', error);
        }
      }

      let val: unknown;
      if (value[name] === undefined && serializer) {
        try {
          if (!serializer) {
            val = repeated ? [""] : "";
          } else {
            val = buildInitialInputValues(serializer, type, nested, repeated);
          }
        } catch (error) {
          console.error('Error building initial values:', error);
          val = repeated ? [""] : "";
        }
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
  }, [serializer, props.contract, props.typeName, props.protobufType, props.norepeated, value]);

  const updateValue = useCallback(({
    name,
    updateArray,
    index,
    event,
    val,
    push,
    pop,
  }: {
    name: string;
    index?: number;
    event?:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | RadioChangeEvent;
    val?: unknown;
    updateArray?: boolean;
    push?: boolean;
    pop?: boolean;
  }) => {
    let newValue: Record<string, unknown>;
    if (updateArray) {
      const copyValue = JSON.parse(JSON.stringify(value)) as {
        [x: string]: unknown[];
      };
      if (!copyValue[name]) copyValue[name] = [];
      if (index === undefined) {
        if (push) copyValue[name].push(val);
        else if (pop) copyValue[name].pop();
      } else {
        copyValue[name][index] = event ? event.target.value : val;
      }
      newValue = copyValue;
    } else {
      newValue = {
        ...value,
        [name]: event ? event.target.value : val,
      };
    }

    setValue(newValue);
    if (props.onChange) {
      props.onChange(newValue);
    }
  }, [value, props.onChange]);

  if (typeof props.protobufType === "string")
    throw Error("protobuftype must be an object");

  return (
    <div className={styles.koinosForm}>
      {props.drawLine ? <div className={styles.koinosFormLine}></div> : null}
      <div className={styles.koinosFormContent}>
        {args.map((arg) => {
          return (
            <div key={arg.name} className={styles.arg}>
              <div className={styles.argName}>
                {arg.prettyName}{" "}
                <span className={styles.argFormat}>({arg.format})</span>
              </div>
              {arg.repeated ? (
                <>
                  {(arg.value as unknown[]).map((value, i) => (
                    <div key={i} className={styles.item}>
                      <div className={styles.itemNumber}>#{i + 1}</div>
                      {arg.nested && !arg.isEnum ? (
                        <KoinosForm
                          protobufType={arg.protobufType!}
                          serializer={serializer}
                          norepeated={true}
                          drawLine={true}
                          onChange={(v) =>
                            updateValue({
                              name: arg.name,
                              updateArray: true,
                              index: i,
                              val: v,
                            })
                          }
                        ></KoinosForm>
                      ) : null}
                      {arg.nested && arg.isEnum ? (
                        <RadioGroup
                          defaultValue={arg.value as string}
                          onValueChange={(value) => updateValue({ name: arg.name, val: value })}
                        >
                          {arg.enums?.map((enumValue) => (
                            <div key={enumValue.name} className="flex items-center space-x-2">
                              <RadioGroupItem value={enumValue.name} id={`${arg.name}-${enumValue.name}`} />
                              <Label htmlFor={`${arg.name}-${enumValue.name}`}>{enumValue.name}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      ) : null}
                      {!arg.nested ? (
                        <Input
                          type="text"
                          onChange={(event) =>
                            updateValue({
                              name: arg.name,
                              updateArray: true,
                              index: i,
                              event,
                            })
                          }
                        ></Input>
                      ) : null}
                    </div>
                  ))}
                  <div className={styles.arrayButtons}>
                    <Button
                      className={styles.r1}
                      onClick={() => {
                        updateValue({
                          name: arg.name,
                          updateArray: true,
                          push: true,
                          val: (
                            buildInitialInputValues(
                              serializer,
                              arg.type,
                              arg.nested,
                              arg.repeated,
                            ) as unknown[]
                          )[0],
                        });
                      }}
                    >
                      Add
                    </Button>
                    <Button
                      onClick={() => {
                        updateValue({
                          name: arg.name,
                          updateArray: true,
                          pop: true,
                        });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </>
              ) : null}
              {!arg.repeated && arg.nested && !arg.isEnum ? (
                <KoinosForm
                  protobufType={arg.protobufType!}
                  serializer={serializer}
                  drawLine={true}
                  onChange={(v) => updateValue({ name: arg.name, val: v })}
                ></KoinosForm>
              ) : null}
              {!arg.repeated && arg.nested && arg.isEnum ? (
                <RadioGroup
                  defaultValue={arg.value as string}
                  onValueChange={(value) => updateValue({ name: arg.name, val: value })}
                >
                  {arg.enums?.map((enumValue) => (
                    <div key={enumValue.name} className="flex items-center space-x-2">
                      <RadioGroupItem value={enumValue.name} id={`${arg.name}-${enumValue.name}`} />
                      <Label htmlFor={`${arg.name}-${enumValue.name}`}>{enumValue.name}</Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : null}
              {!arg.repeated && !arg.nested && arg.type === "bool" ? (
                <RadioGroup
                  defaultValue={arg.value as string}
                  onValueChange={(value) => updateValue({ name: arg.name, val: value })}
                >
                  <RadioGroupItem value="false" id={`${arg.name}-false`} />
                  <RadioGroupItem value="true" id={`${arg.name}-true`} />
                </RadioGroup>
              ) : null}
              {!arg.repeated && !arg.nested && arg.type !== "bool" ? (
                <Input
                  type="text"
                  value={arg.value as string}
                  onChange={(e) => updateValue({ name: arg.name, event: e })}
                  className="w-full"
                ></Input>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
