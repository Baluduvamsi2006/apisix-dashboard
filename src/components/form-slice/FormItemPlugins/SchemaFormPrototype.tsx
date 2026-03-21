/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
  Alert,
  Fieldset,
  NumberInput,
  Select,
  Stack,
  Switch,
  TagsInput,
  Text,
  TextInput,
} from '@mantine/core';
import type { ReactElement } from 'react';

type JsonRecord = Record<string, unknown>;

type JsonSchema = {
  type?: string;
  title?: string;
  description?: string;
  enum?: Array<string | number | boolean>;
  default?: unknown;
  const?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  oneOf?: JsonSchema[];
  if?: JsonSchema;
  then?: JsonSchema;
  else?: JsonSchema;
  dependencies?: Record<string, string[] | JsonSchema>;
};

type SchemaFormPrototypeProps = {
  schema?: object;
  value: JsonRecord;
  onChange: (value: JsonRecord) => void;
  disabled?: boolean;
};

const isRecord = (value: unknown): value is JsonRecord => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const toRecord = (value: unknown): JsonRecord => {
  return isRecord(value) ? value : {};
};

const asSchema = (value: unknown): JsonSchema => {
  return isRecord(value) ? (value as JsonSchema) : {};
};

const toSchemaRecord = (value: unknown): Record<string, JsonSchema> => {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, asSchema(v)])
  );
};

const hasValue = (value: unknown) => {
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && value !== '';
};

const getValueByPath = (obj: JsonRecord, path: string[]) => {
  let cur: unknown = obj;
  for (const key of path) {
    if (!isRecord(cur)) return undefined;
    cur = cur[key];
  }
  return cur;
};

const setValueByPath = (obj: JsonRecord, path: string[], value: unknown) => {
  const next = structuredClone(obj);
  let cursor: JsonRecord = next;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    const child = cursor[key];
    cursor[key] = isRecord(child) ? child : {};
    cursor = cursor[key] as JsonRecord;
  }
  cursor[path[path.length - 1]] = value;
  return next;
};

const matchesIfCondition = (ifSchema: JsonSchema, data: JsonRecord) => {
  const props = toRecord(ifSchema.properties);
  const entries = Object.entries(props);
  if (entries.length === 0) return false;

  return entries.every(([key, cfg]) => {
    const rule = asSchema(cfg);
    if (rule.const === undefined) return true;
    return data[key] === rule.const;
  });
};

const mergeObjectSchema = (base: JsonSchema, addition: JsonSchema) => {
  const merged: JsonSchema = {
    ...base,
    properties: {
      ...toSchemaRecord(base.properties),
      ...toSchemaRecord(addition.properties),
    },
    required: Array.from(
      new Set([...(base.required ?? []), ...(addition.required ?? [])])
    ),
  };
  return merged;
};

const resolveObjectSchema = (schema: JsonSchema, value: JsonRecord) => {
  let resolved: JsonSchema = {
    ...schema,
    properties: { ...toSchemaRecord(schema.properties) },
    required: [...(schema.required ?? [])],
  };

  if (schema.if && schema.then && matchesIfCondition(schema.if, value)) {
    resolved = mergeObjectSchema(resolved, schema.then);
  } else if (schema.else) {
    resolved = mergeObjectSchema(resolved, schema.else);
  }

  const deps = toRecord(schema.dependencies);
  for (const [depKey, depVal] of Object.entries(deps)) {
    if (!hasValue(value[depKey])) continue;
    if (Array.isArray(depVal)) {
      resolved.required = Array.from(
        new Set([...(resolved.required ?? []), ...depVal])
      );
    }
  }

  return resolved;
};

const resolveRootSchema = (schema: JsonSchema, value: JsonRecord) => {
  if (schema.oneOf?.length) {
    const selected = schema.oneOf.find((item) => {
      const ifSchema = item.if;
      if (!ifSchema) return false;
      return matchesIfCondition(ifSchema, value);
    });
    if (selected) {
      return mergeObjectSchema(schema, selected);
    }
  }
  return schema;
};

export const SchemaFormPrototype = (props: SchemaFormPrototypeProps) => {
  const { schema, value, onChange, disabled } = props;
  const rootSchema = asSchema(schema);
  const rootResolved = resolveObjectSchema(resolveRootSchema(rootSchema, value), value);
  const rootProperties = toRecord(rootResolved.properties);

  const updateAtPath = (path: string[], nextValue: unknown) => {
    onChange(setValueByPath(value, path, nextValue));
  };

  const renderField = (
    fieldName: string,
    fieldSchema: JsonSchema,
    path: string[]
  ): ReactElement | null => {
    const currentValue = getValueByPath(value, path);
    const label = fieldSchema.title || fieldName;
    const required = (rootResolved.required ?? []).includes(path[path.length - 1]);
    const labelWithRequired = required ? `${label} *` : label;

    if (fieldSchema.enum?.length) {
      return (
        <Select
          key={path.join('.')}
          label={labelWithRequired}
          description={fieldSchema.description}
          value={currentValue == null ? null : String(currentValue)}
          disabled={disabled}
          data={fieldSchema.enum.map((item) => ({
            label: String(item),
            value: String(item),
          }))}
          onChange={(next) => {
            updateAtPath(path, next ?? undefined);
          }}
        />
      );
    }

    if (fieldSchema.type === 'string') {
      return (
        <TextInput
          key={path.join('.')}
          label={labelWithRequired}
          description={fieldSchema.description}
          value={typeof currentValue === 'string' ? currentValue : ''}
          disabled={disabled}
          onChange={(e) => updateAtPath(path, e.currentTarget.value)}
        />
      );
    }

    if (fieldSchema.type === 'number' || fieldSchema.type === 'integer') {
      return (
        <NumberInput
          key={path.join('.')}
          label={labelWithRequired}
          description={fieldSchema.description}
          value={typeof currentValue === 'number' ? currentValue : undefined}
          disabled={disabled}
          min={fieldSchema.minimum}
          max={fieldSchema.maximum}
          onChange={(next) => {
            const val = typeof next === 'string' ? undefined : next;
            updateAtPath(path, val);
          }}
        />
      );
    }

    if (fieldSchema.type === 'boolean') {
      return (
        <Switch
          key={path.join('.')}
          label={labelWithRequired}
          description={fieldSchema.description}
          checked={Boolean(currentValue)}
          disabled={disabled}
          onChange={(e) => updateAtPath(path, e.currentTarget.checked)}
        />
      );
    }

    if (fieldSchema.type === 'array' && asSchema(fieldSchema.items).type === 'string') {
      return (
        <TagsInput
          key={path.join('.')}
          label={labelWithRequired}
          description={fieldSchema.description}
          value={Array.isArray(currentValue) ? (currentValue as string[]) : []}
          disabled={disabled}
          onChange={(next) => updateAtPath(path, next)}
        />
      );
    }

    if (fieldSchema.type === 'object') {
      const nested = resolveObjectSchema(fieldSchema, toRecord(currentValue));
      const nestedProps = toRecord(nested.properties);
      return (
        <Fieldset key={path.join('.')} legend={labelWithRequired}>
          <Stack gap="sm">
            {Object.entries(nestedProps).map(([nestedName, nestedSchema]) =>
              renderField(nestedName, asSchema(nestedSchema), [...path, nestedName])
            )}
          </Stack>
        </Fieldset>
      );
    }

    return null;
  };

  if (!Object.keys(rootProperties).length) {
    return (
      <Alert color="yellow" variant="light">
        Prototype schema form is unavailable for this plugin schema. Use JSON mode.
      </Alert>
    );
  }

  return (
    <Stack gap="sm">
      <Alert color="blue" variant="light">
        Prototype mode: Schema-driven form rendering with JSON editor fallback.
      </Alert>
      {Object.entries(rootProperties).map(([fieldName, fieldSchema]) =>
        renderField(fieldName, asSchema(fieldSchema), [fieldName])
      )}
      <Text size="xs" c="dimmed">
        This prototype focuses on core schema patterns and keeps Monaco JSON as a safe fallback.
      </Text>
    </Stack>
  );
};
