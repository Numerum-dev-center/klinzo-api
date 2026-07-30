import { Controller, Post, Body, UseGuards, Get, HttpCode, HttpStatus, ClassSerializerInterceptor, UseInterceptors } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/users/dto/requests/create-user.dto';
import { LoginDto } from './dto/requests/login.dto';
import { RefreshTokenDto } from './dto/requests/refresh-token.dto';
import { JwtAuthGuard } from '../shared/security/jwt-auth.guard';
import { CurrentUser } from '../shared/security/current-user.decorator';
import { UserService } from '../user/users/user.service';

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService
  ) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: any) {
    await this.authService.logout(user.trackingId);
    return { message: 'Déconnexion réussie' };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return this.userService.findOne(user.trackingId);
  }
}
