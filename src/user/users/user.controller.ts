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
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserByAdminDto } from './dto/requests/create-user-admin.dto';
import { UpdateUserDto } from './dto/requests/update-user.dto';
import { JwtAuthGuard } from '../../shared/security/jwt-auth.guard';
import { RolesGuard } from '../../shared/security/roles.guard';
import { Roles } from '../../shared/security/roles.decorator';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';

@ApiTags('Users')
@ApiBearerAuth()
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
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.userService.findAll(pageOptionsDto);
  }

  @Get('collector/:collectorTrackingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS, Role.ADMIN_COLLECTEUR)
  findAllByCollector(
    @Param('collectorTrackingId') collectorTrackingId: string,
    @Query() pageOptionsDto: PageOptionsDto,
  ) {
    return this.userService.findAllByCollector(collectorTrackingId, pageOptionsDto);
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
