import dayjs from 'dayjs';
import { t } from 'i18next';

import { getCategoryConfig, getEventInfoTextOnly, renderEventInfo } from '@/helper/listEventHelper';
import { IListEventTable } from '@/interface/interfaceListEvent';

export const categoryConfig = [
  {
    id: 1,
    label: 'list_event.category.availability_status_tranfer',
  },
  {
    id: 2,
    label: 'list_event.category.virus',
  },
  {
    id: 3,
    label: 'list_event.category.communication',
  },
];