import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../shared/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });

    return new UserEntity(user as any);
  }

  async findAll(): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany();
    return users.map((user) => new UserEntity(user as any));
  }

  async findOne(trackingId: string): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({
      where: { trackingId },
    });

    if (!user) {
      throw new NotFoundException(`User with trackingId ${trackingId} not found`);
    }

    return new UserEntity(user as any);
  }

  async update(trackingId: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    await this.findOne(trackingId); // Ensure user exists

    let hashedPassword: string | undefined;
    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(updateUserDto.password, salt);
    }

    const updateData = { ...updateUserDto };
    if (hashedPassword) {
      updateData.password = hashedPassword;
    }

    const updatedUser = await this.prisma.user.update({
      where: { trackingId },
      data: updateData,
    });

    return new UserEntity(updatedUser as any);
  }

  async remove(trackingId: string): Promise<void> {
    await this.findOne(trackingId); // Ensure user exists

    await this.prisma.user.delete({
      where: { trackingId },
    });
  }

  // --- Méthodes internes pour l'Auth ---

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByTrackingIdForAuth(trackingId: string) {
    return this.prisma.user.findUnique({
      where: { trackingId },
    });
  }

  async updateRefreshToken(trackingId: string, refreshToken: string): Promise<void> {
    const salt = await bcrypt.genSalt(10);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, salt);
    await this.prisma.user.update({
      where: { trackingId },
      data: { hashedRefreshToken },
    });
  }

  async removeRefreshToken(trackingId: string): Promise<void> {
    await this.prisma.user.update({
      where: { trackingId },
      data: { hashedRefreshToken: null },
    });
  }
}
