import { getNodeStatusDataByKey } from './hierarchyTreeHelper';
import {
  ENodeStatus,
  IDiagramData,
  IDiagramDataCommon,
  IDiagramResData,
} from '@/interface/interfaceHierarchyTree';
import { IListEvent } from '@/interface/interfaceListEvent';

export const themeRedDark = 'var(--theme-red-dark)';
export const diagramRootID = 'center';

/**
 *
 * @param rawData the relationship res. data from BE.
 * @returns flattened data with the same format as `diagramDemoData`.
 *
 * @note The 🥇 1st `source` must be its parent id, otherwise the diagram structure will be collapsed.
 *
 * ⭐ Node has multiple sources (connections), `source` must be an array with independent connection style (see `diagramDemoData` for example).
 *
 * ⭐ Node has only 1 source, a string or an array of `source` are both 👌.
 *
 * 🙋‍♂️🙋‍♀️"*Connection styles priority?*" - Plz read doc. of the `handleDiagramData` function on [hierarchyTreeHelper.ts](./hierarchyTreeHelper.ts).
 */
export const handleDiagramRawData = (rawData: IDiagramResData): IDiagramData[] => {
  const processedData: IDiagramData[] = [
    {
      id: diagramRootID,
      label: 'Center',
      type: 'input',
    },
  ];

  rawData.listEdge.forEach((edge) => {
    processedData.push({
      id: edge.name,
      label: (
        <>
          {edge.name}
          <br />
          <span>(ID: {edge.id})</span>
        </>
      ),
      type: 'customNode',
      source: diagramRootID,
    });

    edge.listRsu.forEach((rsu) => {
      processedData.push({
        id: rsu.name,
        label: (
          <>
            {rsu.name}
            <br />
            <span>(ID: {rsu.id})</span>
          </>
        ),
        type: 'customNode',
        source: edge.name,
      });

      rsu.listObu.forEach((obu) => {
        processedData.push({
          id: obu.name,
          label: (
            <>
              {obu.name}
              <br />
              <span>(ID: {obu.id})</span>
            </>
          ),
          type: 'output',
          source: rsu.name,
          nodeStatus: ENodeStatus.DRIVING,
        });
      });
    });
  });
  return processedData;
};