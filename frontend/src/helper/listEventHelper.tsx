import { Tooltip } from '@mantine/core';
import dayjs from 'dayjs';
import { t } from 'i18next';

import { categoryConfig, listEventTableConfig } from '@/config/listEventConfig';
import { CPUThreshold, NICThreshold, paginationConfig, RAMThreshold } from '@/config/system';
import {
  IEventInfoAvailability,
  IEventInfoCommunication,
  IEventInfoVirus,
  IListEvent,
  IListEventForm,
  IListEventReq,
} from '@/interface/interfaceListEvent';
import { TypesOf } from '@/interface/interfaceCommon';
import { checkStrArrIncludeKeyword } from '@/util/arrayHandle';
import { safeAnyToNumber } from '@/util/primitiveHandle';

export const getCategoryConfig = (category: TypesOf<IListEvent>) =>
  categoryConfig.find(({ id }) => id === category);

export const renderEventInfo = (data: IListEvent, disableTooltip?: boolean) => {
  const category = getCategoryConfig(data.category);
  switch (category?.id) {
    case 1: {
      const eventInfoData = data.eventInfo as IEventInfoAvailability;
      const traffic = Math.round((eventInfoData.nic.tx / eventInfoData.nic.rx) * 100);
      return (
        <Tooltip
          className="text-ellipsis--2"
          label={`CPU ${eventInfoData.cpu}%, Memory ${eventInfoData.ram}%, Traffic volume ${traffic}%`}
          disabled={disableTooltip}
        >
          CPU (
          <span className={`text-${eventInfoData.cpu < CPUThreshold ? 'green' : 'red'}`}>
            {eventInfoData.cpu}%
          </span>
          ), Memory (
          <span className={`text-${eventInfoData.ram < RAMThreshold ? 'green' : 'red'}`}>
            {eventInfoData.ram}%
          </span>
          ),
          <br />
          Current traffic volume (
          <span className={`text-${traffic < NICThreshold ? 'green' : 'red'}`}>{traffic}%</span>)
        </Tooltip>
      );
    }
    case 2: {
      return (
        <div className="table__event-info text-ellipsis--2">
          <>
            {t('list_event.info.virus', {
              fileName: (data.eventInfo as IEventInfoVirus).fileName || '',
            })}
          </>
        </div>
      );
    }
    case 3:
      return (
        <>
          {t('list_event.info.communication', {
            detectionNode: data.detectionNode || '',
            info: (data.eventInfo as IEventInfoCommunication).info || '',
          })}
        </>
      );
  
    default:
      return <></>;
  }
};

export const getEventInfoTextOnly = (data: IListEvent): string => {
  const category = getCategoryConfig(data.category);

  switch (category?.id) {
    case 1: {
      const eventInfoData = data.eventInfo as IEventInfoAvailability;
      const traffic = Math.round((eventInfoData.nic.tx / eventInfoData.nic.rx) * 100);

      return `CPU ${eventInfoData.cpu}%, Memory ${eventInfoData.ram}%, Traffic volume ${traffic}%`;
    }

    case 2:
      return t('list_event.info.virus', {
        fileName: (data.eventInfo as IEventInfoVirus).fileName || '',
      });

    case 3:
      return t('list_event.info.communication', {
        detectionNode: data.detectionNode || '',
        info: (data.eventInfo as IEventInfoCommunication).info || '',
      });

    default:
      return '';
  }
};

export const handleGetValueFromEvent = (data: IListEvent): string => {
  let content = '';
  listEventTableConfig.forEach(({ key, label, rawContent }) => {
    if (rawContent) {
      content += ` ${label}: ${rawContent(data)},`;
      return;
    }
    content += data[key] ? ` ${label}: ${data[key]},` : '';
  });
  return content.trim().slice(0, -1);
};