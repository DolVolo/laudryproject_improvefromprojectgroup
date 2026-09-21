import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { [k: string]: jest.Mock };

  beforeEach(async () => {
    usersService = {
      findByEmailWithAuthSecrets: jest.fn(),
      enforceBanStateForSignIn: jest.fn(),
      setRefreshTokenHash: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-secret') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects sign-in for an email that does not exist', async () => {
    usersService.findByEmailWithAuthSecrets.mockResolvedValue(null);

    await expect(
      service.signIn({ email: 'nobody@example.com', password: 'x' } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('normalises the email before looking the user up', async () => {
    usersService.findByEmailWithAuthSecrets.mockResolvedValue(null);

    await expect(
      service.signIn({ email: '  User@Example.COM ', password: 'x' } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(usersService.findByEmailWithAuthSecrets).toHaveBeenCalledWith(
      'user@example.com',
    );
  });
});
