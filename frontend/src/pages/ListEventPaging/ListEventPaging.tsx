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

export const ListEventPaging = () => {
  const { socket, isAFK } = useGlobalStore((state) => ({
    socket: state.socket,
    isAFK: state.isAFK,
  }));

  const { colorScheme, colors } = useMantineTheme();
  const overlayColor = colorScheme === 'dark' ? colors.dark[9] : colors.gray[0];

  const { t } = useTranslation();
  const { notifications } = useNotifications();
  const clipboard = useClipboard();

  const reqControllerRef = useRef<AbortController>(new AbortController());

  const [scroll, scrollTo] = useWindowScroll();
  const [eventData, setEventData] = useState<IListEvent[]>([]);
  const [eventResData, setEventResData] = useState<IPaginationData>();
  const [isFetching, setIsFetching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);

  const filterForm = useForm<IListEventForm>({
    initialValues: {
      keyword: '',
      dateRange: [null, null],
      categoryID: ['1', '2', '3'],
      currentPage: 1,
      size: paginationConfig.pageSizePool[0],
    },
  });
  const [filterValuesDebounced] = useDebouncedValue(filterForm.values, filterDebounceTime);

  const filterFormModal = useForm<IListEventForm>({
    initialValues: {
      keyword: '',
      dateRange: [null, null],
      categoryID: ['1', '2', '3'],
      currentPage: 1,
      size: paginationConfig.pageSizePool[0],
    },
  });

  const handleOpenFilterModal = () => {
    filterFormModal.setValues(filterForm.values);
    setShowModal(true);
  };

  const handleSubmitFilter = ({ keyword, dateRange }: IListEventForm) => {
    setShowModal(false);
    filterForm.setValues((v) => ({ ...v, currentPage: 1, keyword, dateRange }));
  };

  const handleGetData = (payload: IListEventReq) => {
    setIsFetching(true);

    // Only show noti on first call or current list has no data
    if (!eventData.length) {
      showNotiFetch({ notiID: NotiID.LIST_EVENT_FETCH, notiQueue: notifications });
    }

    reqControllerRef.current = new AbortController();

    getListEventPaging(payload, {
      signal: reqControllerRef.current.signal,
    }).subscribe({
      next: ({ data }) => {
        // Only show noti on first call or current list has no data
        if (!eventData.length) {
          showNotiFetch({
            notiID: NotiID.LIST_EVENT_FETCH,
            notiQueue: notifications,
            isSuccess: true,
          });
        }

        scrollTo({ y: 0 });
        setEventResData(data);
        setEventData(data.listEvent);
      },
      error: (err) => {
        if (err?.code === ErrorCode.ERR_CANCELED) {
          // Don't show error noti. when pending request was canceled
          return;
        }
        setIsFetching(false);
        showNotiFetch({
          notiID: NotiID.LIST_EVENT_FETCH,
          notiQueue: notifications,
          isSuccess: false,
        });
      },
      complete: () => {
        setIsFetching(false);
      },
    });
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
    const reqPayload = handleListEventPagingReq(filterValuesDebounced);
    if (!reqPayload) {
      // this case will never happen as both startDate & endDate will always be null or stored value due to the pagination filter UI.
      return;
    }
    setLoadingExport(true);
    getListEventPaging({ ...reqPayload, page: 1, size: exportRecordsLimit }).subscribe({
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
      // Temporarily disable socket event listeners to reduce unnecessary data transmission and associated logical processes.
      socket.off(SocketEvents.GET_COMMUNICATION_EVENT);
      return;
    }

    reqControllerRef.current.abort();

    const reqPayload = handleListEventPagingReq(filterValuesDebounced);
    if (!reqPayload) {
      return;
    }
    handleGetData(reqPayload);

    socket.on(SocketEvents.GET_COMMUNICATION_EVENT, (event: IListEvent) => {
      showNotiSocket(event);

      // Filter socket events to match with current filter conditions.
      if (
        (filterValuesDebounced.currentPage && filterValuesDebounced.currentPage > 1) ||
        !isSocketEventValid(reqPayload, event)
      ) {
        return;
      }

      setEventData((currData) => {
        const newList = currData.slice();
        newList.pop();
        newList.unshift(event);
        return newList;
      });
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

      <div className="list-event__filter d-flex justify-between shadow--pale">
        <CheckboxGroup
          value={filterForm.values.categoryID}
          {...filterForm.getInputProps('categoryID', { type: 'checkbox' })}
        >
          {renderCheckBoxFilter}
        </CheckboxGroup>
        <div className="list-event__filter-submit d-flex gap-3">
          <ActionIcon
            variant="default"
            size="lg"
            radius="xl"
            onClick={() => handleOpenFilterModal()}
          >
            <Search />
          </ActionIcon>

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

      <div className="position-relative pb-6">
        {isFetching && <Overlay zIndex={2} blur={1} opacity={0.5} color={overlayColor} />}
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
          {eventData.length === 0 && (
            <caption className="list-event__table--no-data">
              <Database />
              <div>{t('list_event.no_data')}</div>
            </caption>
          )}
        </Table>
      </div>

      {eventData.length > 0 && (
        <div className="list-event__pagination p-3 shadow--pale-up">
          <PaginationList<IListEventForm>
            fetchingState={{ isFetching, setIsFetching }}
            filterForm={filterForm}
            paginationData={{
              ...eventResData,
              size: filterForm.values.size,
            }}
          />
        </div>
      )}
      <Modal
        opened={showModal}
        className="modal-filter"
        title={
          <ActionIcon
            className="modal-filter__back"
            size="xl"
            variant="filled"
            color="gray"
            radius="xl"
            onClick={() => setShowModal(false)}
          >
            <ArrowLeft />
          </ActionIcon>
        }
        onClose={() => setShowModal(false)}
        withCloseButton={false}
        overlayColor={overlayColor}
        overlayBlur={4}
        overflow="inside"
        centered
      >
        <form
          id="modalFilter"
          className="modal-filter__form d-flex flex-column gap-3"
          onSubmit={filterFormModal.onSubmit(handleSubmitFilter)}
        >
          <TextInput
            label="Event name/keywords"
            placeholder="Enter event name or keywords"
            rightSection={
              filterFormModal.values.keyword && (
                <ActionIcon
                  variant="transparent"
                  onClick={() => filterFormModal.setFieldValue('keyword', '')}
                >
                  <X size={16} />
                </ActionIcon>
              )
            }
            {...filterFormModal.getInputProps('keyword')}
          />

          {/* 
            The DateRangePicker component has an UI/UX issue that caused by react 18 strict mode (happen only in development)
            ref: https://github.com/mantinedev/mantine/issues/1563#issuecomment-1146042250
          */}
          <DateRangePicker
            name="dateRange"
            label="Event date range"
            placeholder="Pick dates range"
            allowSingleDateInRange
            {...filterFormModal.getInputProps('dateRange')}
          />
        </form>

        <div className="modal-filter__btn-action">
          <Button size="lg" variant="subtle" type="submit" form="modalFilter">
            {t('common.search')}

            <ArrowRight className="ml-2" />
          </Button>
        </div>
      </Modal>

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
