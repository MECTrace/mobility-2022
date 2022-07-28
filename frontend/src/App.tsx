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

  const toggleColorScheme = (value?: ColorScheme) =>
    setColorScheme(value || (colorScheme === 'dark' ? 'light' : 'dark'));

  useLazyEffect(() => {
    setIsAFK(isAFK);
    if (!isAFK) {
      // This notification appears only when user comebacks after AFK on production or development without strict mode.
      showNotification({
        message: (
          <>
            {t('common.afk.comeback')} <Loader variant="dots" size="sm" />
          </>
        ),
        icon: <MoodSmile />,
      });
    }
  }, [isAFK]);

    /**
   * React 18 concurrent does not suppress any logs in the second call to lifecycle functions.
   * Since react mount and unmount, then mount the component again when in strict mode, it seems like a bug with the useEffect, but its work fine on production.
   * ref:
   *      https://reactjs.org/docs/strict-mode.html#detecting-unexpected-side-effects
   *      https://reactjs.org/docs/strict-mode.html#ensuring-reusable-state
   */
     useEffect(() => {
        socket.on('connect_error', () => {
          socket.disconnect();
        });
    
        return () => {
          socket.off('connect_error');
        };
      }, []);    

}

export default App;
