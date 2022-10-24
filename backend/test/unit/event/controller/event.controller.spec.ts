import { Test, TestingModule } from '@nestjs/testing';
import { EventController } from '../../../../src/modules/event/controller/event.controller';
import { EventService } from '../../../../src/modules/event/service/event.service';
import { QueryPagingEventBodyDto } from '../../../../src/modules/event/dto/query-paging-event-body.dto';
import { QueryLoadMoreEventBodyDto } from '../../../../src/modules/event/dto/query-load-more-event-body.dto';
import { Event } from '../../../../src/modules/event/entity/event.entity';

describe('EventController', () => {
  let controller: EventController;
  let fakeEventService: Partial<EventService>;

  beforeEach(async () => {
    fakeEventService = {
      findAllPaging: (queryEventBody: QueryPagingEventBodyDto) => {
        const totalRecords = 10;
        return Promise.resolve({
          totalRecords,
          totalPages: Math.ceil(totalRecords / queryEventBody.size),
          currentPage: queryEventBody.page,
          listEvent: Array.from(
            { length: queryEventBody.size },
            () => new Event(),
          ),
        });
      },
      findAllLoadMore: (queryEventBody: QueryLoadMoreEventBodyDto) => {
        return Promise.resolve({
          hasNext: queryEventBody.size < 2,
          listEvent: Array.from(
            { length: queryEventBody.size },
            () => new Event(),
          ),
        });
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventController],
      providers: [
        {
          provide: EventService,
          useValue: fakeEventService,
        },
      ],
    }).compile();

    controller = module.get<EventController>(EventController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

});
