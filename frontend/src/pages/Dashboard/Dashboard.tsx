import { useEffect, useRef, useState } from 'react';

// Import libs
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useGlobalStore from '@/store';
import { Button, Title } from '@mantine/core';
import { showNotification, useNotifications } from '@mantine/notifications';
import { useDebouncedValue } from '@mantine/hooks';

// Import configs
import { SocketEvents } from '@/config/httpConfig/socket';
import { blinkAnimatedTimeout, connectionChangeTimeout } from '@/config/system';
import { Path } from '@/config/path';
import { NodeStatusConfig } from '@/config/hierarchyTreeConfig';
import { ErrorCode } from '@/config/httpConfig/apis';
import { handleDiagramRawData, handleUpdateThirdCategory } from '@/helper/dashboardHelper';
import { findNotiConfig, showNotiFetch, showNotiSocket } from '@/helper/notificationHelper';
import { getDiagramData } from '@/service/DashboardAPI';

// Import interfaces
import { ENodeStatus, IDiagramData, IStatusConfig } from '@/interface/interfaceHierarchyTree';
import { NotiID } from '@/interface/interfaceNotification';
import { IListEvent } from '@/interface/interfaceListEvent';

// Import comps & assets
import HierarchyTree from '@/components/HierarchyTree';
import { ReactComponent as IconLine } from '@/assets/icons/line.svg';
import { ReactComponent as ArrowRight } from '@/assets/icons/arrow-right.svg';

import './Dashboard.scss';

export const Dashboard = () => {
  const { socket, isAFK, setRawDiagramData } = useGlobalStore((state) => ({
    socket: state.socket,
    isAFK: state.isAFK,
    setRawDiagramData: state.setRawDiagramData,
  }));

  const timeOutStack = useRef<{ id: string; timeOut: number }[]>([]);
  const { t } = useTranslation();
  const { notifications } = useNotifications();

  const [diagramFlattenData, setDiagramFlattenData] = useState<IDiagramData[]>([]);
  const [diagramFlattenDefault, setDiagramFlattenDefault] = useState<IDiagramData[]>([]);

  const [diagramDataFlattenDebounced] = useDebouncedValue(diagramFlattenData, 200); // adapt to a rare case: duplicate socket events.

  const handleVirusThresholdExceedEvent = (currNodeList: IDiagramData[], sendNodeIndex: number) => {
    const relatedNodeData = currNodeList[sendNodeIndex];
    currNodeList.splice(sendNodeIndex, 1, {
      ...relatedNodeData,
      nodeStatus: ENodeStatus.VIRUS_EXCEED,
    });

    setDiagramFlattenData([...currNodeList]);

    let findOnStack = timeOutStack.current.findIndex(({ id }) => id === relatedNodeData.id);
    findOnStack = findOnStack === -1 ? timeOutStack.current.length : findOnStack;

    clearTimeout(timeOutStack.current[findOnStack]?.timeOut);

    timeOutStack.current[findOnStack] = {
      id: relatedNodeData.id,
      timeOut: setTimeout(() => {
        setDiagramFlattenData((d) => {
          const nodeListNow = d.slice();
          nodeListNow.splice(sendNodeIndex, 1, {
            ...relatedNodeData,
            nodeStatus: undefined,
          });
          return [...nodeListNow];
        });
      }, blinkAnimatedTimeout),
    };
  };

  const handleThirdCategoryEvent = (
    event: IListEvent,
    currNodeList: IDiagramData[],
    updateNodeIndex: number,
  ) => {
    const relatedNode = currNodeList[updateNodeIndex];
    const relateNodeDefault = diagramFlattenDefault[updateNodeIndex];

    const nodeNeedUpdated = handleUpdateThirdCategory(event, relatedNode);
    if (!nodeNeedUpdated) {
      return;
    }
    const { connection, communication } = nodeNeedUpdated;

    // Change only related node to connection state
    setDiagramFlattenData((d) => {
      const nodeListNow = d.slice();
      nodeListNow.splice(updateNodeIndex, 1, connection);
      return [...nodeListNow];
    });

    setTimeout(() => {
      // Change only related node to communication state
      setDiagramFlattenData((d) => {
        const nodeListNow = d.slice();
        nodeListNow.splice(updateNodeIndex, 1, communication);
        return [...nodeListNow];
      });

      setTimeout(() => {
        // Reset only this node to default state
        setDiagramFlattenData((d) => {
          const nodeListNow = d.slice();
          nodeListNow.splice(updateNodeIndex, 1, relateNodeDefault);
          return [...nodeListNow];
        });
      }, connectionChangeTimeout);
    }, connectionChangeTimeout);
  };

  const handleSocketEvent = (event: IListEvent) => {
    const eventCategory = event.category;

    if (eventCategory !== 3) {
      const sendNodeIndex = diagramFlattenData.findIndex(({ id }) => id === event.sendNode);
      if (sendNodeIndex === -1) {
        showNotification({
          ...findNotiConfig(ErrorCode.ERR_SOCKET_DEVICE_NOTFOUND),
          message: t('common.error.device_notfound.message', { eventID: event.id }),
        });
        return;
      }

      handleVirusThresholdExceedEvent(diagramFlattenData.slice(), sendNodeIndex);
      return;
    }

    // If sendNode is an OBU, the node to be updated must be this OBU instead of its parent (RSU).
    const updateNodeIndex = diagramFlattenData.findIndex(
      ({ id }) => id === (event.sendNodeType === 'OBU' ? event.sendNode : event.receiveNode),
    );
    if (updateNodeIndex === -1) {
      showNotification({
        ...findNotiConfig(ErrorCode.ERR_SOCKET_DEVICE_NOTFOUND),
        message: t('common.error.device_notfound.message', { eventID: event.id }),
      });
      return;
    }
    handleThirdCategoryEvent(event, diagramFlattenData.slice(), updateNodeIndex);
  };

  const renderStatusExplanation = (statusConfig: IStatusConfig[]) =>
    statusConfig.map((eachStatus) => (
      <div key={eachStatus.status} className="d-flex gap-1 align-center">
        <div
          className={`dashboard__status circle status--${eachStatus.color} ${
            eachStatus.className || ''
          }`}
        >
          {eachStatus.icon}
        </div>{' '}
        {t(eachStatus.label)}
      </div>
    ));

  useEffect(() => {
    if (isAFK) {
      // Temporarily disable socket event listeners to reduce unnecessary data transmission and associated logical processes.
      socket.off(SocketEvents.GET_COMMUNICATION_EVENT);
      return;
    }

    socket.on(SocketEvents.GET_COMMUNICATION_EVENT, (event: IListEvent) => {
      showNotiSocket(event);
      handleSocketEvent(event);
    });

    return () => {
      socket.off(SocketEvents.GET_COMMUNICATION_EVENT);
    };
  }, [diagramFlattenData, isAFK]);

  // Pass `diagramDemoData` (dashboardHelper.tsx) to setRawDiagramData to preview all schenario.
  useEffect(() => setRawDiagramData(diagramDataFlattenDebounced), [diagramDataFlattenDebounced]);

  useEffect(() => {
    /**
     * Note: React 18 simulate immediately unmounting and remounting the component whenever a component mounts in strict mode. So this useEffect execute effect twice (call API twice).
     * We can create a custom useEffect (like useEffectOnce) with a self-check boolean useRef to avoid it on development. Or, use [swr](https://swr.vercel.app/) || ReactQuery to fetch data.
     *
     * In this case, I just ignore it. Its work correctly on production.
     */
    showNotiFetch({ notiID: NotiID.DASHBOARD_FETCH, notiQueue: notifications });

    getDiagramData().subscribe({
      next: ({ data }) => {
        const flattenData = handleDiagramRawData(data);
        setDiagramFlattenDefault(flattenData);
        setDiagramFlattenData(flattenData);

        showNotiFetch({
          notiID: NotiID.DASHBOARD_FETCH,
          notiQueue: notifications,
          isSuccess: true,
        });
      },
      error: (err) => {
        console.log(err);

        showNotiFetch({
          notiID: NotiID.DASHBOARD_FETCH,
          notiQueue: notifications,
          isSuccess: false,
        });
      },
    });
  }, []);

  return (
    <div className="dashboard h100 d-flex flex-column align-stretch">
      <div className="d-flex align-center justify-between mb-3">
        <Title order={2}>{t('dashboard.title')}</Title>
        <Button<typeof Link>
          className="dashboard__list-event"
          component={Link}
          variant="subtle"
          size="md"
          to={Path.LIST_EVENT_PAGING}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('list_event.title')}
          <ArrowRight className="ml-1" />
        </Button>
      </div>

      <div className="dashboard__explanation d-flex gap-3">
        <div className="d-flex gap-1 align-center">
          <IconLine className="icon__stroke--red" /> {t('dashboard.connection')}
        </div>
        <div className="d-flex gap-1 align-center dash-animated">
          <IconLine className="icon__stroke--red" /> {t('dashboard.communication')}
        </div>
      </div>

      <div className="d-flex gap-3 mt-2">{renderStatusExplanation(NodeStatusConfig)}</div>

      <div className="flex-1 position-relative">
        <div className="dashboard__diagram-container">
          <HierarchyTree hideAttribution />
        </div>
      </div>
    </div>
  );
};
