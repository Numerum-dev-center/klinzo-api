import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionRepository } from './subscriptions.repository';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { CreateSubscriptionDataDto } from './dto/create-subscription-data.dto';
import { SubscriptionEntity } from './entities/subscription.entity';
import { PageOptionsDto } from '../../shared/pagination/dto/page-options.dto';
import { PageMetaDto } from '../../shared/pagination/dto/page-meta.dto';
import { PageDto } from '../../shared/pagination/dto/page.dto';

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
          startDate: new Date(dto.startDate),
          nextBillingDate: new Date(dto.nextBillingDate),
          userId: user.id,
          offerId: offer.id,
        };

        return this.subscriptionRepository.create(data);
  }



  async findAll(pageOptionsDto: PageOptionsDto): Promise<PageDto<SubscriptionEntity>> {
    const result = await this.subscriptionRepository.findAll(pageOptionsDto);
    const itemCount = result.total;
    const pageMetaDto = new PageMetaDto({
      pageOptionsDto,
      itemCount,
    });

    return new PageDto(
      result.data.map((subscription) => this.toResponseDto(subscription)),
      pageMetaDto,
    );
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


  private toResponseDto(subscription: any): SubscriptionEntity {
    return new SubscriptionEntity({
      id: subscription.id,
      trackingId: subscription.trackingId,
      qrCodeId: subscription.qrCodeId,
      addressText: subscription.addressText,
      status: subscription.status,
      startDate: subscription.startDate,
      nextBillingDate: subscription.nextBillingDate,
      userId: subscription.userId,
      offerId: subscription.offerId,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    });
  }
}