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

import './ListEvent.scss';

export const ListEvent = () => {
  const { socket, isAFK } = useGlobalStore((state) => ({
    socket: state.socket,
    isAFK: state.isAFK,
  }));
  const { t } = useTranslation();
  const { notifications } = useNotifications();
  const clipboard = useClipboard();

  const reqControllerRef = useRef<AbortController>(new AbortController());

  const [scroll, scrollTo] = useWindowScroll();
  const [eventData, setEventData] = useState<IListEvent[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>();
  const [isScrollLoad, setIsScrollLoad] = useState(false);
  const [hasMoreRecord, setHasMoreRecord] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);

  const filterForm = useForm<IListEventForm>({
    initialValues: {
      keyword: '',
      dateRange: [null, null],
      categoryID: ['1', '2', '3'],
    },
  });
  const [filterValuesDebounced] = useDebouncedValue(filterForm.values, filterDebounceTime);

  const handleGetData = (payload: IListEventReq) => {
    // Only show noti on first call or current list has no data
    if (!eventData.length) {
      showNotiFetch({ notiID: NotiID.LIST_EVENT_FETCH, notiQueue: notifications });
    }

    reqControllerRef.current = new AbortController();

    getListEvent(payload, {
      signal: reqControllerRef.current.signal,
    }).subscribe({
      next: ({ data }) => {
        setHasMoreRecord(data.hasNext || false);

        // Only show noti on first call or current list has no data
        if (!eventData.length) {
          showNotiFetch({
            notiID: NotiID.LIST_EVENT_FETCH,
            notiQueue: notifications,
            isSuccess: true,
          });
        }

        // Load more request → append new data to current list instead.
        if (isScrollLoad) {
          setEventData((currData) => [...currData, ...data.listEvent]);
          return;
        }
        scrollTo({ y: 0 });
        setEventData(data.listEvent);
        setTotalRecords(data.totalRecords);
      },
      error: (err) => {
        setIsScrollLoad(false);

        if (err?.code === ErrorCode.ERR_CANCELED) {
          // Don't show error noti. when pending request was canceled
          return;
        }

        showNotiFetch({
          notiID: NotiID.LIST_EVENT_FETCH,
          notiQueue: notifications,
          isSuccess: false,
        });
      },
      complete: () => {
        setIsScrollLoad(false);
      },
    });
  };

  const handleListenLoadMore = () => {
    setIsScrollLoad(true);
    filterForm.setFieldValue('lastRecordCreatedTime', eventData[eventData.length - 1].createdAt);
  };

  const handleExportXLSX = (rawExportData: IListEvent[]) => {
    console.time('export time');
    const exportData = rawExportData.map((eachEvent) =>
      listEventTableConfig.map(({ key, rawContent }) =>
        rawContent ? rawContent(eachEvent) : eachEvent[key] || '',
      ),
    );

    const worksheet = utils.json_to_sheet(exportData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, t('list_event.title'));

    // fix headers
    utils.sheet_add_aoa(worksheet, [listEventTableConfig.map(({ label }) => label)], {
      origin: 'A1',
    });

    // create an XLSX file and try to save to xlsx file
    writeFileXLSX(
      workbook,
      `${t('list_event.export.file_name', {
        createDate: dayjs().format('YYYY_MM_DD HH:mm:ss'),
      })}.xlsx`,
    );

    console.timeEnd('export time');
  };

  const handleGetListExport = () => {
    setLoadingExport(true);
    getListEventPaging({
      ...(handleListEventPagingReq(filterForm.values) || {
        category: filterForm.values.categoryID.map(safeAnyToNumber),
      }),
      page: 1,
      size: exportRecordsLimit,
    }).subscribe({
      next: ({ data }) => {
        handleExportXLSX(data.listEvent);
      },
      error: (err) => {
        if (err?.code === ErrorCode.ERR_CANCELED) {
          // Don't show error noti. when pending request was canceled
          return;
        }
        console.log(err);
        setLoadingExport(false);
      },
      complete: () => {
        setLoadingExport(false);
      },
    });
  };

  const renderCheckBoxFilter = categoryConfig.map(({ id, label }) => (
    <Checkbox key={id} mt="md" value={id.toString()} label={t(label)} />
  ));

  const renderTableHead = listEventTableConfig.map((tableColumn) => (
    <th key={tableColumn.key}>{tableColumn.label}</th>
  ));

  const renderEachRowData = (rawData: IListEvent) =>
    listEventTableConfig.map((column, index) => (
      <td
        key={`${rawData.id}-${column.key}-${index}`}
        className={rawData.category !== 3 ? 'list-event__event--red' : ''}
      >
        {column.render ? column.render(rawData) : rawData[column.key]?.toString()}
      </td>
    ));

  const renderTableRows = eventData.map((eachRecord) => (
    <tr key={eachRecord.id}>
      {renderEachRowData(eachRecord)}

      <td className="table__copy">
        <ActionIcon
          variant="filled"
          color={clipboard.copied ? 'green' : 'gray'}
          type="button"
          onClick={() => clipboard.copy(handleGetValueFromEvent(eachRecord))}
        >
          <Tooltip label={clipboard.copied ? 'Copied' : 'Copy'} placement="start">
            {clipboard.copied ? <ClipboardCheck /> : <Copy />}
          </Tooltip>
        </ActionIcon>
      </td>
    </tr>
  ));

  // Get event list whenever page number or filter form values changes
  useEffect(() => {
    if (isAFK) {
      socket.off(SocketEvents.GET_COMMUNICATION_EVENT);
      return;
    }

    reqControllerRef.current.abort();

    const reqPayload = handleListEventReqDebounce(filterValuesDebounced, isScrollLoad);
    if (!reqPayload) {
      return;
    }
    handleGetData(reqPayload);

    socket.on(SocketEvents.GET_COMMUNICATION_EVENT, (event: IListEvent) => {
      showNotiSocket(event);

      if (!isSocketEventValid(reqPayload, event)) {
        return;
      }

      setEventData((currData) => [event, ...currData]);
    });

    return () => {
      socket.off(SocketEvents.GET_COMMUNICATION_EVENT);
    };
  }, [filterValuesDebounced, isAFK]);

  useEffect(() => {
    scrollTo({ y: 0 });

    return () => {
      // Cancel pending API request when this comp. unmounts
      reqControllerRef.current.abort();
    };
  }, []);

  return (
    <div className="list-event h100 d-flex flex-column align-stretch">
      <div className="d-flex align-center">
        <Link className="list-event__back circle mr-2" to={Path.DASHBOARD}>
          <ArrowLeft />
        </Link>
        <Title order={2}>{t('list_event.title')}</Title>
      </div>

      <form className="list-event__filter shadow--pale">
        <div className="d-flex gap-3">
          <TextInput
            label="Event name/keywords"
            placeholder="Enter event name or keywords"
            rightSection={
              filterForm.values.keyword && (
                <ActionIcon
                  variant="transparent"
                  onClick={() => filterForm.setFieldValue('keyword', '')}
                >
                  <X size={16} />
                </ActionIcon>
              )
            }
            {...filterForm.getInputProps('keyword')}
          />
          <DateRangePicker
            label="Event date range"
            placeholder="Pick dates range"
            allowSingleDateInRange
            {...filterForm.getInputProps('dateRange')}
          />
        </div>

        <div className="d-flex justify-between">
          <CheckboxGroup
            defaultValue={filterForm.values.categoryID}
            {...filterForm.getInputProps('categoryID', { type: 'checkbox' })}
          >
            {renderCheckBoxFilter}
          </CheckboxGroup>
          <div className="d-flex align-center gap-3">
            {totalRecords && (
              <span className="count-records">
                {t('list_event.export.total', { totalRecords: totalRecords })}
              </span>
            )}

            <Tooltip
              label={t(loadingExport ? 'common.loading' : 'list_event.export.btn_tooltip')}
              withArrow
            >
              <ActionIcon
                className="filter-invert--1"
                size="lg"
                variant="default"
                radius="xl"
                onClick={() => handleGetListExport()}
                loading={loadingExport}
              >
                <FileExport />
              </ActionIcon>
            </Tooltip>
          </div>
        </div>
      </form>

      <InfiniteScroll
        dataLength={eventData.length}
        next={handleListenLoadMore}
        hasMore={hasMoreRecord}
        loader={
          <Title order={5} className="d-flex-center gap-1 py-1">
            <Loader size="xs" /> {t('common.loading')}...
          </Title>
        }
        endMessage={
          <Title
            order={5}
            className="list-event__no-more text-center py-3"
            hidden={eventData.length === 0}
          >
            {t('list_event.scroll.endOfRecords')}
          </Title>
        }
      >
        <Table
          className="list-event__table pb-3"
          verticalSpacing="sm"
          highlightOnHover
          captionSide="bottom"
        >
          <thead>
            <tr>{renderTableHead}</tr>
          </thead>
          <tbody>{renderTableRows}</tbody>
          {eventData.length === 0 && !hasMoreRecord && (
            <caption className="list-event__table--no-data">
              <Database />
              <div>{t('list_event.no_data')}</div>
            </caption>
          )}
        </Table>
      </InfiniteScroll>

      <ActionIcon
        className="list-event__scroll-top"
        color="blue"
        variant="filled"
        size="xl"
        radius="xl"
        onClick={() => scrollTo({ y: 0 })}
        hidden={scroll.y < 100}
      >
        <ChevronUp size={32} />
      </ActionIcon>
    </div>
  );
};
