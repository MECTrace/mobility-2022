import { NotificationProps, showNotification, updateNotification } from '@mantine/notifications';
import { t } from 'i18next';

import { notificationConfig } from '@/config/notificationConfig';
import { ErrorCode } from '@/config/httpConfig/apis';
import { renderEventInfo } from '@/helper/listEventHelper';
import { IEventInfoVirus, IListEvent } from '@/interface/interfaceListEvent';
import { INotiConfig } from '@/interface/interfaceNotification';

import { Check } from 'tabler-icons-react';

export const findNotiConfig = (code?: ErrorCode): INotiConfig => {
  const notiConfig = notificationConfig.find((c) => c.code === code) || notificationConfig[0];
  return {
    ...notiConfig,
    title: notiConfig.title ? t(notiConfig.title) : undefined,
    message: t(notiConfig.message),
  };
};