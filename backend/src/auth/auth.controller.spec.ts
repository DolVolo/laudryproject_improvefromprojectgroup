import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Pick<AuthService, 'signIn' | 'signUp'>>;

  beforeEach(async () => {
    authService = {
      signIn: jest.fn(),
      signUp: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes sign-in credentials through to AuthService', async () => {
    const tokens = { accessToken: 'access', refreshToken: 'refresh' };
    authService.signIn.mockResolvedValue(tokens as never);

    const dto = { email: 'customer@example.com', password: 'secret123' };
    await expect(controller.signin(dto as never)).resolves.toEqual(tokens);
    expect(authService.signIn).toHaveBeenCalledWith(dto);
  });

  it('surfaces the error when sign-in fails', async () => {
    authService.signIn.mockRejectedValue(new Error('invalid credentials'));

    await expect(
      controller.signin({ email: 'a@b.com', password: 'wrong' } as never),
    ).rejects.toThrow('invalid credentials');
  });
});
