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
  };
  