import { useEffect, useRef, useState } from 'react';
import useGlobalStore from '@/store';
import {
  ActionIcon,
  Checkbox,
  CheckboxGroup,
  Loader,
  Table,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useClipboard, useDebouncedValue, useForm, useWindowScroll } from '@mantine/hooks';
import { DateRangePicker } from '@mantine/dates';
import { useNotifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroll-component';
import { utils, writeFileXLSX } from 'xlsx';
import dayjs from 'dayjs';

import { Path } from '@/config/path';
import { exportRecordsLimit, filterDebounceTime } from '@/config/system';
import { SocketEvents } from '@/config/httpConfig/socket';
import { categoryConfig, listEventTableConfig } from '@/config/listEventConfig';
import { ErrorCode } from '@/config/httpConfig/apis';
import {
  handleGetValueFromEvent,
  handleListEventPagingReq,
  handleListEventReqDebounce,
  isSocketEventValid,
} from '@/helper/listEventHelper';
import { showNotiFetch, showNotiSocket } from '@/helper/notificationHelper';
import { safeAnyToNumber } from '@/util/primitiveHandle';
import { getListEvent, getListEventPaging } from '@/service/ListEventAPI';

import { IListEventForm, IListEventReq, IListEvent } from '@/interface/interfaceListEvent';
import { NotiID } from '@/interface/interfaceNotification';

import { ChevronUp, ClipboardCheck, Copy, Database, FileExport, X } from 'tabler-icons-react';
import { ReactComponent as ArrowLeft } from '@/assets/icons/arrow-left.svg';