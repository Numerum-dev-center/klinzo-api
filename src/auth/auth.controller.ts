import { Controller, Post, Body, UseGuards, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../shared/security/jwt-auth.guard';
import { JwtRefreshGuard } from '../shared/security/jwt-refresh.guard';
import { CurrentUser } from '../shared/security/current-user.decorator';
import { UserService } from '../user/user.service';

@Controller('auth')
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

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@CurrentUser() user: any) {
    return this.authService.refreshTokens(user.trackingId, user.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return this.userService.findOne(user.trackingId);
  }
}
