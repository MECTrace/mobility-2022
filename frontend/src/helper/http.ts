import { showNotification } from '@mantine/notifications';
import { AxiosRequestConfig, AxiosResponse } from 'axios';

import { ErrorCode } from '@/config/httpConfig/apis';
import axiosInstance from '@/config/httpConfig/axiosInstance';
import { findNotiConfig } from './notificationHelper';

const HttpConfig: AxiosRequestConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
};

const apiGet = <T>(url: string) =>
  new Promise<AxiosResponse<T>>((resolve, reject) => {
    if (!navigator.onLine) {
      showNotification(findNotiConfig(ErrorCode.ERR_NETWORK));
      return reject(false);
    }

    return axiosInstance.get<T>(url, HttpConfig).then(resolve, reject);
  });