import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ClassSerializerInterceptor,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserByAdminDto } from './dto/create-user-admin.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../shared/security/jwt-auth.guard';
import { RolesGuard } from '../shared/security/roles.guard';
import { Roles } from '../shared/security/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  create(@Body() createUserDto: CreateUserByAdminDto) {
    return this.userService.create(createUserDto as any);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  findAll() {
    return this.userService.findAll();
  }

  @Get(':trackingId')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('trackingId') trackingId: string) {
    return this.userService.findOne(trackingId);
  }

  @Patch(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS)
  update(
    @Param('trackingId') trackingId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(trackingId, updateUserDto);
  }

  @Delete(':trackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS)
  remove(@Param('trackingId') trackingId: string) {
    return this.userService.remove(trackingId);
  }
}

export default UserController;
