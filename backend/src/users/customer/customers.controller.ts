import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  NotFoundException,
  ForbiddenException,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import {
  CreateCustomerDto,
  CreateReviewDto,
  CreateOrderDto,
  UpdateOrderDto,
} from './dto/create-customer.dto';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { StorageService } from '../../storage/storage.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly storageService: StorageService,
  ) {}

  private readonly allSignedInRoles: Array<
    'user' | 'rider' | 'admin' | 'employee'
  > = ['user', 'rider', 'admin', 'employee'];

  private readonly customerActionRoles: Array<'user' | 'admin'> = [
    'user',
    'admin',
  ];

  private toNumber(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private toImageList(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
    if (typeof value !== 'string' || !value.trim()) {
      return [];
    }

    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      // keep as single string fallback
    }

    return [value];
  }

  private async uploadOrderImages(
    files?: Array<{ buffer: Buffer; mimetype: string }>,
  ): Promise<string[]> {
    if (!files?.length) return [];
    return Promise.all(
      files.map((file) =>
        this.storageService.uploadBuffer(
          file.buffer,
          'customerorder',
          file.mimetype,
        ),
      ),
    );
  }

  private normalizeOrderPayload(body: any, uploadedImages: string[] = []) {
    const bodyImages = this.toImageList(body?.images);

    return {
      ...body,
      pickupLatitude: this.toNumber(body?.pickupLatitude),
      pickupLongitude: this.toNumber(body?.pickupLongitude),
      deliveryLatitude: this.toNumber(body?.deliveryLatitude),
      deliveryLongitude: this.toNumber(body?.deliveryLongitude),
      serviceTimeMinutes: this.toNumber(body?.serviceTimeMinutes),
      washTimeMinutes: this.toNumber(body?.washTimeMinutes),
      images: [...bodyImages, ...uploadedImages],
    };
  }

  private getAuthUserId(req: any): string {
    return req?.user?.userId || req?.user?.sub || req?.user?.id;
  }

  private async ensureRole(
    req: any,
    allowedRoles: Array<'user' | 'rider' | 'admin' | 'employee'>,
  ) {
    const userId = this.getAuthUserId(req);
    if (!userId) throw new ForbiddenException('Unauthorized');

    const user = await this.customersService.findUserById(userId);
    if (!user || !allowedRoles.includes(user.role as any)) {
      throw new ForbiddenException('ไม่อนุญาตให้เข้าถึงข้อมูลส่วนนี้');
    }

    return userId;
  }

  @UseGuards(AccessTokenGuard)
  @Post('register')
  async registerCustomer(@Request() req, @Body() dto: CreateCustomerDto) {
    const userId = await this.ensureRole(req, this.customerActionRoles);
    const user = await this.customersService.upsertUserProfile(
      userId,
      {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneNumber: dto.phoneNumber,
        profileImage: dto.profileImage,
        latitude: dto.latitude,
        longitude: dto.longitude,
        address: dto.address,
      },
    );
    return user;
  }

  @UseGuards(AccessTokenGuard)
  @Get('me')
  async getMyProfile(@Request() req) {
    const userId = await this.ensureRole(req, this.allSignedInRoles);
    const user = await this.customersService.findUserById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @UseGuards(AccessTokenGuard)
  @Put('update')
  async updateProfile(@Request() req, @Body() dto: CreateCustomerDto) {
    const userId = await this.ensureRole(req, this.customerActionRoles);
    return this.customersService.upsertUserProfile(userId, dto);
  }

  @UseGuards(AccessTokenGuard)
  @Post('addresses')
  async addSavedAddress(
    @Request() req,
    @Body()
    body: {
      label: string;
      address: string;
      latitude: number;
      longitude: number;
      isDefault?: boolean;
      contactPhone?: string;
      pickupType?: 'now' | 'schedule';
      pickupAt?: string | null;
    },
  ) {
    const userId = await this.ensureRole(req, this.customerActionRoles);
    return this.customersService.addUserSavedAddress(
      userId,
      body.label,
      body.address,
      body.latitude,
      body.longitude,
      body.isDefault,
      body.contactPhone,
      body.pickupType,
      body.pickupAt,
    );
  }

  @UseGuards(AccessTokenGuard)
  @Put('addresses/:addressId')
  async updateSavedAddress(
    @Request() req,
    @Param('addressId') addressId: string,
    @Body()
    body: {
      label?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      isDefault?: boolean;
    },
  ) {
    const userId = await this.ensureRole(req, this.customerActionRoles);
    return this.customersService.updateUserSavedAddress(
      userId,
      addressId,
      body,
    );
  }

  @UseGuards(AccessTokenGuard)
  @Delete('addresses/:addressId')
  async deleteSavedAddress(
    @Request() req,
    @Param('addressId') addressId: string,
  ) {
    const userId = await this.ensureRole(req, this.customerActionRoles);
    return this.customersService.deleteUserSavedAddress(
      userId,
      addressId,
    );
  }

  @UseGuards(AccessTokenGuard)
  @Post('orders')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async createOrder(
    @Request() req,
    @Body() body: CreateOrderDto,
    @UploadedFiles() files: Array<{ buffer: Buffer; mimetype: string }>,
  ) {
    const userId = await this.ensureRole(req, this.customerActionRoles);
    const uploaded = await this.uploadOrderImages(files);
    const normalized = this.normalizeOrderPayload(body, uploaded);
    return this.customersService.createOrder(userId, normalized);
  }

  @UseGuards(AccessTokenGuard)
  @Get('orders')
  async getMyOrders(@Request() req) {
    const userId = await this.ensureRole(req, this.customerActionRoles);
    return this.customersService.getCustomerOrders(userId);
  }

  @UseGuards(AccessTokenGuard)
  @Put('orders/:orderId')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async updateOrder(
    @Param('orderId') orderId: string,
    @Request() req,
    @Body() dto: UpdateOrderDto,
    @UploadedFiles() files: Array<{ buffer: Buffer; mimetype: string }>,
  ) {
    const userId = await this.ensureRole(req, this.customerActionRoles);
    const order = await this.customersService.findOrderById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId.toString() !== userId)
      throw new ForbiddenException('Not your order');
    if (order.status !== 'pending')
      throw new ForbiddenException('Only pending orders can be edited');
    const uploaded = await this.uploadOrderImages(files);
    const normalized = this.normalizeOrderPayload(dto, uploaded);
    return this.customersService.updateOrder(orderId, normalized);
  }

  @UseGuards(AccessTokenGuard)
  @Delete('orders/:orderId')
  async deleteOrder(@Param('orderId') orderId: string, @Request() req) {
    const userId = await this.ensureRole(req, this.customerActionRoles);
    const order = await this.customersService.findOrderById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId.toString() !== userId)
      throw new ForbiddenException('Not your order');
    if (order.status !== 'pending')
      throw new ForbiddenException('Only pending orders can be deleted');
    return this.customersService.deleteOrder(orderId);
  }

  @UseGuards(AccessTokenGuard)
  @Put('orders/:orderId/status')
  async updateOrderStatus(
    @Request() req,
    @Param('orderId') orderId: string,
    @Body() body: { status: string },
  ) {
    await this.ensureRole(req, this.customerActionRoles);
    return this.customersService.updateOrderStatus(orderId, body.status);
  }

  @UseGuards(AccessTokenGuard)
  @Post('reviews')
  async createReview(@Request() req, @Body() dto: CreateReviewDto) {
    const userId = await this.ensureRole(req, this.customerActionRoles);
    const customer = await this.customersService.findCustomerByUserId(
      userId,
    );
    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }
    return this.customersService.createReview(customer._id.toString(), dto);
  }

  @UseGuards(AccessTokenGuard)
  @Get('saved-addresses')
  async getSavedAddresses(@Request() req) {
    const userId = await this.ensureRole(req, this.customerActionRoles);
    const user = await this.customersService.findUserById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user.savedAddresses || [];
  }

  @UseGuards(AccessTokenGuard)
  @Get('reviews')
  async getMyReviews(@Request() req) {
    const userId = await this.ensureRole(req, this.customerActionRoles);
    const customer = await this.customersService.findCustomerByUserId(
      userId,
    );
    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }
    return this.customersService.getCustomerReviews(customer._id.toString());
  }

  @Get('nearby')
  async getNearbyCustomers(
    @Body() body: { latitude: number; longitude: number; maxDistance?: number },
  ) {
    return this.customersService.findNearbyCustomers(
      body.longitude,
      body.latitude,
      body.maxDistance,
    );
  }

  // ===== Wallet & Payment =====

  @UseGuards(AccessTokenGuard)
  @Get('wallet')
  async getWallet(@Request() req) {
    const userId = await this.ensureRole(req, this.customerActionRoles);
    return this.customersService.getWalletInfo(userId);
  }

  @UseGuards(AccessTokenGuard)
  @Post('wallet/topup')
  async topUpWallet(@Request() req, @Body() body: { amount: number }) {
    const userId = await this.ensureRole(req, this.customerActionRoles);
    return this.customersService.topUpWallet(userId, body.amount);
  }

  @UseGuards(AccessTokenGuard)
  @Post('wallet/pay')
  async payWithWallet(
    @Request() req,
    @Body() body: { orderId: string; couponCode?: string },
  ) {
    const userId = await this.ensureRole(req, this.customerActionRoles);
    return this.customersService.payWithWallet(userId, body.orderId, body.couponCode);
  }

  @UseGuards(AccessTokenGuard)
  @Post('wallet/redeem-coupon')
  async redeemCoupon(
    @Request() req,
    @Body() body: { code: string },
  ) {
    const userId = await this.ensureRole(req, this.customerActionRoles);
    return this.customersService.redeemCoupon(userId, body.code);
  }
}
