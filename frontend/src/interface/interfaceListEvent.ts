import { IPaginationData } from './interfaceCommon';

export interface IListEventForm extends IPaginationData {
  keyword: string;
  lastRecordCreatedTime?: string;
  dateRange: [Date | null, Date | null];
  categoryID: string[];
}

export interface IListEventReq {
  page?: number;
  lastRecordCreatedTime?: string;
  size: number;
  category: IListEvent['category'][] | string[];
  keyword?: string;
  startTime?: string;
  endTime?: string;
}