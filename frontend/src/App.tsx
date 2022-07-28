import { Suspense, useEffect, useId } from 'react';
import { useLazyEffect } from './hooks';
import { useTranslation } from 'react-i18next';
import { Routes, Route } from 'react-router-dom';
import {
  AppShell,
  ColorScheme,
  ColorSchemeProvider,
  Loader,
  LoadingOverlay,
  MantineProvider,
  Modal,
  Text,
} from '@mantine/core';
import { useColorScheme, useIdle, useLocalStorage } from '@mantine/hooks';
import { NotificationsProvider, showNotification } from '@mantine/notifications';

import useGlobalStore from './store';
import { afkTimeout, defaultLanguage } from './config/system';
import { mantineTheme } from './config/mantineProvider';
import routesConfig from './config/routesConfig';
import { milisecondsToMinutesRound } from './util/common';

import { InfoCircle, MoodSmile } from 'tabler-icons-react';

import AppHeader from './components/AppHeader';

import 'dayjs/locale/ko';
import './App.scss';

function App() {
  const { socket, setIsAFK } = useGlobalStore((state) => ({
    socket: state.socket,
    setIsAFK: state.setIsAFK,
  }));

  const uID = useId();
  const isAFK = useIdle(afkTimeout, { initialState: false });
  const { t } = useTranslation();

  const defaultColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useLocalStorage<ColorScheme>({
    key: 'mantine-color-scheme',
    defaultValue: defaultColorScheme,
    getInitialValueInEffect: true,
  });
}

export default App;
