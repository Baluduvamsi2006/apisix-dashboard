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
import '@ant-design/v5-patch-for-react-19';

import { useComputedColorScheme, useMantineTheme } from '@mantine/core';
import { ConfigProvider, theme } from 'antd';
import enUS from 'antd/locale/en_US';
import type { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

export const AntdConfigProvider = (props: PropsWithChildren) => {
  const { children } = props;
  const { t } = useTranslation();
  const colorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: false,
  });
  const isDark = colorScheme === 'dark';
  const mantineTheme = useMantineTheme();

  return (
    <ConfigProvider
      virtual
      locale={enUS}
      renderEmpty={() => <div>{t('noData')}</div>}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          borderRadiusSM: 2,
          ...(isDark
            ? {
              colorBgBase: mantineTheme.colors.dark[8],
              colorBgContainer: mantineTheme.colors.dark[7], // matches mantine body/paper exactly
              colorBgElevated: mantineTheme.colors.dark[6], // dropdowns float slightly above
              colorFillAlter: mantineTheme.colors.dark[6], // table header backgrounds
              colorBorderSecondary: mantineTheme.colors.dark[5], // inner table borders
              colorBorder: mantineTheme.colors.dark[4], // thicker borders
            }
            : {
              colorBgBase: mantineTheme.colors.gray[0],
              colorBgContainer: mantineTheme.white,
              colorBgElevated: mantineTheme.white,
              colorFillAlter: mantineTheme.colors.gray[0],
              colorBorderSecondary: mantineTheme.colors.gray[2],
              colorBorder: mantineTheme.colors.gray[3],
            }),
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
};
