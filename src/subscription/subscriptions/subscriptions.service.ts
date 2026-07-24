import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionRepository } from './subscriptions.repository';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { CreateSubscriptionDataDto } from './dto/create-subscription-data.dto';

@Injectable()
export class SubscriptionsService {

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly prisma: PrismaService,
  ){}



  async create(dto:CreateSubscriptionDto){

    const user = await this.prisma.user.findUnique({
      where:{
        trackingId: dto.userTrackingId,
      },
    });


    if(!user){
      throw new NotFoundException('User not found');
    }


    const offer = await this.prisma.offer.findUnique({
      where:{
        trackingId: dto.offerTrackingId,
      },
    });


    if(!offer){
      throw new NotFoundException('Offer not found');
    }


        const data: CreateSubscriptionDataDto = {
          ...dto,
          userId: user.id,
          offerId: offer.id,
        };

        return this.subscriptionRepository.create(data);
  }



    async findAll(page:number, limit:number){

    const result =
        await this.subscriptionRepository.findAll(
        page,
        limit,
        );


    return {
          data: result.data.map(subscription => this.toResponseDto(subscription),),
        
        meta:{
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(
            result.total / limit
        ),
        },
    };

    }



    async findOne(trackingId: string) {

    const subscription =
    await this.subscriptionRepository.findOne(trackingId);


    if(!subscription){
    throw new NotFoundException(
        'Subscription not found !!'
    );
    }
    
    return this.toResponseDto(subscription);    
  }



 async update(
    trackingId: string,
    dto: UpdateSubscriptionDto,
    ) {

    const subscription =
        await this.subscriptionRepository.findOne(trackingId);


    if (!subscription) {
        throw new NotFoundException(
        'Subscription not found',
        );
    }


    return this.subscriptionRepository.update(
        trackingId,
        dto,
    );
    }



    async remove(trackingId: string) {

  const subscription =
    await this.subscriptionRepository.findOne(trackingId);


  if (!subscription) {
    throw new NotFoundException(
      'Subscription not found',
    );
  }


  return this.subscriptionRepository.remove(
    trackingId,
    );
    }


    private toResponseDto(subscription: any): SubscriptionResponseDto {
  return {
    trackingId: subscription.trackingId,
    qrCodeId: subscription.qrCodeId,
    addressText: subscription.addressText,
    status: subscription.status,
    startDate: subscription.startDate,
    nextBillingDate: subscription.nextBillingDate,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,

    user: {
      trackingId: subscription.user.trackingId,
      firstName: subscription.user.firstName,
      lastName: subscription.user.lastName,
      email: subscription.user.email,
    },

    offer: {
      trackingId: subscription.offer.trackingId,
      name: subscription.offer.name,
      price: subscription.offer.price,
      frequency: subscription.offer.frequency,
    },
  };
}
}