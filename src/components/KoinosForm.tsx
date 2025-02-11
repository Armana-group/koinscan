import { useMemo, useState } from "react";
import { Enum } from "protobufjs";
import { Button, Input, Radio, RadioChangeEvent } from "antd";
import { Contract, Serializer } from "koilib";
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
      const protobufType = serializer.root.lookupTypeOrEnum(type);
      if (!protobufType.fields) return "";
      const nestedArgs = Object.keys(protobufType.fields).map((f) => {
        const { type } = protobufType.fields[f];
        const nested = !nativeTypes.includes(type);
        return buildInitialInputValues(serializer, type, nested, false);
      });
      // build 1 element
      return [nestedArgs];
    }
    return [""];
  }

  if (nested) {
    const protobufType = serializer.root.lookupTypeOrEnum(type);
    if (!protobufType.fields) return "";
    const nestedArgs = Object.keys(protobufType.fields).map((f) => {
      const { type, rule } = protobufType.fields[f] as Field;
      const nested = !nativeTypes.includes(type);
      const repeated = rule === "repeated";
      return buildInitialInputValues(serializer, type, nested, repeated);
    });
    return nestedArgs;
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

export const KoinosForm = (props: KoinosFormProps) => {
  const [value, setValue] = useState<Record<string, unknown>>({});
  // counter is used to trigger changes in args
  const [counter, setCounter] = useState<number>(0);
  const serializer = useMemo(() => {
    if (props.contract) return props.contract.serializer!;
    return props.serializer!;
  }, []);

  useMemo(() => {
    setValue({});
    // TODO: fix error in console because of the next line
    //
    // Warning: Cannot update a component (`Home`) while rendering
    // a different component (`KoinosForm`). To locate the bad
    // setState() call inside `KoinosForm`
    if (props.onChange) props.onChange({});
  }, [setValue, props.typeName]);

  const args = useMemo(() => {
    if (!props.contract && (!props.protobufType || !props.serializer)) {
      throw new Error("invalid properties for KoinosForm");
    }

    let fields: INamespace2["fields"];
    if (props.contract) {
      if (props.typeName) {
        fields = (serializer.root.lookupType(props.typeName) as INamespace2)
          .fields;
      } else {
        fields = {};
      }
    } else {
      fields = props.protobufType!.fields;
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
  }, [counter, props]);

  const updateValue = ({
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
    if (props.onChange) props.onChange(newValue);
  };

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
                        <Radio.Group
                          onChange={(event) =>
                            updateValue({
                              name: arg.name,
                              updateArray: true,
                              index: i,
                              event,
                            })
                          }
                        >
                          {arg.enums!.map((en) => (
                            <Radio key={en.value} value={en.value}>
                              {en.name}
                            </Radio>
                          ))}
                        </Radio.Group>
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
                        setCounter(counter + 1);
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
                        setCounter(counter + 1);
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
                <Radio.Group
                  onChange={(event) => updateValue({ name: arg.name, event })}
                >
                  {arg.enums!.map((en) => (
                    <Radio key={en.value} value={en.value}>
                      {en.name}
                    </Radio>
                  ))}
                </Radio.Group>
              ) : null}
              {!arg.repeated && !arg.nested && arg.type === "bool" ? (
                <Radio.Group
                  onChange={(event) => updateValue({ name: arg.name, event })}
                >
                  <Radio value={false}>false</Radio>
                  <Radio value={true}>true</Radio>
                </Radio.Group>
              ) : null}
              {!arg.repeated && !arg.nested && arg.type !== "bool" ? (
                <Input
                  type="text"
                  onChange={(event) => updateValue({ name: arg.name, event })}
                ></Input>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
