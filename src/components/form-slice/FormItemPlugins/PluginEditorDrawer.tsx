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
import { Drawer, Group, SegmentedControl, Stack, Title } from '@mantine/core';
import { isEmpty, isNil } from 'rambdax';
import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FormSubmitBtn } from '@/components/form/Btn';
import { FormItemEditor } from '@/components/form/Editor';

import type { PluginCardListProps } from './PluginCardList';
import { SchemaFormPrototype } from './SchemaFormPrototype';

export type PluginConfig = { name: string; config: object };
export type PluginEditorDrawerProps = Pick<PluginCardListProps, 'mode'> & {
  opened: boolean;
  onClose: () => void;
  onSave: (props: PluginConfig) => void;
  plugin: PluginConfig;
  schema?: object;
};

const toConfigStr = (p: object): string => {
  return !isEmpty(p) && !isNil(p) ? JSON.stringify(p, null, 2) : '{}';
};
export const PluginEditorDrawer = (props: PluginEditorDrawerProps) => {
  const { opened, onSave, onClose, plugin, mode, schema } = props;
  const { name, config } = plugin;
  const { t } = useTranslation();
  const [editorMode, setEditorMode] = useState<'schema' | 'json'>('schema');
  const [schemaValue, setSchemaValue] = useState<object>(
    !isEmpty(config) && !isNil(config) ? config : {}
  );
  const hasSchemaProperties = useMemo(() => {
    if (!schema || typeof schema !== 'object') return false;
    const properties = (schema as { properties?: unknown }).properties;
    return Boolean(
      properties &&
        typeof properties === 'object' &&
        !Array.isArray(properties) &&
        Object.keys(properties).length
    );
  }, [schema]);

  const methods = useForm<{ config: string }>({
    criteriaMode: 'all',
    disabled: mode === 'view',
    defaultValues: { config: toConfigStr(config) },
  });
  const handleClose = () => {
    onClose();
    methods.reset();
  };

  useEffect(() => {
    methods.setValue('config', toConfigStr(config));
    setSchemaValue(!isEmpty(config) && !isNil(config) ? config : {});
  }, [config, methods]);

  useEffect(() => {
    if (!opened) return;
    if (!hasSchemaProperties) {
      setEditorMode('json');
      return;
    }
    setEditorMode('schema');
  }, [hasSchemaProperties, opened]);

  return (
    <Drawer
      offset={0}
      radius="md"
      position="right"
      size="md"
      closeOnEscape={false}
      opened={opened}
      onClose={handleClose}
      styles={{ body: { paddingTop: '18px' } }}
      {...(mode === 'add' && { title: t('form.plugins.addPlugin') })}
      {...(mode === 'edit' && { title: t('form.plugins.editPlugin') })}
      {...(mode === 'view' && { title: t('form.plugins.viewPlugin') })}
    >
      <Title order={3} mb={10}>
        {name}
      </Title>
      {hasSchemaProperties && (
        <SegmentedControl
          mb="sm"
          value={editorMode}
          onChange={(val) => setEditorMode(val as 'schema' | 'json')}
          data={[
            { label: 'Prototype Schema Form', value: 'schema' },
            { label: 'Raw JSON', value: 'json' },
          ]}
        />
      )}
      <FormProvider {...methods}>
        <form>
          <Stack>
            {editorMode === 'schema' && hasSchemaProperties ? (
              <SchemaFormPrototype
                schema={schema}
                value={
                  typeof schemaValue === 'object' && !Array.isArray(schemaValue)
                    ? (schemaValue as Record<string, unknown>)
                    : {}
                }
                onChange={(next) => {
                  setSchemaValue(next);
                  methods.setValue('config', JSON.stringify(next, null, 2), {
                    shouldDirty: true,
                  });
                }}
                disabled={mode === 'view'}
              />
            ) : (
              <FormItemEditor
                name="config"
                h={500}
                customSchema={schema}
                isLoading={!schema}
                required
              />
            )}
          </Stack>
        </form>

        {mode !== 'view' && (
          <Group justify="flex-end" mt={8}>
            <FormSubmitBtn
              size="xs"
              variant="light"
              onClick={methods.handleSubmit(({ config }) => {
                if (editorMode === 'schema' && hasSchemaProperties) {
                  onSave({
                    name,
                    config:
                      typeof schemaValue === 'object' && !Array.isArray(schemaValue)
                        ? (schemaValue as object)
                        : {},
                  });
                } else {
                  onSave({ name, config: JSON.parse(config) });
                }
                handleClose();
              })}
            >
              {mode === 'add' && t('form.btn.add')}
              {mode === 'edit' && t('form.btn.save')}
            </FormSubmitBtn>
          </Group>
        )}
      </FormProvider>
    </Drawer>
  );
};
