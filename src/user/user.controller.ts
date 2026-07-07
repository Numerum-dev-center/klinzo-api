import { Controller, Get, Post, Body, Patch, Param, Delete, ClassSerializerInterceptor, UseInterceptors } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('user')
@UseInterceptors(ClassSerializerInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':trackingId')
  findOne(@Param('trackingId') trackingId: string) {
    return this.userService.findOne(trackingId);
  }

  @Patch(':trackingId')
  update(@Param('trackingId') trackingId: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(trackingId, updateUserDto);
  }

  @Delete(':trackingId')
  remove(@Param('trackingId') trackingId: string) {
    return this.userService.remove(trackingId);
  }
}
