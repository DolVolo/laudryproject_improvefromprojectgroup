import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../admin/schemas/user.schema';

export type CustomerDocument = HydratedDocument<Customer>;

@Schema({ timestamps: true })
export class Customer {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: User;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  phoneNumber: string;

  @Prop({ type: String, default: null })
  profileImage: string | null;

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: [100.5018, 13.7563],
    },
  })
  location: {
    type: 'Point';
    coordinates: number[];
  };

  @Prop({ type: String, default: null })
  address: string | null;

  @Prop({
    type: [
      {
        label: String,
        address: String,
        coordinates: [Number],
        isDefault: Boolean,
      },
    ],
    default: [],
  })
  savedAddresses: Array<{
    label: string;
    address: string;
    coordinates: number[];
    isDefault: boolean;
  }>;

  @Prop({ type: Number, min: 0, max: 5, default: 0 })
  averageRating: number;

  @Prop({ type: Number, default: 0 })
  totalReviews: number;

  @Prop({
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  })
  status: 'active' | 'inactive' | 'suspended';

  @Prop({ type: Boolean, default: false })
  isEmailVerified: boolean;

  @Prop({ type: Boolean, default: false })
  isPhoneVerified: boolean;

  // ===== Wallet & Loyalty =====

  @Prop({ type: Number, default: 0, min: 0 })
  walletBalance: number;

  @Prop({ type: Number, default: 0, min: 0 })
  loyaltyPoints: number;

  @Prop({
    type: [
      {
        code: String,
        description: String,
        discountType: { type: String, enum: ['fixed', 'percent'], default: 'fixed' },
        discountValue: { type: Number, default: 0 },
        minOrderPrice: { type: Number, default: 0 },
        usedAt: { type: Date, default: null },
        expiresAt: { type: Date, default: null },
      },
    ],
    default: [],
  })
  coupons: Array<{
    code: string;
    description: string;
    discountType: 'fixed' | 'percent';
    discountValue: number;
    minOrderPrice: number;
    usedAt: Date | null;
    expiresAt: Date | null;
  }>;

  @Prop({
    type: [
      {
        type: { type: String, enum: ['topup', 'payment', 'refund', 'points_earned', 'points_redeemed'] },
        amount: Number,
        pointsChange: { type: Number, default: 0 },
        description: String,
        orderId: { type: String, default: null },
        createdAt: { type: Date, default: () => new Date() },
      },
    ],
    default: [],
  })
  walletTransactions: Array<{
    type: 'topup' | 'payment' | 'refund' | 'points_earned' | 'points_redeemed';
    amount: number;
    pointsChange: number;
    description: string;
    orderId: string | null;
    createdAt: Date;
  }>;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

CustomerSchema.index({ location: '2dsphere' });
