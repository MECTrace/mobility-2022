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