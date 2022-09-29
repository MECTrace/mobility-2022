import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { RsuService } from '../../../modules/node/service/rsu.service';
import {
  Brackets,
  DeleteResult,
  LessThan,
  Repository,
  SelectQueryBuilder,
  WhereExpressionBuilder,
} from 'typeorm';
import { EventDataDto } from '../dto/event-data.dto';
import { QueryLoadMoreEventBodyDto } from '../dto/query-load-more-event-body.dto';
import { QueryPagingEventBodyDto } from '../dto/query-paging-event-body.dto';
import { Event } from '../entity/event.entity';
import { CategoryEnum } from '../enum/category.enum';
import { PaginationEventDto } from '../dto/pagination-event.dto';
import { LoadMoreEventDto } from '../dto/load-more-event.dto';
import { QuerySearchEventBodyDto } from '../dto/query-search-event-body.dto';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event) private eventRepository: Repository<Event>,
    private configService: ConfigService,
    private rsuService: RsuService,
  ) {}

  /**
   * Find all event with paging
   * @param {QueryPagingEventBodyDto} queryEventBody
   * @returns {Promise<PaginationEventDto>}
   */
  
   async findAllPaging(
    queryEventBody: QueryPagingEventBodyDto,
  ): Promise<PaginationEventDto> {
    const { page, size, category, keyword, startTime, endTime } =
      queryEventBody;

    if (category.length === 0) {
      return {
        totalRecords: 0,
        totalPages: 0,
        currentPage: page,
        listEvent: [],
      };
    }

    const offset = (page - 1) * size;

    let queryBuilder = this._createDefaultQueryBuilderFindAll();

    queryBuilder = this._updateQueryBuilderFindAllBySearchQuery(queryBuilder, {
      category,
      keyword,
      startTime,
      endTime,
    });

    queryBuilder = this._orderByCreatedAt(queryBuilder);

    queryBuilder = queryBuilder.skip(offset).take(size);

    const [listEvent, totalRecords] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount(),
    ]);

    return {
      totalRecords,
      totalPages: Math.ceil(totalRecords / size),
      currentPage: page,
      listEvent,
    };
  }

  /**
   * Find all event with load more
   * @param {QueryLoadMoreEventBodyDto} queryEventBody
   * @returns {Promise<LoadMoreEventDto>}
   */

}
