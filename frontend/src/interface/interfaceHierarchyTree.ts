import { CSSProperties } from 'react';

export type NodeData = {
  label: JSX.Element | string;
  sourceHandlerIDs?: string[];
  targetHandlerIDs?: string[];
};

export enum ENodeStatus {
  DRIVING = 1,
  STOP = 0,
  TURN_AROUND = 2,
  PASS = 3,
  VIRUS_EXCEED = 4,
}