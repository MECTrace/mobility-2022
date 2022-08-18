import { useEffect, useRef, useState } from 'react';
import useGlobalStore from '@/store';
import {
  ActionIcon,
  Button,
  Checkbox,
  CheckboxGroup,
  Modal,
  Overlay,
  Table,
  TextInput,
  Title,
  Tooltip,
  useMantineTheme,
} from '@mantine/core';
import { useClipboard, useDebouncedValue, useForm, useWindowScroll } from '@mantine/hooks';
import { DateRangePicker } from '@mantine/dates';
import { useNotifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { utils, writeFileXLSX } from 'xlsx';

import { Path } from '@/config/path';
import { exportRecordsLimit, filterDebounceTime, paginationConfig } from '@/config/system';
import { SocketEvents } from '@/config/httpConfig/socket';
import { categoryConfig, listEventTableConfig } from '@/config/listEventConfig';
import { ErrorCode } from '@/config/httpConfig/apis';
import {
  handleGetValueFromEvent,
  handleListEventPagingReq,
  isSocketEventValid,
} from '@/helper/listEventHelper';
import { showNotiFetch, showNotiSocket } from '@/helper/notificationHelper';

import { IListEventForm, IListEventReq, IListEvent } from '@/interface/interfaceListEvent';
import { NotiID } from '@/interface/interfaceNotification';
import { IPaginationData } from '@/interface/interfaceCommon';
import { getListEventPaging } from '@/service/ListEventAPI';

import PaginationList from '@/components/Pagination';
import {
  ChevronUp,
  ClipboardCheck,
  Copy,
  Database,
  FileExport,
  Search,
  X,
} from 'tabler-icons-react';
import { ReactComponent as ArrowLeft } from '@/assets/icons/arrow-left.svg';
import { ReactComponent as ArrowRight } from '@/assets/icons/arrow-right.svg';

import './ListEventPaging.scss';
