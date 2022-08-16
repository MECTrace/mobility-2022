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
