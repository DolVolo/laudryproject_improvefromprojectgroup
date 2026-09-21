import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { Customer } from './customer/schemas/customer.schema';
import { Review } from './customer/schemas/review.schema';
import { Order } from './customer/schemas/order.schema';
import { Shop } from '../map/schemas/shop.schema';
import { OrderGateway } from '../realtime/order.gateway';
import { StorageService } from '../storage/storage.service';

/** Minimal stand-in for a Mongoose model — only what these tests touch. */
const modelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let storageService: { uploadDataUrl: jest.Mock; remove: jest.Mock };

  beforeEach(async () => {
    storageService = {
      uploadDataUrl: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: modelMock() },
        { provide: getModelToken(Customer.name), useValue: modelMock() },
        { provide: getModelToken(Review.name), useValue: modelMock() },
        { provide: getModelToken(Order.name), useValue: modelMock() },
        { provide: getModelToken(Shop.name), useValue: modelMock() },
        { provide: OrderGateway, useValue: { emitOrderUpdate: jest.fn() } },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('order image handling', () => {
    // persistOrderImages is private but is the seam between an incoming order
    // and the storage backend, so it is worth pinning down directly.
    const persist = (images?: string[]) =>
      (service as unknown as {
        persistOrderImages: (i?: string[]) => Promise<string[]>;
      }).persistOrderImages(images);

    it('returns an empty list when there are no images', async () => {
      await expect(persist(undefined)).resolves.toEqual([]);
      await expect(persist([])).resolves.toEqual([]);
      expect(storageService.uploadDataUrl).not.toHaveBeenCalled();
    });

    it('sends every image to storage and keeps the returned URLs in order', async () => {
      storageService.uploadDataUrl
        .mockResolvedValueOnce('https://cdn.example.com/first.jpg')
        .mockResolvedValueOnce('https://cdn.example.com/second.jpg');

      await expect(
        persist(['data:image/jpeg;base64,AAA', 'data:image/png;base64,BBB']),
      ).resolves.toEqual([
        'https://cdn.example.com/first.jpg',
        'https://cdn.example.com/second.jpg',
      ]);

      expect(storageService.uploadDataUrl).toHaveBeenCalledTimes(2);
      expect(storageService.uploadDataUrl).toHaveBeenCalledWith(
        'data:image/jpeg;base64,AAA',
        'customerorder',
      );
    });
  });
});
