import { Edge, Node } from 'react-flow-renderer';
import dagre from 'dagre';

import {
  defaultNodeHeight,
  defaultNodeWidth,
  NodeStatusConfig,
  rootCoordinate,
} from '@/config/hierarchyTreeConfig';
import { IDiagramData, NodeData } from '@/interface/interfaceHierarchyTree';

export const handleDiagramData = (
  diagramData: IDiagramData[],
): { initialNodes: Node<NodeData>[]; initialEdges: Edge[] } => {
  const initialNodes: Node<NodeData>[] = [];
  const initialEdges: Edge[] = [];

  diagramData.forEach((eachRecord) => {
    const nodeStatusConfig = getNodeStatusDataByStatus(eachRecord.nodeStatus);
    initialNodes.push({
      id: eachRecord.id,
      data: {
        label: eachRecord.label,
      },
      type: eachRecord.type,
      position: rootCoordinate,
      className: `status--${nodeStatusConfig?.color || 'default'} ${
        nodeStatusConfig?.className ? 'react-flow__node--' + nodeStatusConfig?.className : ''
      }`,
    });

    if (!eachRecord.source) {
      return;
    }

    if (Array.isArray(eachRecord.source)) {
      eachRecord.source.forEach((sourceConnections, index) => {
        initialEdges.push({
          id: `e${eachRecord.source}-${eachRecord.id}-${index}`,
          source: sourceConnections.id,
          target: eachRecord.id,
          sourceHandle: index === 0 ? undefined : `hs-${sourceConnections.id}`,
          targetHandle: index === 0 ? undefined : `ht-${eachRecord.id}`,
          animated: sourceConnections.edgeAnimated,
          style: {
            animationDirection: sourceConnections.connectionFlow,
            ...sourceConnections.edgeStyle,
          },
        });
      });
      return;
    }

    initialEdges.push({
      id: `e${eachRecord.source}-${eachRecord.id}`,
      source: eachRecord.source,
      target: eachRecord.id,
      animated: eachRecord.edgeAnimated,
      style: { animationDirection: eachRecord.connectionFlow, ...eachRecord.edgeStyle },
    });
  });
  return { initialNodes, initialEdges };
};

export const processAutoLayoutDiagram = (initialNodes: Node<NodeData>[], initialEdges: Edge[]) => {
    const skeletonEdges = initialEdges.filter((e) => !e.targetHandle && !e.sourceHandle);
  
    const dagreGraph = new dagre.graphlib.Graph(); 
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({});
    initialNodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: defaultNodeWidth, height: defaultNodeHeight })
    });
  
    skeletonEdges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
  
    });
  
    dagre.layout(dagreGraph);
  
    return initialNodes.map((nodeConfig) => {
      const { x, y } = dagreGraph.node(nodeConfig.id);
  
      return {
        ...nodeConfig,
        position: { x: x / 1.2, y: y + defaultNodeHeight },
      };
    });
  };


export const getNodeStatusDataByStatus = (status?: number) => {
    return NodeStatusConfig.find((statusConfig) => statusConfig.status === status);
  };
  

  export const getNodeStatusDataByKey = (statusKey: string) => {
    return NodeStatusConfig.find((statusConfig) => statusConfig.key === statusKey);
  };
  